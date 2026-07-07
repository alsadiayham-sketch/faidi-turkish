var FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27400%27%3E%3Crect width=%27400%27 height=%27400%27 fill=%27%230a0a0a%27/%3E%3Ctext x=%27200%27 y=%27205%27 font-family=%27Georgia,serif%27 font-size=%2732%27 letter-spacing=%272%27 fill=%27%23ff2eb0%27 text-anchor=%27middle%27%3EFaidi Turkish%3C/text%3E%3C/svg%3E";

var products = [];
var discounts = [];
var siteSettings = normalizeSettings(DEFAULT_SITE_SETTINGS);
var currentFilter = 'all';
var cart = normalizeCartItems(JSON.parse(localStorage.getItem('faidi_cart') || '[]'), normalizeProducts(DEFAULT_PRODUCTS));
var deliveryMethod = localStorage.getItem('faidi_delivery_method') || 'delivery';
var currentPDPProduct = null;
var currentPDPSizeIdx = 0;
var pdpQty = 1;
var usedFallbackData = false;
var unsubscribers = [];
var storeLoadState = {
    products: false,
    discounts: false,
    settings: false
};

document.addEventListener('DOMContentLoaded', function () {
    saveCart();
    renderBrands();
    setupSearch('navSearchInput', 'navSearchDropdown');
    setupSearch('productsSearchInput', 'productsSearchDropdown');
initializeOrderTracking();
    updateCartBadge();
    updateCheckoutLink(cart.length ? updateCartTotal() : 0);
    setDeliveryMethod(deliveryMethod);
    initCardTilt();
    initBackground();
    initHeroVideo();
    initScrollReveal();
    setLoadingState(true);
    subscribeToStoreData();
    // Fallback if Firestore takes too long
    setTimeout(function () {
        if (!storeLoadState.products || !storeLoadState.discounts || !storeLoadState.settings) {
            // Only apply fallback if we truly have no data yet
            if (products.length === 0) {
                applyFallbackStoreData('');
            } else {
                // Products loaded but discounts/settings didn't - force render anyway
                storeLoadState.products = true;
                storeLoadState.discounts = true;
                storeLoadState.settings = true;
                setLoadingState(false);
                renderStorefront();
            }
        }
    }, 10000);
});

function setLoadingState(isLoading) {
    var loading = document.getElementById('storeLoading');
    var grid = document.getElementById('productsGrid');
    if (loading) loading.style.display = isLoading ? 'flex' : 'none';
    if (grid) grid.classList.toggle('is-loading', !!isLoading);
}

function setStoreMessage(message, type) {
    var notice = document.getElementById('storeNotice');
    if (!notice) return;
    if (!message) {
        notice.style.display = 'none';
        notice.textContent = '';
        notice.className = 'store-notice';
        return;
    }
    notice.textContent = message;
    notice.className = 'store-notice ' + (type || 'info');
    notice.style.display = 'block';
}

function markStoreLoaded(key) {
    storeLoadState[key] = true;
    if (storeLoadState.products && storeLoadState.discounts && storeLoadState.settings) {
        setLoadingState(false);
        renderStorefront();
    }
}

function subscribeToStoreData() {
    if (!window.db) {
        applyFallbackStoreData('تعذر الاتصال بفايربيس، تم عرض البيانات الاحتياطية.');
        return;
    }

    unsubscribers.forEach(function (unsubscribe) {
        if (typeof unsubscribe === 'function') unsubscribe();
    });
    unsubscribers = [];

    // Load first 6 products fast, then load the rest
    db.collection('products').orderBy('id').limit(6).get().then(function (snapshot) {
        if (!snapshot.empty) {
            products = snapshot.docs.map(function (docSnap) {
                var d = docSnap.data(); d.id = docSnap.id; return normalizeProduct(d);
            });
            syncCartWithProducts();
            markStoreLoaded('products');
        }
    }).catch(function () {
        // Initial fetch failed, rely on onSnapshot below
    });

    // Subscribe to all products for real-time updates (always runs)
    unsubscribers.push(db.collection('products').onSnapshot(function (fullSnapshot) {
        products = fullSnapshot.docs.map(function (docSnap) {
            var d = docSnap.data(); d.id = docSnap.id; return normalizeProduct(d);
        }).sort(function (a, b) { return a.id - b.id; });
        syncCartWithProducts();
        markStoreLoaded('products');
    }, function () {
        if (!storeLoadState.products) applyFallbackStoreData('تعذر تحميل المنتجات من فايرستور، تم استخدام البيانات الاحتياطية.');
        else setStoreMessage('تعذر تحديث المنتجات حالياً.', 'error');
    }));

    unsubscribers.push(db.collection('discounts').onSnapshot(function (snapshot) {
        discounts = snapshot.docs.map(function (docSnap) {
            return normalizeDiscount(docSnap.data());
        });
        markStoreLoaded('discounts');
    }, function () {
        discounts = normalizeDiscounts(DEFAULT_DISCOUNTS);
        markStoreLoaded('discounts');
        setStoreMessage('تعذر تحميل الخصومات الحالية.', 'warning');
    }));

    unsubscribers.push(db.collection('settings').doc('config').onSnapshot(function (docSnap) {
        siteSettings = normalizeSettings(docSnap.exists ? docSnap.data() : DEFAULT_SITE_SETTINGS);
        markStoreLoaded('settings');
    }, function () {
        siteSettings = normalizeSettings(DEFAULT_SITE_SETTINGS);
        markStoreLoaded('settings');
        setStoreMessage('تعذر تحميل إعدادات المتجر الحالية.', 'warning');
    }));

    // Hero Display slider
    unsubscribers.push(db.collection('heroDisplay').orderBy('order', 'asc').onSnapshot(function (snapshot) {
        var slides = snapshot.docs.map(function(doc) { return doc.data(); });
        // The intro video is the hero. Only admin-configured VIDEO slides may replace it;
        // stale image-only slides are ignored so the hero never reverts to an old still.
        var videoSlides = slides.filter(function (s) { return s && s.type === 'video' && s.url; });
        if (videoSlides.length) renderHeroSlider(videoSlides);
        // else: keep the rich static video hero (logo + subtitle + tagline) as-is.
    }, function() { /* keep static fallback */ }));
}

function applyFallbackStoreData(message) {
    usedFallbackData = true;
    products = normalizeProducts(DEFAULT_PRODUCTS);
    discounts = normalizeDiscounts(DEFAULT_DISCOUNTS);
    siteSettings = normalizeSettings(DEFAULT_SITE_SETTINGS);
    storeLoadState.products = true;
    storeLoadState.discounts = true;
    storeLoadState.settings = true;
    syncCartWithProducts();
    setStoreMessage(message, 'warning');
    setLoadingState(false);
    renderStorefront();
}

function syncCartWithProducts() {
    cart = normalizeCartItems(cart, products);
    saveCart();
}

function renderStorefront() {
    applySettings();
    renderFilters();
    checkDiscountBanner();
    updateCartBadge();
    renderProducts(getFilteredProducts(currentFilter));
    updateCheckoutLink(updateCartTotal());
    if (!usedFallbackData) setStoreMessage('', 'info');
}

function applySettings() {
    var heroSub = document.getElementById('heroSubtitle');
    if (heroSub) heroSub.textContent = siteSettings.heroSubtitle;

    var aboutText = document.getElementById('aboutText');
    if (aboutText) aboutText.innerHTML = siteSettings.aboutText.replace(/\n/g, '<br>');

    var whatsappLink = document.getElementById('whatsappLink');
    if (whatsappLink) whatsappLink.href = buildWhatsAppUrl(siteSettings.whatsappNumber);

    var instagramLink = document.getElementById('instagramLink');
    if (instagramLink) instagramLink.href = siteSettings.instagramLink;

    var tiktokLink = document.getElementById('tiktokLink');
    if (tiktokLink) {
        if (siteSettings.tiktokLink) {
            tiktokLink.href = siteSettings.tiktokLink;
            tiktokLink.style.display = 'flex';
        } else {
            tiktokLink.style.display = 'none';
        }
    }
}

