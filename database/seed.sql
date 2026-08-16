-- ⚠️ DEPRECATED / ISHLATILMAYDI — ilova MongoDB ishlatadi (Postgres emas).
-- Demo ma'lumotlar backend/src/config/db.js dagi seedDemoData() orqali avtomatik yaratiladi.
-- OsonBiznes - Seed ma'lumotlar (LEGACY, Postgres)

-- Demo foydalanuvchi (parol: demo123)
INSERT INTO users (name, email, password, phone, business_name, tariff)
VALUES (
    'Aziz Tadbirkor',
    'demo@osonbiznes.uz',
    '$2a$10$YourHashedPasswordHere',
    '+998 90 123 45 67',
    'Aziz Electronics',
    'pro'
) ON CONFLICT (email) DO NOTHING;

-- Mahsulotlar (user_id = 1)
INSERT INTO products (user_id, name, category, price, cost_price, stock, status, sku) VALUES
(1, 'iPhone 15 Pro 128GB', 'Smartfonlar', 12500000, 10500000, 15, 'active', 'APL-IP15P-128'),
(1, 'Samsung Galaxy A55', 'Smartfonlar', 5800000, 4800000, 8, 'active', 'SAM-A55-256'),
(1, 'Xiaomi Redmi Note 13', 'Smartfonlar', 3200000, 2600000, 3, 'low', 'XIA-RN13-128'),
(1, 'AirPods Pro 2', 'Aksessuarlar', 2800000, 2200000, 0, 'out', 'APL-AIRP2'),
(1, 'MacBook Air M3', 'Noutbuklar', 18500000, 15800000, 5, 'active', 'APL-MBA-M3'),
(1, 'Samsung Galaxy Watch 6', 'Aksessuarlar', 4200000, 3500000, 12, 'active', 'SAM-GW6'),
(1, 'HP LaserJet Pro', 'Ofis', 3500000, 2800000, 2, 'low', 'HP-LJP-400');

-- Kategoriyalar
INSERT INTO categories (user_id, name, description, color) VALUES
(1, 'Smartfonlar', 'Mobil telefonlar va smartfonlar', '#3b82f6'),
(1, 'Noutbuklar', 'Noutbuk va kompyuterlar', '#8b5cf6'),
(1, 'Aksessuarlar', 'Telefon aksessuarlari va gadjetlar', '#f59e0b'),
(1, 'Ofis', 'Ofis jihozlari va buyumlari', '#10b981');

-- Mijozlar
INSERT INTO customers (user_id, name, phone, email, city, tags, total_orders, total_spent, rating) VALUES
(1, 'Alisher Karimov', '+998 90 123 45 67', 'alisher@mail.uz', 'Toshkent', '{VIP,Doimiy}', 12, 45000000, 5),
(1, 'Dilshod Rahimov', '+998 91 234 56 78', 'dilshod@mail.uz', 'Samarqand', '{Doimiy}', 8, 28000000, 4),
(1, 'Malika Umarova', '+998 93 345 67 89', 'malika@mail.uz', 'Toshkent', '{VIP,Biznes}', 15, 62000000, 5),
(1, 'Jasur Toshmatov', '+998 94 456 78 90', 'jasur@mail.uz', 'Farg''ona', '{Yangi}', 3, 9500000, 3),
(1, 'Gulnora Akbarova', '+998 95 567 89 01', 'gulnora@mail.uz', 'Toshkent', '{Doimiy}', 7, 21000000, 4),
(1, 'Rustam Bekmurodov', '+998 97 678 90 12', 'rustam@mail.uz', 'Buxoro', '{VIP,Biznes,Doimiy}', 20, 85000000, 5);
