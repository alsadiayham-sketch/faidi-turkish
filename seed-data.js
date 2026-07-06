// Seed data for Faidi Turkish
// Run via: window.seedFirestoreData(true)  (while logged into the admin so the API token is set)

window.seedFirestoreData = function(clearExisting) {
    var db = window.db;

    // Static first-frame posters for each product GIF (used for fast, no-stutter loading).
    var POSTERS = {
        "https://i.ibb.co/3mZFxVJ8/C4-yw1no-Kx-T-gif.gif": "https://i.ibb.co/k6PV0mq8/C4-yw1no-Kx-T-poster.jpg",
        "https://i.ibb.co/wFkn4sqf/Dab-Fk3-Pt-Qpq-gif.gif": "https://i.ibb.co/LzW8zS1C/Dab-Fk3-Pt-Qpq-poster.jpg",
        "https://i.ibb.co/FppXBQ9/Dab-HB3-JNEO8-gif.gif": "https://i.ibb.co/dxZDjBB/Dab-HB3-JNEO8-poster.jpg",
        "https://i.ibb.co/W4JXwtqY/Dab-Hnf7-N8-Nx-gif.gif": "https://i.ibb.co/1f1hCcYV/Dab-Hnf7-N8-Nx-poster.jpg",
        "https://i.ibb.co/gZqSBH9c/Dab-Iy-Fe-NIoq-gif.gif": "https://i.ibb.co/Zpw578yB/Dab-Iy-Fe-NIoq-poster.jpg",
        "https://i.ibb.co/RTCF2j30/Dab-Ko-VBt-LVW-gif.gif": "https://i.ibb.co/8nZDDFRp/Dab-Ko-VBt-LVW-poster.jpg",
        "https://i.ibb.co/YBpTxZY0/Dab-LWo-Tt8-P6-gif.gif": "https://i.ibb.co/GQLqJmdw/Dab-LWo-Tt8-P6-poster.jpg",
        "https://i.ibb.co/RG9cFbHH/Dadrb-Dk-N6-HL-gif.gif": "https://i.ibb.co/Fqft9zS4/Dadrb-Dk-N6-HL-poster.jpg",
        "https://i.ibb.co/pvpy2x01/Da-Fq41jt86-G-gif.gif": "https://i.ibb.co/8DPr1jdC/Da-Fq41jt86-G-poster.jpg",
        "https://i.ibb.co/gbscc0g5/Da-Fyi-Ij-NOw-F-gif.gif": "https://i.ibb.co/4wXJY2BC/Da-Fyi-Ij-NOw-F-poster.jpg",
        "https://i.ibb.co/R42mkXqH/Da-GWMwv-N-Xe-gif.gif": "https://i.ibb.co/GfmKfm55/Da-GWMwv-N-Xe-poster.jpg",
        "https://i.ibb.co/fYDxxqN5/Da-I3-Z5-DNo-Sk-gif.gif": "https://i.ibb.co/XxZxCww2/Da-I3-Z5-DNo-Sk-poster.jpg",
        "https://i.ibb.co/NgzmbCd2/Da-IDOvhtkji-gif.gif": "https://i.ibb.co/Q7gN5jJ5/Da-IDOvhtkji-poster.jpg",
        "https://i.ibb.co/QjYyfrHB/Da-Ioo84t9w-S-gif.gif": "https://i.ibb.co/bj6fy82y/Da-Ioo84t9w-S-poster.jpg",
        "https://i.ibb.co/Pswh2KVj/Da-JEu-G7-NXKa-gif.gif": "https://i.ibb.co/20y3p0jm/Da-JEu-G7-NXKa-poster.jpg",
        "https://i.ibb.co/xSXwKJrd/Da-LH-O-tx-Kz-gif.gif": "https://i.ibb.co/SD3HSJH0/Da-LH-O-tx-Kz-poster.jpg",
        "https://i.ibb.co/0pmVMHdQ/Da-N-Bo-Bt-EU0-gif.gif": "https://i.ibb.co/6cm9Ggqz/Da-N-Bo-Bt-EU0-poster.jpg",
        "https://i.ibb.co/nsrvn0Nk/Da-N4-Rq-Wt-i1-gif.gif": "https://i.ibb.co/DTxWGhm/Da-N4-Rq-Wt-i1-poster.jpg",
        "https://i.ibb.co/3ymWkd99/Da-Qm9au-Nn-UZ-gif.gif": "https://i.ibb.co/Hfpp9CTt/Da-Qm9au-Nn-UZ-poster.jpg",
        "https://i.ibb.co/fbXX2Fz/Da-Qt-Zg-Ot-Ltm-gif.gif": "https://i.ibb.co/tMPB7qKk/Da-Qt-Zg-Ot-Ltm-poster.jpg",
        "https://i.ibb.co/Psm3NCqf/Da-S3-Qitt-D69-gif.gif": "https://i.ibb.co/gMQTHpTJ/Da-S3-Qitt-D69-poster.jpg",
        "https://i.ibb.co/7xRfXc50/Da-Si-Pnrt7r5-gif.gif": "https://i.ibb.co/3mSvtgCQ/Da-Si-Pnrt7r5-poster.jpg",
        "https://i.ibb.co/PstgMZm6/Da-SRr-VJNvt-B-gif.gif": "https://i.ibb.co/hqR2JQV/Da-SRr-VJNvt-B-poster.jpg",
        "https://i.ibb.co/rRMRncfs/Da-Ves8rq6ey-gif.gif": "https://i.ibb.co/04PMdQ4/Da-Ves8rq6ey-poster.jpg"
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
        { name: 'فستان سهرة تركي مطرز', brand: 'Koton', category: 'فساتين', image: 'https://i.ibb.co/3mZFxVJ8/C4-yw1no-Kx-T-gif.gif', description: 'فستان سهرة تركي طويل بتطريز يدوي فاخر، مثالي للمناسبات.', status: 'bestseller', sizes: clothingSizes(240) },
        { name: 'فستان كاجوال صيفي', brand: 'LC Waikiki', category: 'فساتين', image: 'https://i.ibb.co/wFkn4sqf/Dab-Fk3-Pt-Qpq-gif.gif', description: 'فستان صيفي خفيف بقصّة أنيقة وخامة قطنية مريحة.', status: 'special', sizes: clothingSizes(150) },
        { name: 'فستان ميدي منقوش', brand: 'Trendyol', category: 'فساتين', image: 'https://i.ibb.co/FppXBQ9/Dab-HB3-JNEO8-gif.gif', description: 'فستان ميدي بنقشات تركية عصرية يناسب إطلالات النهار.', status: '', sizes: clothingSizes(175, [8, 0, 5, 3]) },
        { name: 'فستان سواريه ساتان', brand: 'Boyner', category: 'فساتين', image: 'https://i.ibb.co/W4JXwtqY/Dab-Hnf7-N8-Nx-gif.gif', description: 'فستان سواريه من الساتان الفاخر بلمسة راقية.', status: 'bestseller', sizes: clothingSizes(265) },
        { name: 'فستان يومي مريح', brand: 'DeFacto', category: 'فساتين', image: 'https://i.ibb.co/gZqSBH9c/Dab-Iy-Fe-NIoq-gif.gif', description: 'فستان يومي بقصّة واسعة وخامة ناعمة تدوم طويلاً.', status: '', sizes: clothingSizes(130) },
        { name: 'فستان زفاف ضيوف', brand: 'Koton', category: 'فساتين', image: 'https://i.ibb.co/RTCF2j30/Dab-Ko-VBt-LVW-gif.gif', description: 'فستان أنيق لحضور المناسبات والأعراس بتفاصيل مميزة.', status: 'special', sizes: clothingSizes(220) },

        // ===== سبورات =====
        { name: 'طقم سبور رياضي نسائي', brand: 'Mavi', category: 'سبورات', image: 'https://i.ibb.co/YBpTxZY0/Dab-LWo-Tt8-P6-gif.gif', description: 'طقم سبور تركي مريح للتمارين والإطلالات الكاجوال.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'ليقنز رياضي مطاطي', brand: 'LC Waikiki', category: 'سبورات', image: 'https://i.ibb.co/RG9cFbHH/Dadrb-Dk-N6-HL-gif.gif', description: 'ليقنز رياضي عالي الخصر بخامة مطاطية داعمة.', status: '', sizes: clothingSizes(90, [0, 4, 6, 2]) },
        { name: 'جاكيت رياضي بسحّاب', brand: 'DeFacto', category: 'سبورات', image: 'https://i.ibb.co/pvpy2x01/Da-Fq41jt86-G-gif.gif', description: 'جاكيت رياضي خفيف بسحّاب أمامي مناسب لكل الفصول.', status: 'special', sizes: clothingSizes(120) },
        { name: 'بلوزة رياضية قطنية', brand: 'Mavi', category: 'سبورات', image: 'https://i.ibb.co/gbscc0g5/Da-Fyi-Ij-NOw-F-gif.gif', description: 'بلوزة رياضية قطنية بقصّة عصرية ومريحة.', status: '', sizes: clothingSizes(85) },
        { name: 'بنطلون جوجر واسع', brand: 'Trendyol', category: 'سبورات', image: 'https://i.ibb.co/R42mkXqH/Da-GWMwv-N-Xe-gif.gif', description: 'بنطلون جوجر رياضي واسع بخامة ناعمة وأربطة قابلة للتعديل.', status: '', sizes: clothingSizes(110) },

        // ===== أطقم =====
        { name: 'طقم قطعتين أنيق', brand: 'Koton', category: 'أطقم', image: 'https://i.ibb.co/fYDxxqN5/Da-I3-Z5-DNo-Sk-gif.gif', description: 'طقم من قطعتين بتنسيق تركي عصري يناسب المناسبات.', status: 'bestseller', sizes: clothingSizes(210) },
        { name: 'طقم بليزر وبنطلون', brand: 'Boyner', category: 'أطقم', image: 'https://i.ibb.co/NgzmbCd2/Da-IDOvhtkji-gif.gif', description: 'طقم رسمي من بليزر وبنطلون بقصّة أنيقة.', status: 'special', sizes: clothingSizes(230) },
        { name: 'طقم صيفي مطبوع', brand: 'LC Waikiki', category: 'أطقم', image: 'https://i.ibb.co/QjYyfrHB/Da-Ioo84t9w-S-gif.gif', description: 'طقم صيفي بطبعات مبهجة وخامة خفيفة.', status: '', sizes: clothingSizes(160) },
        { name: 'طقم كاجوال يومي', brand: 'DeFacto', category: 'أطقم', image: 'https://i.ibb.co/Pswh2KVj/Da-JEu-G7-NXKa-gif.gif', description: 'طقم كاجوال مريح لإطلالة يومية عملية وأنيقة.', status: '', sizes: clothingSizes(150) },

        // ===== بلايز =====
        { name: 'بلوزة ساتان ناعمة', brand: 'Trendyol', category: 'بلايز', image: 'https://i.ibb.co/xSXwKJrd/Da-LH-O-tx-Kz-gif.gif', description: 'بلوزة ساتان بلمسة لامعة راقية تناسب المناسبات.', status: 'special', sizes: clothingSizes(95) },
        { name: 'قميص كاجوال قطني', brand: 'Mavi', category: 'بلايز', image: 'https://i.ibb.co/0pmVMHdQ/Da-N-Bo-Bt-EU0-gif.gif', description: 'قميص قطني بقصّة مريحة يصلح لكل الأوقات.', status: '', sizes: clothingSizes(80) },
        { name: 'بلوزة كروب عصرية', brand: 'Koton', category: 'بلايز', image: 'https://i.ibb.co/nsrvn0Nk/Da-N4-Rq-Wt-i1-gif.gif', description: 'بلوزة كروب عصرية بتفاصيل مميزة وألوان جذابة.', status: '', sizes: clothingSizes(70) },

        // ===== بناطيل =====
        { name: 'بنطلون جينز عالي الخصر', brand: 'Mavi', category: 'بناطيل', image: 'https://i.ibb.co/3ymWkd99/Da-Qm9au-Nn-UZ-gif.gif', description: 'جينز تركي عالي الخصر بقصّة سكيني مريحة.', status: 'bestseller', sizes: clothingSizes(140) },
        { name: 'بنطلون قماش رسمي', brand: 'Boyner', category: 'بناطيل', image: 'https://i.ibb.co/fbXX2Fz/Da-Qt-Zg-Ot-Ltm-gif.gif', description: 'بنطلون قماش رسمي بقصّة مستقيمة أنيقة.', status: '', sizes: clothingSizes(120) },
        { name: 'بنطلون واسع كاجوال', brand: 'DeFacto', category: 'بناطيل', image: 'https://i.ibb.co/Psm3NCqf/Da-S3-Qitt-D69-gif.gif', description: 'بنطلون واسع كاجوال بخامة مريحة وإطلالة عصرية.', status: 'special', sizes: clothingSizes(105) },

        // ===== تنانير =====
        { name: 'تنورة ميدي بليسيه', brand: 'Trendyol', category: 'تنانير', image: 'https://i.ibb.co/7xRfXc50/Da-Si-Pnrt7r5-gif.gif', description: 'تنورة ميدي بطيّات بليسيه أنيقة وحركة انسيابية.', status: '', sizes: clothingSizes(115) },

        // ===== إكسسوارات =====
        { name: 'شنطة يد تركية', brand: 'Boyner', category: 'إكسسوارات', image: 'https://i.ibb.co/PstgMZm6/Da-SRr-VJNvt-B-gif.gif', description: 'شنطة يد أنيقة بتصميم تركي عملي وفاخر.', status: 'special', sizes: oneSize(90, 0) },
        { name: 'شال حريري مطبوع', brand: 'Koton', category: 'إكسسوارات', image: 'https://i.ibb.co/rRMRncfs/Da-Ves8rq6ey-gif.gif', description: 'شال حريري بطبعات راقية يكمّل إطلالتك.', status: '', sizes: oneSize(55) }
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