function checkDiscountBanner() {
    var banner = document.getElementById('discountBanner');
    var textNode = document.getElementById('bannerText');
    if (!banner || !textNode) return;

    var now = new Date().toISOString().slice(0, 10);
    var activeDiscounts = discounts.filter(function (discount) {
        if (!discount.description) return false;
        if (discount.expiresAt && discount.expiresAt < now) return false;
        return true;
    });

    if (activeDiscounts.length) {
        document.body.classList.add('has-banner');
        banner.style.display = 'block';
        var text = activeDiscounts.map(function (discount) {
            return discount.description;
        }).join('     |     ');
        textNode.textContent = text + '     |     ' + text;
    } else {
        document.body.classList.remove('has-banner');
        banner.style.display = 'none';
        textNode.textContent = '';
    }
}

function getFilteredProducts(filter) {
    if (filter === 'bestseller' || filter === 'special' || filter === 'soldout') {
        return products.filter(function (product) {
            return product.status === filter;
        });
    }

    if (filter !== 'all') {
        return products.filter(function (product) {
            return product.category === filter || product.brand === filter;
        });
    }

    return products.slice();
}

function getPriceHTML(pricing) {
    return (pricing.hasDiscount ? '<span class="original-price">' + formatCurrency(pricing.original) + '</span>' : '') + '<span>' + formatCurrency(pricing.final) + '</span>';
}

function renderProducts(productsToShow) {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!productsToShow.length) {
        grid.innerHTML = '<div class="empty-products">لا توجد منتجات متاحة حالياً.</div>';
        return;
    }

    productsToShow.forEach(function (product) {
        var soldOut = isProductSoldOut(product);
        var defaultIdx = getFirstAvailableSizeIdx(product);
        var sizeData = getSizeData(product, defaultIdx);
        var pricing = getFinalPrice(product, defaultIdx, discounts);
        var statusBadge = getStatusBadge(soldOut ? 'soldout' : product.status);
        var discountBadge = pricing.hasDiscount ? '<span class="discount-badge">-' + pricing.discountPercent + '%</span>' : '';
        var soldOutClass = soldOut ? 'sold-out' : '';
        var sizeSelector = product.sizes.length > 1
            ? '<div class="card-size-selector"><label for="sizeSelect-' + product.id + '">الحجم:</label><select id="sizeSelect-' + product.id + '" class="size-select" onclick="event.stopPropagation()" onchange="updateProductSize(\'' + product.id + '\', this.value)">' + product.sizes.map(function (size, idx) {
                var avail = isSizeAvailable(product, idx);
                return '<option value="' + idx + '"' + (idx === defaultIdx ? ' selected' : '') + (avail ? '' : ' disabled') + '>' + getSizeLabel(size) + (avail ? '' : ' (نفذ)') + '</option>';
            }).join('') + '</select></div>'
            : '<div class="card-size-single"><span>الحجم:</span><strong>' + getSizeLabel(sizeData) + '</strong></div>';

        var posterSrc = product.image || product.poster;

        var card = document.createElement('div');
        card.className = 'product-card ' + soldOutClass;
        card.dataset.productId = String(product.id);
        card.innerHTML = [
            discountBadge,
            statusBadge,
            '<div class="product-image" onclick="openPDP(\'' + product.id + '\')" style="cursor:pointer;">',
            '<img class="product-media" src="' + posterSrc + '" alt="' + product.name + '" loading="lazy" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">',
            '</div>',
            '<div class="product-info" onclick="openPDP(\'' + product.id + '\')" style="cursor:pointer;">',
            '<span class="product-brand">' + product.brand + '</span>',
            '<h3>' + product.name + '</h3>',
            '<div class="product-meta"><span>' + product.category + '</span><span class="product-size" id="productSize-' + product.id + '">' + getSizeLabel(sizeData) + '</span></div>',
            '<div class="product-price" id="productPrice-' + product.id + '">' + getPriceHTML(pricing) + '</div>',
            '</div>',
            '<div class="product-card-controls">' + sizeSelector + '</div>',
            '<div class="product-card-actions">',
            '<div class="qty-selector qty-sm" id="qty-' + product.id + '"><button onclick="event.stopPropagation(); changeCardQty(\'' + product.id + '\', -1)">−</button><span id="cardQty-' + product.id + '">1</span><button onclick="event.stopPropagation(); changeCardQty(\'' + product.id + '\', 1)">+</button></div>',
            '<button class="btn-add-cart" onclick="addToCart(event, \'' + product.id + '\')" ' + (soldOut ? 'disabled' : '') + '>' + (soldOut ? 'نفذت الكمية' : 'أضيفي') + '</button>',
            '</div>'
        ].join('');
        grid.appendChild(card);
    });

    observeProductMedia();
}

// Only animate GIFs for cards currently visible; posters stay for the rest (fixes stutter, scales to hundreds).
var _mediaObserver = null;
function observeProductMedia() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (!_mediaObserver) {
        _mediaObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var img = entry.target;
                var gif = img.getAttribute('data-gif');
                var poster = img.getAttribute('data-poster');
                if (!gif) return;
                if (entry.isIntersecting) {
                    if (img.src !== gif) img.src = gif;
                } else if (poster && img.src !== poster) {
                    img.src = poster;
                }
            });
        }, { rootMargin: '200px 0px', threshold: 0.01 });
    }
    document.querySelectorAll('.product-media[data-gif]').forEach(function (img) {
        _mediaObserver.observe(img);
    });
}

function updateProductSize(productId, sizeIdx) {
    var product = products.find(function (entry) { return entry.id === productId; });
    if (!product) return;
    var sizeData = getSizeData(product, sizeIdx);
    var pricing = getFinalPrice(product, sizeIdx, discounts);
    var sizeEl = document.getElementById('productSize-' + productId);
    var priceEl = document.getElementById('productPrice-' + productId);
    if (sizeEl) sizeEl.textContent = getSizeLabel(sizeData);
    if (priceEl) priceEl.innerHTML = getPriceHTML(pricing);
    var qtyEl = document.getElementById('cardQty-' + productId);
    if (qtyEl) qtyEl.textContent = '1';
}

function getStatusBadge(status) {
    switch (status) {
        case 'bestseller': return '<span class="status-badge bestseller">الأكثر مبيعاً</span>';
        case 'special': return '<span class="status-badge special">مميز</span>';
        case 'soldout': return '<span class="status-badge soldout">نفذت الكمية</span>';
        default: return '';
    }
}

function filterProducts(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function (button) {
        button.classList.remove('active');
    });
    var activeBtn = document.querySelector('[data-filter="' + filter + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    renderProducts(getFilteredProducts(filter));
}

function toggleFilters() {
    var panel = document.getElementById('filterPanel');
    var btn = document.querySelector('.filter-toggle-btn');
    if (!panel || !btn) return;
    var isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? 'فلتر ▲' : 'فلتر ▼';
}

function createFilterButton(value) {
    var button = document.createElement('button');
    button.className = 'filter-btn';
    button.dataset.filter = value;
    button.textContent = value;
    button.addEventListener('click', function () {
        filterProducts(value);
    });
    return button;
}

