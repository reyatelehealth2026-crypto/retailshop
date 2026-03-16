-- =====================================================
-- Retail Mini App Database Schema
-- ฐานข้อมูลระบบขายปลีก Re-Ya Pharmacy
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS zrismpsz_cny2 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE zrismpsz_cny2;

-- =====================================================
-- Table: retail_products
-- ข้อมูลสินค้าขายปลีก (sync จาก Odoo)
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    odoo_product_id INT UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    name_en VARCHAR(500),
    description TEXT,
    short_description VARCHAR(500),
    
    -- Pricing
    retail_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    original_price DECIMAL(12, 2) DEFAULT 0,
    member_price DECIMAL(12, 2) DEFAULT 0,
    
    -- Inventory
    stock_qty DECIMAL(10, 2) DEFAULT 0,
    stock_status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',
    low_stock_threshold DECIMAL(10, 2) DEFAULT 10,
    
    -- Category
    category_id INT,
    category_name VARCHAR(200),
    subcategory_id INT,
    subcategory_name VARCHAR(200),
    
    -- Images
    image_url VARCHAR(500),
    image_gallery JSON,
    
    -- Product details
    brand VARCHAR(200),
    manufacturer VARCHAR(200),
    country_of_origin VARCHAR(100),
    
    -- Medical/Pharmacy specific
    is_prescription_required TINYINT(1) DEFAULT 0,
    drug_classification ENUM('general', 'dangerous', 'special_control', 'hormone') DEFAULT 'general',
    dosage VARCHAR(500),
    warnings TEXT,
    side_effects TEXT,
    
    -- Flags
    is_retail_active TINYINT(1) DEFAULT 1,
    is_featured TINYINT(1) DEFAULT 0,
    is_new_arrival TINYINT(1) DEFAULT 0,
    is_best_seller TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    
    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    keywords VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_sku (sku),
    INDEX idx_category (category_id),
    INDEX idx_active (is_retail_active),
    INDEX idx_featured (is_featured),
    INDEX idx_stock_status (stock_status),
    FULLTEXT idx_search (name, description, keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_categories
-- หมวดหมู่สินค้า
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    odoo_category_id INT UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description TEXT,
    image_url VARCHAR(500),
    icon VARCHAR(100),
    parent_id INT DEFAULT NULL,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_customers
-- ข้อมูลลูกค้าขายปลีก
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_user_id VARCHAR(100) UNIQUE NOT NULL,
    line_display_name VARCHAR(200),
    line_picture_url VARCHAR(500),
    line_status_message TEXT,
    odoo_partner_id INT,
    odoo_partner_code VARCHAR(100),
    odoo_linked_at TIMESTAMP NULL,
    
    -- Profile
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(200),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    
    -- Member
    member_code VARCHAR(50) UNIQUE,
    member_tier ENUM('standard', 'silver', 'gold', 'platinum') DEFAULT 'standard',
    member_points INT DEFAULT 0,
    member_since DATE,
    
    -- Address
    default_address_id INT,
    
    -- Status
    is_active TINYINT(1) DEFAULT 1,
    is_verified TINYINT(1) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    INDEX idx_line_user (line_user_id),
    INDEX idx_member_code (member_code),
    INDEX idx_phone (phone),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_customer_addresses
-- ที่อยู่ลูกค้า
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_customer_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_type ENUM('home', 'work', 'other') DEFAULT 'home',
    is_default TINYINT(1) DEFAULT 0,
    
    -- Address details
    recipient_name VARCHAR(200),
    recipient_phone VARCHAR(20),
    address_line1 VARCHAR(500) NOT NULL,
    address_line2 VARCHAR(500),
    province VARCHAR(100),
    district VARCHAR(100),
    subdistrict VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Delivery instructions
    delivery_note TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES retail_customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_cart
-- ตะกร้าสินค้า
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES retail_customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_sku (customer_id, sku),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_orders
-- คำสั่งซื้อ
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    odoo_order_id INT,
    odoo_order_ref VARCHAR(100),
    odoo_sync_status ENUM('pending', 'synced', 'error') DEFAULT 'pending',
    odoo_sync_error TEXT,
    
    -- Order status
    status ENUM('pending', 'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_fee DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Discount/Promotion
    coupon_code VARCHAR(50),
    discount_type ENUM('percentage', 'fixed', 'shipping') DEFAULT NULL,
    discount_value DECIMAL(12, 2) DEFAULT 0,
    
    -- Shipping
    shipping_method VARCHAR(100),
    tracking_no VARCHAR(100),
    shipping_provider VARCHAR(100),
    
    -- Delivery address
    delivery_name VARCHAR(200),
    delivery_phone VARCHAR(20),
    delivery_address TEXT,
    delivery_province VARCHAR(100),
    delivery_postal_code VARCHAR(10),
    delivery_note TEXT,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_reference VARCHAR(200),
    payment_slip_path VARCHAR(500),
    paid_at TIMESTAMP NULL,
    payment_slip_uploaded_at TIMESTAMP NULL,
    
    -- Notes
    customer_note TEXT,
    admin_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    
    FOREIGN KEY (customer_id) REFERENCES retail_customers(id),
    INDEX idx_order_no (order_no),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_order_items
-- รายการสินค้าในคำสั่งซื้อ
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    product_image VARCHAR(500),
    
    -- Pricing at time of order
    unit_price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    quantity INT NOT NULL,
    
    -- Calculated
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES retail_orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_order_status_history
-- ประวัติสถานะคำสั่งซื้อ
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status_from VARCHAR(50),
    status_to VARCHAR(50) NOT NULL,
    note TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES retail_orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_promotions
-- โปรโมชั่นและส่วนลด
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Promotion type
    type ENUM('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'bundle') NOT NULL,
    
    -- Values
    discount_value DECIMAL(12, 2),
    min_purchase_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount_amount DECIMAL(12, 2),
    
    -- Usage limits
    usage_limit INT,
    usage_count INT DEFAULT 0,
    per_customer_limit INT DEFAULT 1,
    
    -- Validity
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    
    -- Scope
    applicable_products JSON,
    applicable_categories JSON,
    excluded_products JSON,
    
    -- Status
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_banners
-- แบนเนอร์โฆษณา
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    subtitle VARCHAR(500),
    image_url VARCHAR(500) NOT NULL,
    mobile_image_url VARCHAR(500),
    
    -- Link
    link_url VARCHAR(500),
    link_type ENUM('product', 'category', 'page', 'external') DEFAULT 'page',
    link_target VARCHAR(100),
    
    -- Display
    position ENUM('home_hero', 'home_promo', 'category_top', 'product_detail') DEFAULT 'home_hero',
    sort_order INT DEFAULT 0,
    
    -- Validity
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    
    -- Status
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_position (position),
    INDEX idx_active (is_active),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: retail_notifications
-- การแจ้งเตือน
-- =====================================================
CREATE TABLE IF NOT EXISTS retail_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    
    -- Notification content
    type ENUM('order', 'promotion', 'system', 'reminder') DEFAULT 'system',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    image_url VARCHAR(500),
    
    -- Action
    action_type VARCHAR(50),
    action_data JSON,
    
    -- Status
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES retail_customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Insert Sample Data
-- =====================================================

-- Sample Categories
INSERT INTO retail_categories (name, name_en, icon, sort_order) VALUES
('ยาบรรเทาอาการทั่วไป', 'General Relief', 'pill', 1),
('วิตามินและอาหารเสริม', 'Vitamins & Supplements', 'heart', 2),
('ผลิตภัณฑ์ดูแลผิว', 'Skincare', 'sparkles', 3),
('อุปกรณ์การแพทย์', 'Medical Devices', 'stethoscope', 4),
('ผลิตภัณฑ์สำหรับเด็ก', 'Baby Products', 'baby', 5),
('อาหารและเครื่องดื่มเพื่อสุขภาพ', 'Health Food & Drinks', 'apple', 6);

-- Sample Products
INSERT INTO retail_products (
    sku, name, description, short_description, retail_price, original_price, 
    stock_qty, category_id, category_name, image_url, is_retail_active, is_featured
) VALUES
(
    'PARA500-10',
    'ยาพาราเซตามอล 500 มก. (แผง 10 เม็ด)',
    'ยาบรรเทาปวด ลดไข้ สำหรับอาการปวดศีรษะ ปวดฟัน ปวดประจำเดือน ลดไข้',
    'ยาบรรเทาปวด ลดไข้',
    35.00, 50.00, 150, 1, 'ยาบรรเทาอาการทั่วไป',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 1, 1
),
(
    'VITC1000-30',
    'วิตามินซี 1000 มก. (30 เม็ด)',
    'วิตามินซีเข้มข้น บำรุงภูมิคุ้มกัน ผิวกระจ่างใส',
    'วิตามินซีเข้มข้น บำรุงภูมิคุ้มกัน',
    189.00, 250.00, 80, 2, 'วิตามินและอาหารเสริม',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', 1, 1
),
(
    'CETIR10-10',
    'ยาซิติริซีน 10 มก. (แผง 10 เม็ด)',
    'ยาแก้แพ้ ลดน้ำมูก จาม คันตา คันจมูก',
    'ยาแก้แพ้ ลดน้ำมูก จาม',
    45.00, 65.00, 200, 1, 'ยาบรรเทาอาการทั่วไป',
    'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400', 1, 0
),
(
    'OMEP20-14',
    'ยาออเมพราโซล 20 มก. (14 แคปซูล)',
    'ยารักษาโรคกรดไหลย้อน แก้ท้องอืด ท้องเฟ้อ',
    'ยารักษาโรคกรดไหลย้อน',
    125.00, 180.00, 60, 1, 'ยาบรรเทาอาการทั่วไป',
    'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400', 1, 0
),
(
    'COLLAGEN-30',
    'คอลลาเจนเปปไทด์ (30 ซอง)',
    'คอลลาเจนบำรุงผิว ลดริ้วรอย ผิวเต่งตึง กระจ่างใส',
    'คอลลาเจนบำรุงผิว',
    399.00, 590.00, 45, 2, 'วิตามินและอาหารเสริม',
    'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400', 1, 1
),
(
    'THERMOMETER-DIG',
    'เครื่องวัดไข้ดิจิตอล',
    'เครื่องวัดไข้ดิจิตอล วัดได้รวดเร็ว แม่นยำ ภายใน 10 วินาที',
    'เครื่องวัดไข้ดิจิตอล',
    299.00, 450.00, 30, 4, 'อุปกรณ์การแพทย์',
    'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400', 1, 0
),
(
    'MASK-50',
    'หน้ากากอนามัย 3 ชั้น (กล่อง 50 ชิ้น)',
    'หน้ากากอนามัยคุณภาพสูง กรองฝุ่น แบคทีเรีย 3 ชั้น',
    'หน้ากากอนามัย 3 ชั้น',
    89.00, 150.00, 500, 4, 'อุปกรณ์การแพทย์',
    'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=400', 1, 0
),
(
    'CLEANSER-AC',
    'โฟมล้างหน้าสำหรับผิวแพ้ง่าย',
    'โฟมล้างหน้าอ่อนโยน ไม่มีฟอง สำหรับผิวแพ้ง่าย ผิวเป็นสิว',
    'โฟมล้างหน้าสำหรับผิวแพ้ง่าย',
    245.00, 350.00, 40, 3, 'ผลิตภัณฑ์ดูแลผิว',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 1, 1
);

-- Sample Banners
INSERT INTO retail_banners (title, subtitle, image_url, link_url, link_type, position, sort_order) VALUES
(
    'สุขภาพดี เริ่มต้นที่นี่',
    'สินค้าสุขภาพคุณภาพ ราคาพิเศษ',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    '/shop',
    'page',
    'home_hero',
    1
),
(
    'วิตามินลดสูงสุด 40%',
    'บำรุงร่างกาย สร้างภูมิคุ้มกัน',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800',
    '/shop?category=vitamins',
    'page',
    'home_hero',
    2
),
(
    'ส่งฟรีทุกออเดอร์',
    'เมื่อซื้อครบ 499 บาท',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
    '/shop',
    'page',
    'home_promo',
    1
);

-- Sample Promotions
INSERT INTO retail_promotions (code, name, description, type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date) VALUES
(
    'WELCOME20',
    'ส่วนลดต้อนรับลูกค้าใหม่',
    'รับส่วนลด 20% สำหรับการสั่งซื้อครั้งแรก',
    'percentage',
    20,
    0,
    200,
    1000,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 3 MONTH)
),
(
    'FREESHIP',
    'ส่งฟรีไม่มีขั้นต่ำ',
    'ส่งฟรีทุกออเดอร์ ไม่มีขั้นต่ำ',
    'free_shipping',
    0,
    0,
    50,
    500,
    NOW(),
    DATE_ADD(NOW(), INTERVAL 1 MONTH)
);
