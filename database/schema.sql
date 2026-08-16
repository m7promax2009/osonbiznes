-- ============================================
-- ⚠️ DEPRECATED / ISHLATILMAYDI ⚠️
-- Bu PostgreSQL sxemasi ESKI. Ilova hozir MongoDB + Mongoose ishlatadi
-- (backend/src/models/*.js). Bu fayl deploy'da ham, kodda ham ishlatilmaydi
-- va real ma'lumot modeliga ZID. Faqat tarixiy ma'lumot uchun saqlangan.
-- Ma'lumot modeli uchun backend/src/models/ ga qarang.
-- ============================================
-- OsonBiznes - PostgreSQL Database Schema (LEGACY)
-- ============================================

-- Foydalanuvchilar
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    business_name VARCHAR(100),
    tariff VARCHAR(20) DEFAULT 'free', -- free, start, pro, business
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mahsulotlar
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 3,
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, low, out, archived
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kategoriyalar
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#10b981',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mijozlar
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    notes TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    rating INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buyurtmalar
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_number VARCHAR(20) UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, cancelled
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid, refunded
    payment_method VARCHAR(20), -- cash, card, click, payme
    source VARCHAR(20) DEFAULT 'manual', -- manual, telegram, website, pos
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hisob-fakturalar
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telegram foydalanuvchilari
CREATE TABLE IF NOT EXISTS telegram_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_subscribed BOOLEAN DEFAULT true,
    last_interaction TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sotuv (POS) sessiyalari
CREATE TABLE IF NOT EXISTS pos_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'open', -- open, closed
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- Tarif rejalari
CREATE TABLE IF NOT EXISTS tariffs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- free, start, pro, business
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    max_products INTEGER,
    max_customers INTEGER,
    max_users INTEGER,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true
);

-- Indekslar
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_telegram_users_chat_id ON telegram_users(chat_id);

-- Tariflarni kiritish
INSERT INTO tariffs (name, price_monthly, price_yearly, max_products, max_customers, max_users, features) VALUES
('free', 0, 0, 10, 30, 1, '["max_products_10", "max_customers_30", "basic_reports", "telegram_bot"]'),
('start', 99000, 990000, 50, 100, 2, '["max_products_50", "max_customers_100", "advanced_reports", "telegram_bot", "export_excel", "pos"]'),
('pro', 199000, 1990000, 200, 500, 5, '["max_products_200", "max_customers_500", "advanced_reports", "telegram_bot", "export_excel", "pos", "invoices", "api_access", "priority_support"]'),
('business', 499000, 4990000, -1, -1, -1, '["unlimited_products", "unlimited_customers", "unlimited_users", "all_features", "dedicated_manager", "custom_integrations", "sla"]')
ON CONFLICT (name) DO NOTHING;