function renderFilters() {
    var categories = Array.from(new Set(products.map(function (product) { return product.category; })));
    var brands = Array.from(new Set(products.map(function (product) { return product.brand; })));
    var catContainer = document.getElementById('categoryFilters');
    var brandContainer = document.getElementById('brandFilters');
    if (!catContainer || !brandContainer) return;
    catContainer.innerHTML = '';
    brandContainer.innerHTML = '';
    categories.forEach(function (category) { catContainer.appendChild(createFilterButton(category)); });
    brands.forEach(function (brand) { brandContainer.appendChild(createFilterButton(brand)); });
}

function renderBrands() {
    var grid = document.getElementById('brandsGrid');
    if (!grid) return;
    grid.innerHTML = BRANDS_DATA.map(function (brand) {
        var safe = String(brand.name).replace(/'/g, "\\'");
        return '<figure class="cat-tile" onclick="shopCategory(\'' + safe + '\')">' +
            '<img src="' + brand.logo + '" alt="' + brand.name + '" loading="lazy" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">' +
            '<figcaption>' + brand.name + '</figcaption></figure>';
    }).join('');
}

function shopCategory(name) {
    var products = document.getElementById('products');
    if (products) products.scrollIntoView({ behavior: 'smooth' });
    var input = document.getElementById('productsSearchInput');
    if (input) {
        input.value = name;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }
}

function setupSearch(inputId, dropdownId) {
    var input = document.getElementById(inputId);
    var dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    input.addEventListener('input', function () {
        var query = this.value.trim();
        if (query.length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        var results = products.filter(function (product) {
            return product.name.indexOf(query) >= 0 || product.category.indexOf(query) >= 0 || product.brand.toLowerCase().indexOf(query.toLowerCase()) >= 0;
        }).slice(0, 8);

        if (!results.length) {
            dropdown.innerHTML = '<div class="search-item"><div class="search-item-info"><h4>لا توجد نتائج</h4></div></div>';
        } else {
            dropdown.innerHTML = results.map(function (product) {
                var pricing = getFinalPrice(product, 0, discounts);
                return '<div class="search-item" onclick="scrollToProduct(\'' + product.id + '\')"><img src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'' + FALLBACK_IMAGE + '\'"><div class="search-item-info"><h4>' + product.name + '</h4><span>' + product.brand + ' • ' + product.category + ' • ' + getSizeLabel(getSizeData(product, 0)) + ' • ' + formatCurrency(pricing.final) + '</span></div></div>';
            }).join('');
        }
        dropdown.classList.add('active');
    });

    document.addEventListener('click', function (event) {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) dropdown.classList.remove('active');
    });
}

function scrollToProduct(productId) {
    filterProducts('all');
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.search-dropdown').forEach(function (dropdown) { dropdown.classList.remove('active'); });
    document.querySelectorAll('.nav-search input, .products-search input').forEach(function (input) { input.value = ''; });
    setTimeout(function () {
        var card = document.querySelector('.product-card[data-product-id="' + productId + '"]');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
        event.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

window.addEventListener('scroll', function () {
    var navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
    var bg = document.getElementById('bg3d');
    if (bg && !prefersReducedMotion()) {
        bg.style.transform = 'translate3d(0, ' + (window.scrollY * -0.08) + 'px, 0)';
    }
});


function createDefaultPackagingSet() {
    return {
        chocolateType: 'mixed',
        filling: 'plain',
        qty: 1
    };
}

function getPackagingTypeLabel(value) {
    switch (value) {
        case 'dark': return 'داكن';
        case 'milk': return 'حليب';
        case 'white': return 'أبيض';
        default: return 'مشكل';
    }
}

function getPackagingFillingLabel(value) {
    switch (value) {
        case 'plain': return 'سادا / بدون حشوة';
        case 'hazelnut': return 'بندق';
        case 'caramel': return 'كراميل';
        case 'pistachio': return 'فستق';
        case 'coconut': return 'جوز الهند';
        case 'strawberry': return 'فراولة';
        case 'orange': return 'برتقال';
        default: return 'سادا / بدون حشوة';
    }
}

function getWrapperColorLabel(value) {
    switch (value) {
        case 'gold': return 'ذهبي';
        case 'silver': return 'فضي';
        case 'red': return 'أحمر';
        case 'pink': return 'زهري';
        case 'purple': return 'بنفسجي';
        case 'black': return 'أسود';
        case 'white': return 'أبيض';
        case 'blue': return 'أزرق';
        default: return 'ذهبي';
    }
}

function buildPackagingOptions(options, selectedValue) {
    return options.map(function (option) {
        return '<option value="' + option.value + '"' + (selectedValue === option.value ? ' selected' : '') + '>' + option.label + '</option>';
    }).join('');
}

function renderPackagingSets() {
    var container = document.getElementById('packagingSetsContainer');
    if (!container) return;
    var typeOptions = [
        { value: 'dark', label: 'داكن' },
        { value: 'milk', label: 'حليب' },
        { value: 'white', label: 'أبيض' },
        { value: 'mixed', label: 'مشكل' }
    ];
    var fillingOptions = [
        { value: 'plain', label: 'سادا / بدون حشوة' },
        { value: 'hazelnut', label: 'بندق' },
        { value: 'caramel', label: 'كراميل' },
        { value: 'pistachio', label: 'فستق' },
        { value: 'coconut', label: 'جوز الهند' },
        { value: 'strawberry', label: 'فراولة' },
        { value: 'orange', label: 'برتقال' }
    ];
    container.innerHTML = packagingBuilderSets.map(function (setItem, index) {
        return '<div class="builder-set">'
            + '<div class="builder-set-head"><h5>تشكيلة ' + (index + 1) + '</h5>'
            + (packagingBuilderSets.length > 1 ? '<button type="button" class="builder-remove-set" onclick="removePackagingSet(' + index + ')">حذف</button>' : '')
            + '</div>'
            + '<div class="builder-set-grid">'
            + '<div class="builder-field"><label>نوع الشوكولاتة</label><select onchange="updatePackagingSetField(' + index + ', \'chocolateType\', this.value)">' + buildPackagingOptions(typeOptions, setItem.chocolateType) + '</select></div>'
            + '<div class="builder-field"><label>الحشوة</label><select onchange="updatePackagingSetField(' + index + ', \'filling\', this.value)">' + buildPackagingOptions(fillingOptions, setItem.filling) + '</select></div>'
            + '<div class="builder-field"><label>الكمية</label><input type="number" min="1" value="' + (parseInt(setItem.qty, 10) || 1) + '" onchange="updatePackagingSetField(' + index + ', \'qty\', this.value)"></div>'
            + '</div></div>';
    }).join('');
}

function updatePackagingSetField(index, field, value) {
    if (!packagingBuilderSets[index]) return;
    if (field === 'qty') packagingBuilderSets[index][field] = Math.max(1, parseInt(value, 10) || 1);
    else packagingBuilderSets[index][field] = value;
}

function addPackagingSet(prefill) {
    packagingBuilderSets.push(normalizeCustomPackageSet(prefill || createDefaultPackagingSet()));
    renderPackagingSets();
}

function removePackagingSet(index) {
    if (packagingBuilderSets.length <= 1) packagingBuilderSets = [createDefaultPackagingSet()];
    else packagingBuilderSets.splice(index, 1);
    renderPackagingSets();
}

function togglePackagingDeliveryFields() {
    var selected = document.querySelector('input[name="packageDelivery"]:checked');
    var locationField = document.getElementById('packageLocationField');
    if (locationField) locationField.style.display = selected && selected.value === 'delivery' ? 'flex' : 'none';
}

function resetPackagingBuilderForm() {
    editingCustomPackageId = '';
    packagingBuilderSets = [createDefaultPackagingSet()];
    var title = document.getElementById('packagingBuilderTitle');
    var submit = document.getElementById('packagingBuilderSubmit');
    if (title) title.textContent = 'صممي علبتك المخصصة';
    if (submit) submit.textContent = 'أضيفي إلى السلة';
    if (document.getElementById('packageWrapperColor')) document.getElementById('packageWrapperColor').value = 'gold';
    if (document.getElementById('packageNotes')) document.getElementById('packageNotes').value = '';
    if (document.getElementById('packageCustomerName')) document.getElementById('packageCustomerName').value = '';
    if (document.getElementById('packageCustomerPhone')) document.getElementById('packageCustomerPhone').value = '';
    if (document.getElementById('packageCustomerLocation')) document.getElementById('packageCustomerLocation').value = '';
    document.querySelectorAll('input[name="packageDelivery"]').forEach(function (input) {
        input.checked = input.value === 'delivery';
    });
    renderPackagingSets();
    togglePackagingDeliveryFields();
}

function populatePackagingBuilder(item) {
    var normalized = normalizeCustomPackageItem(item);
    editingCustomPackageId = normalized.id;
    packagingBuilderSets = normalized.sets.map(function (setItem) { return normalizeCustomPackageSet(setItem); });
    if (document.getElementById('packagingBuilderTitle')) document.getElementById('packagingBuilderTitle').textContent = 'تعديل العلبة المخصصة';
    if (document.getElementById('packagingBuilderSubmit')) document.getElementById('packagingBuilderSubmit').textContent = 'حفظ التعديلات';
    renderPackagingSets();
    document.getElementById('packageWrapperColor').value = normalized.wrapperColor;
    document.getElementById('packageNotes').value = normalized.notes;
    document.getElementById('packageCustomerName').value = normalized.customerName;
    document.getElementById('packageCustomerPhone').value = normalized.customerPhone;
    document.getElementById('packageCustomerLocation').value = normalized.customerLocation || '';
    document.querySelectorAll('input[name="packageDelivery"]').forEach(function (input) {
        input.checked = input.value === normalized.delivery;
    });
    togglePackagingDeliveryFields();
}

function openPackagingBuilder(itemId) {
    var modal = document.getElementById('packagingBuilderModal');
    if (!modal) return;
    if (itemId) {
        var item = cart.find(function (entry) { return entry.type === 'custom_package' && entry.id === itemId; });
        if (!item) return;
        populatePackagingBuilder(item);
    } else {
        resetPackagingBuilderForm();
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePackagingBuilder(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('packagingBuilderModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    resetPackagingBuilderForm();
}

function saveCustomPackageFromBuilder() {
    var selectedDelivery = document.querySelector('input[name="packageDelivery"]:checked');
    var customerName = (document.getElementById('packageCustomerName').value || '').trim();
    var customerPhone = (document.getElementById('packageCustomerPhone').value || '').trim();
    var customerLocation = (document.getElementById('packageCustomerLocation').value || '').trim();
    if (!customerName || !customerPhone) {
        alert('الرجاء إدخال الاسم ورقم الهاتف للعلبة المخصصة');
        return;
    }
    if (selectedDelivery && selectedDelivery.value === 'delivery' && !customerLocation) {
        alert('الرجاء إدخال موقع التوصيل للعلبة المخصصة');
        return;
    }
    var packageItem = normalizeCustomPackageItem({
        id: editingCustomPackageId || 'pkg_' + Date.now(),
        sets: packagingBuilderSets,
        wrapperColor: document.getElementById('packageWrapperColor').value,
        notes: document.getElementById('packageNotes').value,
        delivery: selectedDelivery ? selectedDelivery.value : 'delivery',
        customerName: customerName,
        customerPhone: customerPhone,
        customerLocation: customerLocation,
        qty: 1
    });
    var existingIndex = cart.findIndex(function (entry) {
        return entry.type === 'custom_package' && entry.id === packageItem.id;
    });
    if (existingIndex >= 0) cart[existingIndex] = packageItem;
    else cart.push(packageItem);
    saveCart();
    updateCartBadge();
    updateCheckoutLink(updateCartTotal());
    renderCart();
    closePackagingBuilder();
    alert(existingIndex >= 0 ? 'تم تحديث العلبة المخصصة بنجاح' : 'تمت إضافة العلبة المخصصة إلى السلة');
}

function editCustomPackage(itemId) {
    if (document.getElementById('cartSidebar').classList.contains('active')) toggleCart();
    setTimeout(function () {
        openPackagingBuilder(itemId);
    }, 180);
}

function getCustomPackageSetsHtml(sets) {
    return (Array.isArray(sets) ? sets : []).map(function (setItem, index) {
        return '<span class="custom-package-set-line">تشكيلة ' + (index + 1) + ': ' + getPackagingTypeLabel(setItem.chocolateType) + ' • ' + getPackagingFillingLabel(setItem.filling) + ' • الكمية ' + (parseInt(setItem.qty, 10) || 1) + '</span>';
    }).join('');
}

function getCustomPackageDeliveryLabel(item) {
    return item.delivery === 'pickup' ? 'استلام من المصنع' : 'توصيل';
}

function renderCustomPackageCartItem(item) {
    var customerParts = ['<span class="custom-package-meta">لون التغليف: ' + getWrapperColorLabel(item.wrapperColor) + '</span>'];
    customerParts.push('<span class="custom-package-meta">طريقة الاستلام: ' + getCustomPackageDeliveryLabel(item) + '</span>');
    customerParts.push('<span class="custom-package-meta">الاسم: ' + escapeHtml(item.customerName) + ' • الهاتف: ' + escapeHtml(item.customerPhone) + '</span>');
    if (item.delivery === 'delivery' && item.customerLocation) customerParts.push('<span class="custom-package-meta">الموقع: ' + escapeHtml(item.customerLocation) + '</span>');
    if (item.notes) customerParts.push('<span class="custom-package-note">ملاحظات: ' + escapeHtml(item.notes) + '</span>');
    return '<div class="cart-item custom-package-item">'
        + '<div class="custom-package-icon">🎁</div>'
        + '<div class="cart-item-info"><h4>' + getCustomPackageTitle(item) + '</h4>'
        + '<div class="custom-package-sets">' + getCustomPackageSetsHtml(item.sets) + '</div>'
        + customerParts.join('')
        + '<div class="cart-item-price pending-price">السعر يحدد بعد مراجعة الإدارة</div></div>'
        + '<div class="cart-custom-actions"><button type="button" class="cart-item-edit" onclick="editCustomPackage(\'' + item.id + '\')">تعديل</button><button class="cart-item-remove" onclick="removeFromCart(\'' + item.id + '\', -1)">✕</button></div>'
        + '</div>';
}

function getCartKnownTotal() {
    return cart.reduce(function (sum, item) {
        if (item.type === 'custom_package') return sum;
        var product = products.find(function (entry) { return entry.id === item.id; });
        return product ? sum + getFinalPrice(product, item.sizeIdx, discounts).final * item.qty : sum;
    }, 0);
}

function initializePackagingBuilder() {
    var form = document.getElementById('packagingBuilderForm');
    if (!form) return;
    resetPackagingBuilderForm();
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        saveCustomPackageFromBuilder();
    });
}

function getOrderStatusLabel(status) {
    switch (status) {
        case 'confirmed': return 'تم التأكيد';
        case 'processing': return 'قيد التجهيز';
        case 'completed': return 'مكتمل';
        case 'cancelled': return 'ملغي';
        default: return 'طلب جديد';
    }
}

function renderTrackedOrderItem(item) {
    if (item.type === 'custom_package') {
        return '<div class="tracking-order-item">'
            + '<div class="tracking-order-item-head"><h5>' + getCustomPackageTitle(item) + '</h5><span class="tracking-order-price">السعر يحدد لاحقاً</span></div>'
            + '<span class="tracking-order-extra">لون التغليف: ' + getWrapperColorLabel(item.wrapperColor) + '</span>'
            + '<div class="custom-package-sets">' + getCustomPackageSetsHtml(item.sets) + '</div>'
            + '<span class="tracking-order-extra">طريقة الاستلام: ' + getCustomPackageDeliveryLabel(item) + '</span>'
            + '<span class="tracking-order-extra">الاسم: ' + escapeHtml(item.customerName || '') + ' • الهاتف: ' + escapeHtml(item.customerPhone || '') + '</span>'
            + ((item.delivery === 'delivery' && item.customerLocation) ? '<span class="tracking-order-extra">الموقع: ' + escapeHtml(item.customerLocation) + '</span>' : '')
            + (item.notes ? '<span class="tracking-order-note">ملاحظات: ' + escapeHtml(item.notes) + '</span>' : '')
            + '</div>';
    }
    return '<div class="tracking-order-item">'
        + '<div class="tracking-order-item-head"><h5>' + escapeHtml(item.name) + '</h5><span class="tracking-order-price">' + formatCurrency(item.lineTotal) + '</span></div>'
        + '<span class="tracking-order-details">' + escapeHtml(item.brand || '') + ' • ' + escapeHtml(item.sizeLabel || '') + ' • الكمية ' + (parseInt(item.qty, 10) || 1) + '</span>'
        + '</div>';
}

function renderTrackedOrder(order) {
    var result = document.getElementById('orderTrackingResult');
    if (!result) return;
    var totalItems = (Array.isArray(order.items) ? order.items : []).reduce(function (sum, item) {
        return sum + Math.max(1, parseInt(item.qty, 10) || 1);
    }, 0);
    var totalText = order.totalDisplay || getTotalDisplayText(order.total, !!order.pricingPending);
    result.innerHTML = '<div class="tracking-result-card">'
        + '<div class="tracking-result-head"><div><h4>الطلب ' + escapeHtml(order.id) + '</h4><p>' + formatDateTime(order.date) + '</p></div><span class="tracking-status">' + getOrderStatusLabel(order.status) + '</span></div>'
        + '<div class="tracking-order-items">' + (order.items || []).map(function (item) { return renderTrackedOrderItem(item); }).join('') + '</div>'
        + '<div class="tracking-order-summary">'
        + '<div class="tracking-order-summary-row"><span>عدد المنتجات</span><strong>' + totalItems + '</strong></div>'
        + '<div class="tracking-order-summary-row"><span>الإجمالي</span><strong>' + totalText + '</strong></div>'
        + '<div class="tracking-order-summary-row"><span>الحالة</span><strong>' + getOrderStatusLabel(order.status) + '</strong></div>'
        + '</div></div>';
}

function trackOrder() {
    var input = document.getElementById('orderTrackingInput');
    var result = document.getElementById('orderTrackingResult');
    if (!input || !result) return;
    var orderId = (input.value || '').trim();
    if (!orderId) {
        result.innerHTML = '<div class="order-tracking-message error">أدخلي رقم الطلب أولاً.</div>';
        return;
    }
    if (!window.db) {
        result.innerHTML = '<div class="order-tracking-message error">تعذر الاتصال بقاعدة البيانات حالياً.</div>';
        return;
    }
    result.innerHTML = '<div class="order-tracking-message">جاري البحث عن الطلب...</div>';
    db.collection('orders').doc(orderId).get().then(function (docSnap) {
        if (!docSnap.exists) {
            result.innerHTML = '<div class="order-tracking-message error">لم يتم العثور على طلب بهذا الرقم.</div>';
            return;
        }
        var order = docSnap.data() || {};
        order.id = docSnap.id;
        renderTrackedOrder(order);
    }).catch(function () {
        result.innerHTML = '<div class="order-tracking-message error">تعذر جلب بيانات الطلب حالياً. حاولي مرة أخرى.</div>';
    });
}

function initializeOrderTracking() {
    var input = document.getElementById('orderTrackingInput');
    if (!input) return;
    input.addEventListener('keypress', function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            trackOrder();
        }
    });
}

function getSelectedCardSizeIndex(productId) {
    var select = document.getElementById('sizeSelect-' + productId);
    return select ? parseInt(select.value || '0', 10) || 0 : 0;
}

function showToast(message) {
    var toast = document.getElementById('faidiToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'faidiToast';
        toast.className = 'faidi-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2600);
}

function addToCart(event, productId) {
    event.stopPropagation();
    var product = products.find(function (entry) { return entry.id === productId; });
    if (!product || isProductSoldOut(product)) return;

    var qty = parseInt(document.getElementById('cardQty-' + productId).textContent, 10) || 1;
    var sizeIdx = getSelectedCardSizeIndex(productId);
    if (!isSizeAvailable(product, sizeIdx)) { showToast('هذا الحجم غير متوفر حالياً'); return; }

    var existing = cart.find(function (item) { return item.id === productId && item.sizeIdx === sizeIdx; });
    var inCart = existing ? existing.qty : 0;
    var maxAdd = getMaxQty(product, sizeIdx, inCart);
    if (maxAdd <= 0) { showToast('لا يمكن إضافة كمية أكبر، الكمية المتوفرة محدودة'); return; }
    if (qty > maxAdd) qty = maxAdd;

    var pricing = getFinalPrice(product, sizeIdx, discounts);
    var btn = event.currentTarget;
    var img = btn.closest('.product-card').querySelector('.product-image img');
    flyToCart(img, product);

    if (existing) existing.qty += qty;
    else cart.push({ id: productId, sizeIdx: sizeIdx, qty: qty, price: pricing.final, name: product.name, brand: product.brand, image: product.image });

    saveCart();
    updateCartBadge();
    updateCheckoutLink(updateCartTotal());

    btn.textContent = 'تمت الإضافة';
    btn.classList.add('added');
    setTimeout(function () {
        btn.textContent = 'أضيفي';
        btn.classList.remove('added');
    }, 1500);

    document.getElementById('cardQty-' + productId).textContent = '1';
}

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function popCartIcon(cartIcon) {
    if (!cartIcon) return;
    cartIcon.classList.remove('cart-pop');
    void cartIcon.offsetWidth; // restart animation
    cartIcon.classList.add('cart-pop');
    setTimeout(function () { cartIcon.classList.remove('cart-pop'); }, 520);
}

// Product image "flies" along a graceful arc into the cart, spinning and shrinking.
function flyToCart(imgElement, product) {
    var cartIcon = document.getElementById('cartIcon');
    if (!imgElement || !cartIcon) return;

    if (prefersReducedMotion()) { popCartIcon(cartIcon); return; }

    var imgRect = imgElement.getBoundingClientRect();
    var cartRect = cartIcon.getBoundingClientRect();

    var flyer = document.createElement('img');
    flyer.className = 'flying-product';
    flyer.src = imgElement.currentSrc || imgElement.src || (product && product.image) || '';
    var size = Math.max(64, Math.min(imgRect.width, 130));
    flyer.style.width = size + 'px';
    flyer.style.height = size + 'px';
    flyer.style.left = '0';
    flyer.style.top = '0';
    flyer.style.transition = 'none';
    flyer.style.willChange = 'transform, opacity';
    document.body.appendChild(flyer);

    var startX = imgRect.left + imgRect.width / 2;
    var startY = imgRect.top + imgRect.height / 2;
    var endX = cartRect.left + cartRect.width / 2;
    var endY = cartRect.top + cartRect.height / 2;

    // Control point kept inside the viewport so the whole arc stays visible.
    var midX = (startX + endX) / 2;
    var midY = (startY + endY) / 2;
    var lift = Math.min(170, Math.max(80, Math.abs(startY - endY) * 0.3 + 70));
    var cpX = midX + (endX - startX) * 0.08;
    var cpY = Math.max(14, midY - lift);

    var duration = 850;
    var startTs = null;
    var lastTrail = 0;
    var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

    function spawnTrail(x, y, s) {
        var t = document.createElement('span');
        t.className = 'fly-trail';
        var d = s * 0.9;
        t.style.width = d + 'px';
        t.style.height = d + 'px';
        t.style.left = '0';
        t.style.top = '0';
        t.style.transform = 'translate(' + (x - d / 2) + 'px, ' + (y - d / 2) + 'px)';
        t.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
        t.style.opacity = '0.55';
        document.body.appendChild(t);
        requestAnimationFrame(function () {
            t.style.opacity = '0';
            t.style.transform = 'translate(' + (x - d / 2) + 'px, ' + (y - d / 2) + 'px) scale(0.4)';
        });
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 480);
    }

    function frame(ts) {
        if (startTs === null) startTs = ts;
        var raw = Math.min((ts - startTs) / duration, 1);
        var e = easeOutCubic(raw);
        var mt = 1 - e;
        var x = mt * mt * startX + 2 * mt * e * cpX + e * e * endX;
        var y = mt * mt * startY + 2 * mt * e * cpY + e * e * endY;
        var scale = 1 - 0.8 * e;
        var rot = 300 * e;
        var opacity = raw > 0.85 ? Math.max(0, 1 - (raw - 0.85) / 0.15) : 1;
        flyer.style.transform = 'translate(' + (x - size / 2) + 'px, ' + (y - size / 2) + 'px) rotate(' + rot + 'deg) scale(' + scale + ')';
        flyer.style.opacity = opacity;
        if (ts - lastTrail > 45 && raw < 0.9) { spawnTrail(x, y, size * scale); lastTrail = ts; }
        if (raw < 1) {
            requestAnimationFrame(frame);
        } else {
            if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
            popCartIcon(cartIcon);
        }
    }
    requestAnimationFrame(frame);
}

// Subtle 3D tilt + light glare on product cards (pointer devices only).
function initCardTilt() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    var canTilt = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canTilt || prefersReducedMotion()) return;

    var MAX = 6; // degrees

    grid.addEventListener('pointermove', function (event) {
        var card = event.target.closest ? event.target.closest('.product-card') : null;
        if (!card || !grid.contains(card)) return;
        var rect = card.getBoundingClientRect();
        var px = (event.clientX - rect.left) / rect.width;
        var py = (event.clientY - rect.top) / rect.height;
        var rotY = (px - 0.5) * (MAX * 2);
        var rotX = (0.5 - py) * (MAX * 2);
        card.style.transition = 'transform 0.12s ease-out';
        card.style.transform = 'perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-8px)';
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
    });

    grid.addEventListener('pointerleave', function () {
        var cards = grid.querySelectorAll('.product-card');
        for (var i = 0; i < cards.length; i++) resetCardTilt(cards[i]);
    });

    grid.addEventListener('pointerout', function (event) {
        var card = event.target.closest ? event.target.closest('.product-card') : null;
        if (card && (!event.relatedTarget || !card.contains(event.relatedTarget))) resetCardTilt(card);
    });
}

function resetCardTilt(card) {
    if (!card) return;
    card.style.transition = '';
    card.style.transform = '';
}

// Interactive 3D background: pointer/touch glow, layer parallax, mobile gyro tilt.
function initBackground() {
    var bg = document.getElementById('bg3d');
    if (!bg || prefersReducedMotion()) return;
    var layers = bg.querySelectorAll('.bg-layer');
    var glow = document.getElementById('bgGlow');
    var W = window.innerWidth, H = window.innerHeight;
    var tx = 0, ty = 0;      // normalized -1..1 for layer parallax
    var gxPx = W / 2, gyPx = H / 2; // glow position in px
    var raf = null;

    window.addEventListener('resize', function () { W = window.innerWidth; H = window.innerHeight; }, { passive: true });

    function apply() {
        raf = null;
        for (var i = 0; i < layers.length; i++) {
            var d = parseFloat(layers[i].getAttribute('data-depth')) || 0.04;
            layers[i].style.transform = 'translate3d(' + (-tx * d * 650) + 'px, ' + (-ty * d * 650) + 'px, 0)';
        }
        if (glow) glow.style.transform = 'translate3d(' + gxPx + 'px, ' + gyPx + 'px, 0)';
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(apply); }

    function moveTo(px, py) {
        gxPx = px; gyPx = py;
        tx = (px / W - 0.5) * 2;
        ty = (py / H - 0.5) * 2;
        if (glow) glow.classList.add('active');
        schedule();
    }

    window.addEventListener('pointermove', function (e) { moveTo(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) moveTo(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    // Ripple burst on tap/click for extra life.
    window.addEventListener('pointerdown', function (e) { spawnBgRipple(bg, e.clientX, e.clientY); }, { passive: true });

    // Device tilt parallax (mobile).
    function onTilt(e) {
        if (e.gamma == null) return;
        tx = Math.max(-1, Math.min(1, e.gamma / 32));
        ty = Math.max(-1, Math.min(1, (e.beta - 45) / 32));
        gxPx = W / 2 + tx * W * 0.32;
        gyPx = H / 2 + ty * H * 0.32;
        if (glow) glow.classList.add('active');
        schedule();
    }
    function enableTilt() { if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', onTilt, { passive: true }); }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        window.addEventListener('touchend', function once() {
            DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') enableTilt(); }).catch(function () {});
            window.removeEventListener('touchend', once);
        }, { once: true });
    } else {
        enableTilt();
    }

    apply();
}

function spawnBgRipple(bg, x, y) {
    if (prefersReducedMotion()) return;
    var r = document.createElement('span');
    r.className = 'bg-ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    bg.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 900);
}

// Hero background video: honor reduced-motion, recover from blocked autoplay.
function initHeroVideo() {
    var v = document.querySelector('.hero-slide.active video') || document.querySelector('.hero-slide video.hero-video');
    if (!v) return;
    if (prefersReducedMotion()) {
        v.removeAttribute('autoplay');
        v.pause();
        return;
    }
    var tryPlay = function () {
        var p = v.play();
        if (p && p.catch) p.catch(function () {
            // Autoplay blocked (e.g. low-power mode): retry on first interaction.
            var resume = function () { v.play().catch(function () {}); document.removeEventListener('touchstart', resume); document.removeEventListener('click', resume); };
            document.addEventListener('touchstart', resume, { once: true, passive: true });
            document.addEventListener('click', resume, { once: true });
        });
    };
    if (v.readyState >= 2) tryPlay(); else v.addEventListener('loadeddata', tryPlay, { once: true });
}

// Reveal sections as they scroll into view.
function initScrollReveal() {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    var selectors = '.section-title, .section-subtitle, .about-content, .about-features .feature, .delivery-card, .brands-grid, .order-tracking-card, .social-links';
    var targets = document.querySelectorAll(selectors);
    if (!targets.length) return;
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    targets.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = (Math.min(i % 6, 5) * 0.07) + 's';
        observer.observe(el);
    });
}

