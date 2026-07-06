// Seed data for Faidi Turkish
// Run via: window.seedFirestoreData(true)  (while logged into the admin so the API token is set)

window.seedFirestoreData = function(clearExisting) {
    var db = window.db;

    // Static first-frame posters for each product GIF (used for fast, no-stutter loading).
    var POSTERS = {
        "https://i.ibb.co/8DQZGvp2/b6dcf2a95ad4.gif": "https://i.ibb.co/fdKd9Zrk/5a34312e9f09.jpg",
        "https://i.ibb.co/bRb88yrc/82b43bff1ab5.gif": "https://i.ibb.co/cXLX7cF0/6a2626d7d4bf.jpg",
        "https://i.ibb.co/rfZGdmgw/9b3c26149629.gif": "https://i.ibb.co/CK0TGtnn/17a37db55145.jpg",
        "https://i.ibb.co/NdZjtkh0/f95f3628696a.gif": "https://i.ibb.co/WW8b8Lrc/5721bda295f2.jpg",
        "https://i.ibb.co/dJL0mYb6/ebad226e64a2.gif": "https://i.ibb.co/ynJ9Nf4C/cf40d64a1d75.jpg",
        "https://i.ibb.co/DP7JbWPP/2c9041a9895e.gif": "https://i.ibb.co/xKrCyLWz/39214f092bd2.jpg",
        "https://i.ibb.co/fzhjH65w/a4ba0eb5fdf7.gif": "https://i.ibb.co/HfWrBvby/4178041dc3ad.jpg",
        "https://i.ibb.co/VYyhNSPT/53b9307b41d5.gif": "https://i.ibb.co/SDYhRLhs/1599b4c8068e.jpg",
        "https://i.ibb.co/F4f5Khrt/2202a1394f90.gif": "https://i.ibb.co/c4MmLrQ/6f8d649a9e37.jpg",
        "https://i.ibb.co/LX8txNkV/8f8e1a007785.gif": "https://i.ibb.co/27XPTJv9/fca93b8a527b.jpg",
        "https://i.ibb.co/0R6BCZbJ/afecdaa291e1.gif": "https://i.ibb.co/nqC9D55f/403286a3d090.jpg",
        "https://i.ibb.co/wNPcz6zt/911191546ecb.gif": "https://i.ibb.co/Lzcwtk9k/28a1d377d58e.jpg",
        "https://i.ibb.co/wZCbDPWk/e3c853fed248.gif": "https://i.ibb.co/xtYfb362/a26627191886.jpg",
        "https://i.ibb.co/hqdsSJg/c852b7f0f69e.gif": "https://i.ibb.co/60k1HCxY/aa5425d5cc8c.jpg",
        "https://i.ibb.co/DfvK4ndJ/2464ce020e69.gif": "https://i.ibb.co/YBwTGZ8s/c4dc10402158.jpg",
        "https://i.ibb.co/vxC00Mb3/57b3c54060fb.gif": "https://i.ibb.co/4wvx01TC/b975d39ac6fd.jpg",
        "https://i.ibb.co/N6WdNQtp/8d656d041346.gif": "https://i.ibb.co/67HQhxL3/674b8a56dfd8.jpg",
        "https://i.ibb.co/RpvfwhnD/3aaf2d1f3a69.gif": "https://i.ibb.co/2XSXKyt/c9f8ee5321fa.jpg",
        "https://i.ibb.co/XrbzVHv0/ab02d9305a8f.gif": "https://i.ibb.co/VcsQWqZG/65096dc4b6b1.jpg"
    };

    function img(id) { return 'https://images.unsplash.com/photo-' + id + '?w=600&h=800&fit=crop'; }
    // stocks: optional [S, M, L, XL] per-size quantities. Omit for the default spread.
    function clothingSizes(price, stocks) {
        var labels = ['S', 'M', 'L', 'XL'];
        var def = [12, 15, 10, 6];
        return labels.map(function(s, i) {
            return { size: s, unit: 'قطعة', price: price, stock: (stocks ? stocks[i] : def[i]) };
        });
    }
    function oneSize(price, stock) { return [{ size: '-', unit: '', price: price, stock: (stock === undefined ? 8 : stock) }]; }

    var products = [
        // ===== فساتين =====
        { name: 'فستان سهرة تركي مطرز', brand: 'Koton', category: 'فساتين', image: 'https://i.ibb.co/8DQZGvp2/b6dcf2a95ad4.gif', description: 'فستان سهرة تركي طويل بتطريز يدوي فاخر، مثالي للمناسبات.', status: 'bestseller', sizes: clothingSizes(240) },
        { name: 'فستان كاجوال صيفي', brand: 'LC Waikiki', category: 'فساتين', image: 'https://i.ibb.co/bRb88yrc/82b43bff1ab5.gif', description: 'فستان صيفي خفيف بقصّة أنيقة وخامة قطنية مريحة.', status: 'special', sizes: clothingSizes(150) },
        { name: 'فستان ميدي منقوش', brand: 'Trendyol', category: 'فساتين', image: 'https://i.ibb.co/rfZGdmgw/9b3c26149629.gif', description: 'فستان ميدي بنقشات تركية عصرية يناسب إطلالات النهار.', status: '', sizes: clothingSizes(175, [8, 0, 5, 3]) },
        { name: 'فستان سواريه ساتان', brand: 'Boyner', category: 'فساتين', image: 'https://i.ibb.co/NdZjtkh0/f95f3628696a.gif', description: 'فستان سواريه من الساتان الفاخر بلمسة راقية.', status: 'bestseller', sizes: clothingSizes(265) },
        { name: 'فستان يومي مريح', brand: 'DeFacto', category: 'فساتين', image: 'https://i.ibb.co/dJL0mYb6/ebad226e64a2.gif', description: 'فستان يومي بقصّة واسعة وخامة ناعمة تدوم طويلاً.', status: '', sizes: clothingSizes(130) },
        { name: 'فستان زفاف ضيوف', brand: 'Koton', category: 'فساتين', image: 'https://i.ibb.co/8DQZGvp2/b6dcf2a95ad4.gif', description: 'فستان أنيق لحضور المناسبات والأعراس بتفاصيل مميزة.', status: 'special', sizes: clothingSizes(220) },

        // ===== سبورات =====
        { name: 'طقم سبور رياضي نسائي', brand: 'Mavi', category: 'سبورات', image: 'https://i.ibb.co/DP7JbWPP/2c9041a9895e.gif', description: 'طقم سبور تركي مريح للتمارين والإطلالات الكاجوال.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'ليقنز رياضي مطاطي', brand: 'LC Waikiki', category: 'سبورات', image: 'https://i.ibb.co/fzhjH65w/a4ba0eb5fdf7.gif', description: 'ليقنز رياضي عالي الخصر بخامة مطاطية داعمة.', status: '', sizes: clothingSizes(90, [0, 4, 6, 2]) },
        { name: 'جاكيت رياضي بسحّاب', brand: 'DeFacto', category: 'سبورات', image: 'https://i.ibb.co/VYyhNSPT/53b9307b41d5.gif', description: 'جاكيت رياضي خفيف بسحّاب أمامي مناسب لكل الفصول.', status: 'special', sizes: clothingSizes(120) },
        { name: 'بلوزة رياضية قطنية', brand: 'Mavi', category: 'سبورات', image: 'https://i.ibb.co/F4f5Khrt/2202a1394f90.gif', description: 'بلوزة رياضية قطنية بقصّة عصرية ومريحة.', status: '', sizes: clothingSizes(85) },
        { name: 'بنطلون جوجر واسع', brand: 'Trendyol', category: 'سبورات', image: 'https://i.ibb.co/LX8txNkV/8f8e1a007785.gif', description: 'بنطلون جوجر رياضي واسع بخامة ناعمة وأربطة قابلة للتعديل.', status: '', sizes: clothingSizes(110) },

        // ===== أطقم =====
        { name: 'طقم قطعتين أنيق', brand: 'Koton', category: 'أطقم', image: 'https://i.ibb.co/0R6BCZbJ/afecdaa291e1.gif', description: 'طقم من قطعتين بتنسيق تركي عصري يناسب المناسبات.', status: 'bestseller', sizes: clothingSizes(210) },
        { name: 'طقم بليزر وبنطلون', brand: 'Boyner', category: 'أطقم', image: 'https://i.ibb.co/wNPcz6zt/911191546ecb.gif', description: 'طقم رسمي من بليزر وبنطلون بقصّة أنيقة.', status: 'special', sizes: clothingSizes(230) },
        { name: 'طقم صيفي مطبوع', brand: 'LC Waikiki', category: 'أطقم', image: 'https://i.ibb.co/wZCbDPWk/e3c853fed248.gif', description: 'طقم صيفي بطبعات مبهجة وخامة خفيفة.', status: '', sizes: clothingSizes(160) },
        { name: 'طقم كاجوال يومي', brand: 'DeFacto', category: 'أطقم', image: 'https://i.ibb.co/0R6BCZbJ/afecdaa291e1.gif', description: 'طقم كاجوال مريح لإطلالة يومية عملية وأنيقة.', status: '', sizes: clothingSizes(150) },

        // ===== بلايز =====
        { name: 'بلوزة ساتان ناعمة', brand: 'Trendyol', category: 'بلايز', image: 'https://i.ibb.co/hqdsSJg/c852b7f0f69e.gif', description: 'بلوزة ساتان بلمسة لامعة راقية تناسب المناسبات.', status: 'special', sizes: clothingSizes(95) },
        { name: 'قميص كاجوال قطني', brand: 'Mavi', category: 'بلايز', image: 'https://i.ibb.co/DfvK4ndJ/2464ce020e69.gif', description: 'قميص قطني بقصّة مريحة يصلح لكل الأوقات.', status: '', sizes: clothingSizes(80) },
        { name: 'بلوزة كروب عصرية', brand: 'Koton', category: 'بلايز', image: 'https://i.ibb.co/hqdsSJg/c852b7f0f69e.gif', description: 'بلوزة كروب عصرية بتفاصيل مميزة وألوان جذابة.', status: '', sizes: clothingSizes(70) },

        // ===== بناطيل =====
        { name: 'بنطلون جينز عالي الخصر', brand: 'Mavi', category: 'بناطيل', image: 'https://i.ibb.co/vxC00Mb3/57b3c54060fb.gif', description: 'جينز تركي عالي الخصر بقصّة سكيني مريحة.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'بنطلون قماش رسمي', brand: 'Boyner', category: 'بناطيل', image: 'https://i.ibb.co/wNPcz6zt/911191546ecb.gif', description: 'بنطلون قماش رسمي بقصّة مستقيمة أنيقة.', status: '', sizes: clothingSizes(120) },
        { name: 'بنطلون واسع كاجوال', brand: 'DeFacto', category: 'بناطيل', image: 'https://i.ibb.co/dJL0mYb6/ebad226e64a2.gif', description: 'بنطلون واسع كاجوال بخامة مريحة وإطلالة عصرية.', status: 'special', sizes: clothingSizes(105) },

        // ===== تنانير =====
        { name: 'تنورة ميدي بليسيه', brand: 'Trendyol', category: 'تنانير', image: 'https://i.ibb.co/N6WdNQtp/8d656d041346.gif', description: 'تنورة ميدي بطيّات بليسيه أنيقة وحركة انسيابية.', status: '', sizes: clothingSizes(115) },

        // ===== إكسسوارات =====
        { name: 'شنطة يد تركية', brand: 'Boyner', category: 'إكسسوارات', image: 'https://i.ibb.co/RpvfwhnD/3aaf2d1f3a69.gif', description: 'شنطة يد أنيقة بتصميم تركي عملي وفاخر.', status: 'special', sizes: oneSize(90, 0) },
        { name: 'شال حريري مطبوع', brand: 'Koton', category: 'إكسسوارات', image: 'https://i.ibb.co/XrbzVHv0/ab02d9305a8f.gif', description: 'شال حريري بطبعات راقية يكمّل إطلالتك.', status: '', sizes: oneSize(55) }
    ];

    var settings = {
        whatsappNumber: '972569236758',
        heroSubtitle: 'أحدث صيحات الموضة التركية النسائية بين يديكِ',
        aboutText: 'فايدي تركش، وجهتكِ الأولى للأزياء التركية النسائية الفاخرة في نابلس وكل فلسطين.\nننتقي لكِ أرقى الفساتين والسبورات والأطقم التركية بأحدث صيحات الموضة وأجود الخامات.\nخدمة توصيل سريعة لجميع مناطق الضفة والقدس والداخل عبر الواتساب.',
        instagramLink: 'https://www.instagram.com/faidi_turkish/',
        tiktokLink: ''
    };

    function prepare(product, index) {
        product.id = index + 1;
        product.order = index + 1;
        product.inStock = true;
        product.poster = POSTERS[product.image] || '';
        if (!Array.isArray(product.sizes) || !product.sizes.length) {
            product.sizes = [{ size: '-', unit: '', price: product.price || 0 }];
        }
        product.price = product.sizes[0].price;
        return product;
    }

    function runSeed() {
        var productsRef = db.collection('products');
        var settingsRef = db.collection('settings').doc('config');

        if (clearExisting) {
            console.log('Clearing existing data...');
            return productsRef.get().then(function(snapshot) {
                var deleteBatch = db.batch();
                snapshot.forEach(function(doc) { deleteBatch.delete(doc.ref); });
                return deleteBatch.commit();
            }).then(function() {
                var addBatch = db.batch();
                products.forEach(function(product, index) {
                    addBatch.set(productsRef.doc(String(index + 1)), prepare(product, index));
                });
                addBatch.set(settingsRef, settings);
                return addBatch.commit();
            }).then(function() {
                console.log('Seeded ' + products.length + ' products successfully!');
            });
        }

        var batch = db.batch();
        products.forEach(function(product, index) {
            batch.set(productsRef.doc(String(index + 1)), prepare(product, index));
        });
        batch.set(settingsRef, settings);
        return batch.commit().then(function() {
            console.log('Seeded ' + products.length + ' products successfully!');
        });
    }

    return runSeed();
};
