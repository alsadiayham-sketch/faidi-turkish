// Seed data for Faidi Turkish
// Run via: window.seedFirestoreData(true)  (while logged into the admin so the API token is set)

window.seedFirestoreData = function(clearExisting) {
    var db = window.db;

    function img(id) { return 'https://images.unsplash.com/photo-' + id + '?w=600&h=800&fit=crop'; }
    function clothingSizes(price) {
        return ['S', 'M', 'L', 'XL'].map(function(s) { return { size: s, unit: 'قطعة', price: price }; });
    }
    function oneSize(price) { return [{ size: '-', unit: '', price: price }]; }

    var products = [
        // ===== فساتين =====
        { name: 'فستان سهرة تركي مطرز', brand: 'Koton', category: 'فساتين', image: img('1595777457583-95e059d581b8'), description: 'فستان سهرة تركي طويل بتطريز يدوي فاخر، مثالي للمناسبات.', status: 'bestseller', sizes: clothingSizes(240) },
        { name: 'فستان كاجوال صيفي', brand: 'LC Waikiki', category: 'فساتين', image: img('1490481651871-ab68de25d43d'), description: 'فستان صيفي خفيف بقصّة أنيقة وخامة قطنية مريحة.', status: 'special', sizes: clothingSizes(150) },
        { name: 'فستان ميدي منقوش', brand: 'Trendyol', category: 'فساتين', image: img('1539008835657-9e8e9680c956'), description: 'فستان ميدي بنقشات تركية عصرية يناسب إطلالات النهار.', status: '', sizes: clothingSizes(175) },
        { name: 'فستان سواريه ساتان', brand: 'Boyner', category: 'فساتين', image: img('1572804013309-59a88b7e92f1'), description: 'فستان سواريه من الساتان الفاخر بلمسة راقية.', status: 'bestseller', sizes: clothingSizes(265) },
        { name: 'فستان يومي مريح', brand: 'DeFacto', category: 'فساتين', image: img('1483985988355-763728e1935b'), description: 'فستان يومي بقصّة واسعة وخامة ناعمة تدوم طويلاً.', status: '', sizes: clothingSizes(130) },
        { name: 'فستان زفاف ضيوف', brand: 'Koton', category: 'فساتين', image: img('1469334031218-e382a71b716b'), description: 'فستان أنيق لحضور المناسبات والأعراس بتفاصيل مميزة.', status: 'special', sizes: clothingSizes(220) },

        // ===== سبورات =====
        { name: 'طقم سبور رياضي نسائي', brand: 'Mavi', category: 'سبورات', image: img('1518310383802-640c2de311b2'), description: 'طقم سبور تركي مريح للتمارين والإطلالات الكاجوال.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'ليقنز رياضي مطاطي', brand: 'LC Waikiki', category: 'سبورات', image: img('1506629082955-511b1aa562c8'), description: 'ليقنز رياضي عالي الخصر بخامة مطاطية داعمة.', status: '', sizes: clothingSizes(90) },
        { name: 'جاكيت رياضي بسحّاب', brand: 'DeFacto', category: 'سبورات', image: img('1571019613454-1cb2f99b2d8b'), description: 'جاكيت رياضي خفيف بسحّاب أمامي مناسب لكل الفصول.', status: 'special', sizes: clothingSizes(120) },
        { name: 'بلوزة رياضية قطنية', brand: 'Mavi', category: 'سبورات', image: img('1479064555552-3ef4979f8908'), description: 'بلوزة رياضية قطنية بقصّة عصرية ومريحة.', status: '', sizes: clothingSizes(85) },
        { name: 'بنطلون جوجر واسع', brand: 'Trendyol', category: 'سبورات', image: img('1483118714900-540cf339fd46'), description: 'بنطلون جوجر رياضي واسع بخامة ناعمة وأربطة قابلة للتعديل.', status: '', sizes: clothingSizes(110) },

        // ===== أطقم =====
        { name: 'طقم قطعتين أنيق', brand: 'Koton', category: 'أطقم', image: img('1515372039744-b8f02a3ae446'), description: 'طقم من قطعتين بتنسيق تركي عصري يناسب المناسبات.', status: 'bestseller', sizes: clothingSizes(210) },
        { name: 'طقم بليزر وبنطلون', brand: 'Boyner', category: 'أطقم', image: img('1496747611176-843222e1e57c'), description: 'طقم رسمي من بليزر وبنطلون بقصّة أنيقة.', status: 'special', sizes: clothingSizes(230) },
        { name: 'طقم صيفي مطبوع', brand: 'LC Waikiki', category: 'أطقم', image: img('1445205170230-053b83016050'), description: 'طقم صيفي بطبعات مبهجة وخامة خفيفة.', status: '', sizes: clothingSizes(160) },
        { name: 'طقم كاجوال يومي', brand: 'DeFacto', category: 'أطقم', image: img('1485462537746-965f33f7f6a7'), description: 'طقم كاجوال مريح لإطلالة يومية عملية وأنيقة.', status: '', sizes: clothingSizes(150) },

        // ===== بلايز =====
        { name: 'بلوزة ساتان ناعمة', brand: 'Trendyol', category: 'بلايز', image: img('1487222477894-8943e31ef7b2'), description: 'بلوزة ساتان بلمسة لامعة راقية تناسب المناسبات.', status: 'special', sizes: clothingSizes(95) },
        { name: 'قميص كاجوال قطني', brand: 'Mavi', category: 'بلايز', image: img('1487412720507-e7ab37603c6f'), description: 'قميص قطني بقصّة مريحة يصلح لكل الأوقات.', status: '', sizes: clothingSizes(80) },
        { name: 'بلوزة كروب عصرية', brand: 'Koton', category: 'بلايز', image: img('1502716119720-b23a93e5fe1b'), description: 'بلوزة كروب عصرية بتفاصيل مميزة وألوان جذابة.', status: '', sizes: clothingSizes(70) },

        // ===== بناطيل =====
        { name: 'بنطلون جينز عالي الخصر', brand: 'Mavi', category: 'بناطيل', image: img('1509631179647-0177331693ae'), description: 'جينز تركي عالي الخصر بقصّة سكيني مريحة.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'بنطلون قماش رسمي', brand: 'Boyner', category: 'بناطيل', image: img('1544022613-e87ca75a784a'), description: 'بنطلون قماش رسمي بقصّة مستقيمة أنيقة.', status: '', sizes: clothingSizes(120) },
        { name: 'بنطلون واسع كاجوال', brand: 'DeFacto', category: 'بناطيل', image: img('1554568218-0f1715e72254'), description: 'بنطلون واسع كاجوال بخامة مريحة وإطلالة عصرية.', status: 'special', sizes: clothingSizes(105) },

        // ===== تنانير =====
        { name: 'تنورة ميدي بليسيه', brand: 'Trendyol', category: 'تنانير', image: img('1541099649105-f69ad21f3246'), description: 'تنورة ميدي بطيّات بليسيه أنيقة وحركة انسيابية.', status: '', sizes: clothingSizes(115) },

        // ===== إكسسوارات =====
        { name: 'شنطة يد تركية', brand: 'Boyner', category: 'إكسسوارات', image: img('1483118714900-540cf339fd46'), description: 'شنطة يد أنيقة بتصميم تركي عملي وفاخر.', status: 'special', sizes: oneSize(90) },
        { name: 'شال حريري مطبوع', brand: 'Koton', category: 'إكسسوارات', image: img('1576995853123-5a10305d93c0'), description: 'شال حريري بطبعات راقية يكمّل إطلالتك.', status: '', sizes: oneSize(55) }
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