function changeCardQty(productId, delta) {
    var span = document.getElementById('cardQty-' + productId);
    if (!span) return;
    var qty = (parseInt(span.textContent, 10) || 1) + delta;
    if (qty < 1) qty = 1;
    var product = products.find(function (entry) { return entry.id === productId; });
    if (product) {
        var sizeIdx = getSelectedCardSizeIndex(productId);
        var stock = getSizeStock(product, sizeIdx);
        if (stock !== null && qty > stock) { qty = Math.max(1, stock); showToast('الكمية المتوفرة: ' + stock); }
    }
    if (qty > 99) qty = 99;
    span.textContent = qty;
}

function updateCartBadge() {
    var badge = document.getElementById('cartBadge');
    if (!badge) return;
    var totalItems = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    if (totalItems > 0) {
        badge.style.display = 'flex';
        var changed = badge.textContent !== String(totalItems);
        badge.textContent = totalItems;
        if (changed && !prefersReducedMotion()) {
            badge.classList.remove('badge-pop');
            void badge.offsetWidth;
            badge.classList.add('badge-pop');
        }
    } else {
        badge.style.display = 'none';
    }
}

function toggleCart() {
    var sidebar = document.getElementById('cartSidebar');
    var overlay = document.getElementById('cartOverlay');
    if (!sidebar || !overlay) return;
    var isOpen = sidebar.classList.contains('active');

    if (isOpen) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderCart();
    }
}

function renderCart() {
    var container = document.getElementById('cartItems');
    var footer = document.getElementById('cartFooter');
    if (!container || !footer) return;

    if (!cart.length) {
        container.innerHTML = '<div class="cart-empty"><span>🛒</span><p>السلة فارغة</p></div>';
        footer.style.display = 'none';
        updateCheckoutLink(0);
        return;
    }

    footer.style.display = 'block';
    container.innerHTML = cart.map(function (item) {
        if (item.type === 'custom_package') return renderCustomPackageCartItem(item);
        var product = products.find(function (entry) { return entry.id === item.id; });
        if (!product) return '';
        var sizeData = getSizeData(product, item.sizeIdx);
        var pricing = getFinalPrice(product, item.sizeIdx, discounts);
        return '<div class="cart-item"><img src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'' + FALLBACK_IMAGE + '\'"><div class="cart-item-info"><h4>' + product.name + '</h4><span class="cart-item-brand">' + product.brand + ' • ' + getSizeLabel(sizeData) + '</span><div class="cart-item-price">' + formatCurrency(pricing.final * item.qty) + '</div></div><div class="cart-item-qty"><button onclick="updateCartQty(\'' + item.id + '\', ' + item.sizeIdx + ', -1)">−</button><span>' + item.qty + '</span><button onclick="updateCartQty(\'' + item.id + '\', ' + item.sizeIdx + ', 1)">+</button></div><button class="cart-item-remove" onclick="removeFromCart(\'' + item.id + '\', ' + item.sizeIdx + ')">✕</button></div>';
    }).join('');

    updateCheckoutLink(updateCartTotal());
}

function updateCartQty(productId, sizeIdx, delta) {
    var item = cart.find(function (entry) { return entry.id === productId && entry.sizeIdx === sizeIdx; });
    if (!item || item.type === 'custom_package') return;
    var newQty = item.qty + delta;
    if (newQty < 1) {
        removeFromCart(productId, sizeIdx);
        return;
    }
    var product = products.find(function (entry) { return entry.id === productId; });
    if (product) {
        var stock = getSizeStock(product, sizeIdx);
        if (stock !== null && newQty > stock) { newQty = stock; showToast('الكمية المتوفرة: ' + stock); }
    }
    item.qty = newQty;
    saveCart();
    updateCartBadge();
    renderCart();
}

function removeFromCart(productId, sizeIdx) {
    cart = cart.filter(function (entry) {
        if (entry.type === 'custom_package') return entry.id !== String(productId);
        return !(entry.id === productId && entry.sizeIdx === sizeIdx);
    });
    saveCart();
    updateCartBadge();
    renderCart();
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
}

function updateCartTotal() {
    var total = getCartKnownTotal();
    var totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = getTotalDisplayText(total, hasCustomPricingPending(cart));
    return total;
}

function updateCheckoutLink(total) {
    var btn = document.getElementById('checkoutBtn');
    if (!btn) return;
    btn.href = 'checkout.html';
    btn.classList.toggle('disabled', cart.length === 0);
}

function saveCart() {
    localStorage.setItem('faidi_cart', JSON.stringify(normalizeCartItems(cart, products.length ? products : normalizeProducts(DEFAULT_PRODUCTS))));
}

function setDeliveryMethod(method) {
    deliveryMethod = method;
    localStorage.setItem('faidi_delivery_method', method);
    var pickupBtn = document.getElementById('optPickup');
    var deliveryBtn = document.getElementById('optDelivery');
    if (pickupBtn) pickupBtn.classList.toggle('active', method === 'pickup');
    if (deliveryBtn) deliveryBtn.classList.toggle('active', method === 'delivery');
}

// ===== Hero Slider =====
var heroSlideIndex = 0;
var heroSlideTimer = null;

function renderHeroSlider(slides) {
    var section = document.getElementById('heroSection');
    var dotsEl = document.getElementById('heroDots');
    if (!section || !slides || !slides.length) return;

    var html = slides.map(function(slide, idx) {
        var media = '';
        if (slide.type === 'video') {
            var single = slides.length <= 1;
            var posterAttr = slide.poster ? ' poster="' + slide.poster + '"' : '';
            var endAttr = single ? '' : ' onended="goHeroSlide(' + ((idx + 1) % slides.length) + ')"';
            media = '<video class="hero-video" src="' + slide.url + '" muted playsinline preload="auto"' + posterAttr +
                (idx === 0 ? ' autoplay' : '') + (single ? ' loop' : '') +
                ' style="width:100%;height:100%;object-fit:cover;"' + endAttr + '></video>';
        } else {
            media = '<img src="' + slide.url + '" alt="' + (slide.title || '') + '" style="width:100%;height:100%;object-fit:cover;">';
        }
        return '<div class="hero-slide' + (idx === 0 ? ' active' : '') + '">' + media +
            '<div class="hero-overlay"><div class="hero-content">' +
            (slide.title ? '<h2>' + slide.title + '</h2>' : '') +
            (slide.subtitle ? '<p>' + slide.subtitle + '</p>' : '') +
            '<a href="#products" class="btn-primary">تسوقي الآن</a>' +
            '</div></div></div>';
    }).join('');
    section.innerHTML = html;

    // Dots
    if (dotsEl && slides.length > 1) {
        dotsEl.innerHTML = slides.map(function(_, idx) {
            return '<button class="' + (idx === 0 ? 'active' : '') + '" onclick="goHeroSlide(' + idx + ')"></button>';
        }).join('');
        section.appendChild(dotsEl);
        dotsEl.style.display = 'flex';
    }

    // Auto-advance
    startHeroSlideTimer();
    initHeroVideo();
}

function goHeroSlide(n) {
    var section = document.getElementById('heroSection');
    if (!section) return;
    var allSlides = section.querySelectorAll('.hero-slide');
    var allDots = section.querySelectorAll('.hero-dots button');
    if (!allSlides.length) return;
    if (allSlides[heroSlideIndex]) allSlides[heroSlideIndex].classList.remove('active');
    if (allDots[heroSlideIndex]) allDots[heroSlideIndex].classList.remove('active');
    heroSlideIndex = n;
    if (allSlides[heroSlideIndex]) allSlides[heroSlideIndex].classList.add('active');
    if (allDots[heroSlideIndex]) allDots[heroSlideIndex].classList.add('active');
    var vid = allSlides[heroSlideIndex] ? allSlides[heroSlideIndex].querySelector('video') : null;
    if (vid) { vid.currentTime = 0; vid.play(); }
    startHeroSlideTimer();
}

function startHeroSlideTimer() {
    if (heroSlideTimer) clearInterval(heroSlideTimer);
    heroSlideTimer = setInterval(function() {
        var section = document.getElementById('heroSection');
        if (!section) return;
        var allSlides = section.querySelectorAll('.hero-slide');
        if (allSlides.length <= 1) return;
        var current = allSlides[heroSlideIndex];
        if (current && !current.querySelector('video')) {
            goHeroSlide((heroSlideIndex + 1) % allSlides.length);
        }
    }, 5000);
}

function buildPdpMedia(product) {
    var media = product.video || product.image;
    var poster = product.image || product.poster || '';
    if (!media) return '<img src="' + FALLBACK_IMAGE + '" alt="' + product.name + '">';
    // Real video files play in a <video>; GIFs/images animate on their own in an <img>.
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(media)) {
        return '<video src="' + media + '" autoplay muted loop playsinline preload="auto"' +
            (poster ? ' poster="' + poster + '"' : '') +
            ' onerror="this.outerHTML=\'&lt;img src=&quot;' + (poster || FALLBACK_IMAGE) + '&quot;&gt;\'"></video>';
    }
    return '<img src="' + media + '" alt="' + product.name + '" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">';
}

function openPDP(productId) {
    var product = products.find(function (entry) { return entry.id === productId; });
    if (!product) return;

    currentPDPProduct = product;
    currentPDPSizeIdx = getFirstAvailableSizeIdx(product);
    pdpQty = 1;

    document.getElementById('pdpImage').innerHTML = buildPdpMedia(product);
    document.getElementById('pdpBrand').textContent = product.brand;
    document.getElementById('pdpName').textContent = product.name;
    document.getElementById('pdpQty').textContent = '1';
    renderPDPSizeOptions();
    updatePDPDisplay();

    var addBtn = document.getElementById('pdpAddBtn');
    if (isProductSoldOut(product)) {
        addBtn.textContent = 'نفذت الكمية';
        addBtn.disabled = true;
        addBtn.style.background = '#9ca3af';
    } else {
        addBtn.textContent = 'أضيفي للسلة';
        addBtn.disabled = false;
        addBtn.style.background = '';
    }

    renderRelatedProducts(product);
    document.getElementById('pdpModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderRelatedProducts(product) {
    var container = document.getElementById('pdpRelatedGrid');
    var section = document.getElementById('pdpRelated');
    if (!container || !section) return;

    var related = products.filter(function (p) {
        return p.id !== product.id && (p.category === product.category || p.brand === product.brand);
    }).slice(0, 4);

    if (related.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = related.map(function (p) {
        var pricing = getFinalPrice(p, 0, discounts);
        return '<div class="pdp-related-item" onclick="openPDP(\'' + p.id + '\')">' +
            '<img src="' + p.image + '" alt="' + p.name + '" onerror="this.src=\'' + FALLBACK_IMAGE + '\'">' +
            '<div class="related-info"><p>' + p.name + '</p><span>' + formatCurrency(pricing.final) + '</span></div>' +
            '</div>';
    }).join('');
}

function renderPDPSizeOptions() {
    var section = document.getElementById('pdpSizeSection');
    var container = document.getElementById('pdpSizes');
    if (!currentPDPProduct || !section || !container) return;

    if (currentPDPProduct.sizes.length <= 1) {
        section.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    section.style.display = 'flex';
    container.innerHTML = currentPDPProduct.sizes.map(function (size, idx) {
        var avail = isSizeAvailable(currentPDPProduct, idx);
        return '<button type="button" class="pdp-size-btn ' + (idx === currentPDPSizeIdx ? 'active' : '') + (avail ? '' : ' sold-out') + '"' + (avail ? '' : ' disabled') + ' onclick="selectPDPSize(' + idx + ')">' + getSizeLabel(size) + (avail ? '' : ' (نفذ)') + '</button>';
    }).join('');
}

function selectPDPSize(sizeIdx) {
    if (!isSizeAvailable(currentPDPProduct, sizeIdx)) return;
    currentPDPSizeIdx = sizeIdx;
    if (pdpQty > 1) { pdpQty = 1; document.getElementById('pdpQty').textContent = '1'; }
    renderPDPSizeOptions();
    updatePDPDisplay();
}

function updatePDPDisplay() {
    if (!currentPDPProduct) return;
    var sizeData = getSizeData(currentPDPProduct, currentPDPSizeIdx);
    var pricing = getFinalPrice(currentPDPProduct, currentPDPSizeIdx, discounts);
    document.getElementById('pdpMeta').innerHTML = '<span>' + currentPDPProduct.category + '</span><span>' + getSizeLabel(sizeData) + '</span>';
    document.getElementById('pdpPrice').innerHTML = (pricing.hasDiscount ? '<span class="original-price">' + formatCurrency(pricing.original) + '</span>' : '') + '<span class="final-price">' + formatCurrency(pricing.final) + '</span>';
    var stockEl = document.getElementById('pdpStock');
    var stock = getSizeStock(currentPDPProduct, currentPDPSizeIdx);
    if (stockEl) {
        if (stock === null) { stockEl.textContent = ''; stockEl.style.display = 'none'; }
        else if (stock <= 0) { stockEl.textContent = 'نفذت الكمية'; stockEl.className = 'pdp-stock out'; stockEl.style.display = 'block'; }
        else if (stock <= 5) { stockEl.textContent = 'متبقٍ ' + stock + ' قطع فقط'; stockEl.className = 'pdp-stock low'; stockEl.style.display = 'block'; }
        else { stockEl.textContent = 'متوفر في المخزون'; stockEl.className = 'pdp-stock in'; stockEl.style.display = 'block'; }
    }
}

function closePDP(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('pdpModal').style.display = 'none';
    document.body.style.overflow = '';
    currentPDPProduct = null;
}

function changePDPQty(delta) {
    pdpQty += delta;
    if (pdpQty < 1) pdpQty = 1;
    if (currentPDPProduct) {
        var stock = getSizeStock(currentPDPProduct, currentPDPSizeIdx);
        if (stock !== null && pdpQty > stock) { pdpQty = Math.max(1, stock); showToast('الكمية المتوفرة: ' + stock); }
    }
    if (pdpQty > 99) pdpQty = 99;
    document.getElementById('pdpQty').textContent = pdpQty;
}

function addFromPDP() {
    if (!currentPDPProduct || isProductSoldOut(currentPDPProduct)) return;
    if (!isSizeAvailable(currentPDPProduct, currentPDPSizeIdx)) { showToast('هذا الحجم غير متوفر حالياً'); return; }

    var existing = cart.find(function (item) { return item.id === currentPDPProduct.id && item.sizeIdx === currentPDPSizeIdx; });
    var inCart = existing ? existing.qty : 0;
    var maxAdd = getMaxQty(currentPDPProduct, currentPDPSizeIdx, inCart);
    if (maxAdd <= 0) { showToast('لا يمكن إضافة كمية أكبر، الكمية المتوفرة محدودة'); return; }
    var addQty = Math.min(pdpQty, maxAdd);

    var pricing = getFinalPrice(currentPDPProduct, currentPDPSizeIdx, discounts);
    if (existing) existing.qty += addQty;
    else cart.push({ id: currentPDPProduct.id, sizeIdx: currentPDPSizeIdx, qty: addQty, price: pricing.final, name: currentPDPProduct.name, brand: currentPDPProduct.brand, image: currentPDPProduct.image });

    saveCart();
    updateCartBadge();
    updateCheckoutLink(updateCartTotal());

    var img = document.querySelector('#pdpImage img');
    if (img) flyToCart(img, currentPDPProduct);

    var btn = document.getElementById('pdpAddBtn');
    btn.textContent = 'تمت الإضافة';
    btn.classList.add('added');
    setTimeout(function () {
        btn.textContent = 'أضيفي للسلة';
        btn.classList.remove('added');
        closePDP();
    }, 1200);
}
