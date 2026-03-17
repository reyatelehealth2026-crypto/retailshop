
-- =====================================================
-- 1. ตารางสินค้าขายปลีก (เชื่อมโยงกับ Odoo)
-- =====================================================
CREATE TABLE retail_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    odoo_product_id INT UNIQUE COMMENT 'รหัสสินค้าจาก Odoo',
    sku VARCHAR(100) NOT NULL UNIQUE COMMENT 'รหัสสินค้า',
    name VARCHAR(500) NOT NULL COMMENT 'ชื่อสินค้า',
    name_en VARCHAR(500) COMMENT 'ชื่อสินค้าภาษาอังกฤษ',
    description TEXT COMMENT 'รายละเอียดสินค้า',
    short_description VARCHAR(500) COMMENT 'รายละเอียดสั้น',
    
    -- ราคา
    retail_price DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'ราคาขายปลีก',
    original_price DECIMAL(12, 2) DEFAULT 0 COMMENT 'ราคาปกติ (สำหรับแสดงส่วนลด)',
    member_price DECIMAL(12, 2) DEFAULT 0 COMMENT 'ราคาสมาชิก',
    
    -- สต็อก
    stock_qty DECIMAL(10, 2) DEFAULT 0 COMMENT 'จำนวนสต็อก',
    stock_status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock' COMMENT 'สถานะสต็อก',
    low_stock_threshold DECIMAL(10, 2) DEFAULT 10 COMMENT 'เกณฑ์สต็อกต่ำ',
    
    -- รูปภาพ
    image_url VARCHAR(500) COMMENT 'รูปภาพหลัก',
    image_gallery JSON COMMENT 'แกลเลอรี่รูปภาพ',
    
    -- หมวดหมู่
    category_id INT COMMENT 'รหัสหมวดหมู่หลัก',
    subcategory_id INT COMMENT 'รหัสหมวดหมู่ย่อย',
    tags JSON COMMENT 'แท็กสินค้า',
    
    -- ข้อมูลยา
    is_medicine TINYINT(1) DEFAULT 0 COMMENT 'เป็นยาหรือไม่',
    drug_type ENUM('general', 'dangerous', 'special') DEFAULT 'general' COMMENT 'ประเภทยา',
    dosage VARCHAR(500) COMMENT 'วิธีใช้',
    side_effects TEXT COMMENT 'ผลข้างเคียง',
    warnings TEXT COMMENT 'คำเตือน',
    
    -- การแสดงผล
    is_retail_active TINYINT(1) DEFAULT 1 COMMENT 'เปิดขายปลีก',
    is_featured TINYINT(1) DEFAULT 0 COMMENT 'สินค้าแนะนำ',
    is_new TINYINT(1) DEFAULT 0 COMMENT 'สินค้าใหม่',
    is_bestseller TINYINT(1) DEFAULT 0 COMMENT 'สินค้าขายดี',
    display_order INT DEFAULT 0 COMMENT 'ลำดับการแสดงผล',
    
    -- SEO
    meta_title VARCHAR(200) COMMENT 'Meta Title',
    meta_description VARCHAR(500) COMMENT 'Meta Description',
    slug VARCHAR(200) UNIQUE COMMENT 'URL slug',
    
    -- สถิติ
    view_count INT DEFAULT 0 COMMENT 'จำนวนการดู',
    sold_count INT DEFAULT 0 COMMENT 'จำนวนที่ขายได้',
    rating DECIMAL(2, 1) DEFAULT 5.0 COMMENT 'คะแนนรีวิว',
    review_count INT DEFAULT 0 COMMENT 'จำนวนรีวิว',
    
    -- การซิงค์กับ Odoo
    last_sync_at TIMESTAMP NULL COMMENT 'ซิงค์ล่าสุด',
    sync_status ENUM('synced', 'pending', 'error') DEFAULT 'synced' COMMENT 'สถานะการซิงค์',
    
    -- โปรโมชั่น
    promotion_label VARCHAR(100) COMMENT 'ป้ายโปรโมชั่น',
    promotion_end_date DATETIME COMMENT 'วันหมดโปรโมชั่น',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Soft delete',
    
    INDEX idx_category (category_id),
    INDEX idx_active (is_retail_active),
    INDEX idx_featured (is_featured),
    INDEX idx_stock (stock_status),
    INDEX idx_price (retail_price),
    INDEX idx_sync (last_sync_at),
    FULLTEXT idx_search (name, description, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสินค้าขายปลีก';

-- =====================================================
-- 2. ตารางหมวดหมู่สินค้า
-- =====================================================
CREATE TABLE retail_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    odoo_category_id INT UNIQUE COMMENT 'รหัสหมวดหมู่จาก Odoo',
    name VARCHAR(200) NOT NULL COMMENT 'ชื่อหมวดหมู่',
    name_en VARCHAR(200) COMMENT 'ชื่อภาษาอังกฤษ',
    description TEXT COMMENT 'รายละเอียด',
    
    -- โครงสร้างแบบ Tree
    parent_id INT DEFAULT NULL COMMENT 'หมวดหมู่แม่',
    level INT DEFAULT 0 COMMENT 'ระดับ',
    path VARCHAR(500) COMMENT 'เส้นทาง',
    
    -- รูปภาพ
    icon VARCHAR(500) COMMENT 'ไอคอน',
    image_url VARCHAR(500) COMMENT 'รูปภาพ',
    
    -- การแสดงผล
    is_active TINYINT(1) DEFAULT 1 COMMENT 'เปิดใช้งาน',
    display_order INT DEFAULT 0 COMMENT 'ลำดับการแสดงผล',
    show_in_menu TINYINT(1) DEFAULT 1 COMMENT 'แสดงในเมนู',
    
    -- SEO
    slug VARCHAR(200) UNIQUE COMMENT 'URL slug',
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- สถิติ
    product_count INT DEFAULT 0 COMMENT 'จำนวนสินค้า',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active),
    INDEX idx_order (display_order),
    FOREIGN KEY (parent_id) REFERENCES retail_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางหมวดหมู่สินค้า';

-- =====================================================
-- 3. ตารางผู้ใช้/ลูกค้า
-- =====================================================
CREATE TABLE retail_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_user_id VARCHAR(100) UNIQUE NOT NULL COMMENT 'LINE User ID',
    line_display_name VARCHAR(200) COMMENT 'ชื่อแสดงใน LINE',
    line_picture_url VARCHAR(500) COMMENT 'รูปโปรไฟล์ LINE',
    line_status_message TEXT COMMENT 'สถานะ LINE',
    
    -- ข้อมูลส่วนตัว
    first_name VARCHAR(100) COMMENT 'ชื่อ',
    last_name VARCHAR(100) COMMENT 'นามสกุล',
    phone VARCHAR(20) COMMENT 'เบอร์โทร',
    email VARCHAR(200) COMMENT 'อีเมล',
    
    -- ที่อยู่
    address TEXT COMMENT 'ที่อยู่',
    province VARCHAR(100) COMMENT 'จังหวัด',
    district VARCHAR(100) COMMENT 'อำเภอ/เขต',
    subdistrict VARCHAR(100) COMMENT 'ตำบล/แขวง',
    postal_code VARCHAR(10) COMMENT 'รหัสไปรษณีย์',
    
    -- สมาชิก
    member_code VARCHAR(50) UNIQUE COMMENT 'รหัสสมาชิก',
    member_tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze' COMMENT 'ระดับสมาชิก',
    member_points INT DEFAULT 0 COMMENT 'คะแนนสะสม',
    member_since DATE COMMENT 'วันที่เป็นสมาชิก',
    
    -- Odoo Integration
    odoo_partner_id INT COMMENT 'รหัส Partner ใน Odoo',
    
    -- สถานะ
    is_active TINYINT(1) DEFAULT 1,
    is_verified TINYINT(1) DEFAULT 0,
    
    -- Metadata
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_line (line_user_id),
    INDEX idx_member (member_code),
    INDEX idx_tier (member_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผู้ใช้/ลูกค้า';

-- =====================================================
-- 4. ตารางตะกร้าสินค้า
-- =====================================================
CREATE TABLE retail_cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'รหัสผู้ใช้',
    product_id INT NOT NULL COMMENT 'รหัสสินค้า',
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1 COMMENT 'จำนวน',
    unit_price DECIMAL(12, 2) NOT NULL COMMENT 'ราคาต่อหน่วย',
    
    -- โน้ตพิเศษ
    notes TEXT COMMENT 'หมายเหตุ',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_product (product_id),
    UNIQUE KEY unique_user_product (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES retail_users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES retail_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางตะกร้าสินค้า';

-- =====================================================
-- 5. ตารางคำสั่งซื้อ
-- =====================================================
CREATE TABLE retail_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'เลขที่คำสั่งซื้อ',
    user_id INT NOT NULL COMMENT 'รหัสผู้ใช้',
    
    -- ข้อมูลการชำระเงิน
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'ราคารวมก่อนส่วนลด',
    discount_amount DECIMAL(12, 2) DEFAULT 0 COMMENT 'ส่วนลด',
    discount_code VARCHAR(50) COMMENT 'รหัสคูปอง',
    shipping_fee DECIMAL(12, 2) DEFAULT 0 COMMENT 'ค่าจัดส่ง',
    tax_amount DECIMAL(12, 2) DEFAULT 0 COMMENT 'ภาษี',
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'ยอดรวม',
    
    -- สถานะ
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT 'สถานะคำสั่งซื้อ',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT 'สถานะการชำระเงิน',
    payment_method ENUM('credit_card', 'bank_transfer', 'promptpay', 'cash_on_delivery', 'line_pay') COMMENT 'วิธีการชำระเงิน',
    
    -- ที่อยู่จัดส่ง
    shipping_name VARCHAR(200) COMMENT 'ชื่อผู้รับ',
    shipping_phone VARCHAR(20) COMMENT 'เบอร์โทรผู้รับ',
    shipping_address TEXT COMMENT 'ที่อยู่จัดส่ง',
    shipping_province VARCHAR(100),
    shipping_district VARCHAR(100),
    shipping_subdistrict VARCHAR(100),
    shipping_postal_code VARCHAR(10),
    
    -- ข้อมูลจัดส่ง
    shipping_method VARCHAR(100) COMMENT 'วิธีจัดส่ง',
    tracking_number VARCHAR(100) COMMENT 'เลขพัสดุ',
    shipped_at TIMESTAMP NULL COMMENT 'วันที่จัดส่ง',
    delivered_at TIMESTAMP NULL COMMENT 'วันที่ส่งถึง',
    
    -- หมายเหตุ
    customer_notes TEXT COMMENT 'หมายเหตุจากลูกค้า',
    admin_notes TEXT COMMENT 'หมายเหตุจากแอดมิน',
    
    -- Odoo Integration
    odoo_order_id INT COMMENT 'รหัสคำสั่งซื้อใน Odoo',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    cancelled_reason TEXT,
    
    INDEX idx_order_number (order_number),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_payment (payment_status),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES retail_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางคำสั่งซื้อ';

-- =====================================================
-- 6. ตารางรายการสินค้าในคำสั่งซื้อ
-- =====================================================
CREATE TABLE retail_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT 'รหัสคำสั่งซื้อ',
    product_id INT NOT NULL COMMENT 'รหัสสินค้า',
    
    -- ข้อมูลสินค้า (snapshot)
    sku VARCHAR(100) NOT NULL COMMENT 'รหัสสินค้า',
    product_name VARCHAR(500) NOT NULL COMMENT 'ชื่อสินค้า',
    product_image VARCHAR(500) COMMENT 'รูปภาพสินค้า',
    
    -- ราคา
    unit_price DECIMAL(12, 2) NOT NULL COMMENT 'ราคาต่อหน่วย',
    quantity DECIMAL(10, 2) NOT NULL COMMENT 'จำนวน',
    total_price DECIMAL(12, 2) NOT NULL COMMENT 'ราคารวม',
    
    -- ส่วนลด
    discount_amount DECIMAL(12, 2) DEFAULT 0 COMMENT 'ส่วนลด',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order (order_id),
    INDEX idx_product (product_id),
    FOREIGN KEY (order_id) REFERENCES retail_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES retail_products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางรายการสินค้าในคำสั่งซื้อ';

-- =====================================================
-- 7. ตารางประวัติสถานะคำสั่งซื้อ
-- =====================================================
CREATE TABLE retail_order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL COMMENT 'รหัสคำสั่งซื้อ',
    status_from VARCHAR(50) COMMENT 'สถานะเดิม',
    status_to VARCHAR(50) NOT NULL COMMENT 'สถานะใหม่',
    notes TEXT COMMENT 'หมายเหตุ',
    created_by INT COMMENT 'ผู้ดำเนินการ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order (order_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (order_id) REFERENCES retail_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางประวัติสถานะคำสั่งซื้อ';

-- =====================================================
-- 8. ตารางโปรโมชั่น/คูปอง
-- =====================================================
CREATE TABLE retail_promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'รหัสคูปอง',
    name VARCHAR(200) NOT NULL COMMENT 'ชื่อโปรโมชั่น',
    description TEXT COMMENT 'รายละเอียด',
    
    -- ประเภทส่วนลด
    discount_type ENUM('percentage', 'fixed_amount', 'free_shipping') NOT NULL COMMENT 'ประเภทส่วนลด',
    discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'มูลค่าส่วนลด',
    max_discount DECIMAL(12, 2) COMMENT 'ส่วนลดสูงสุด',
    min_purchase DECIMAL(12, 2) DEFAULT 0 COMMENT 'ยอดซื้อขั้นต่ำ',
    
    -- ระยะเวลา
    start_date DATETIME NOT NULL COMMENT 'วันเริ่มต้น',
    end_date DATETIME NOT NULL COMMENT 'วันสิ้นสุด',
    
    -- จำกัดการใช้
    usage_limit INT COMMENT 'จำกัดจำนวนใช้',
    usage_count INT DEFAULT 0 COMMENT 'จำนวนที่ใช้ไป',
    per_user_limit INT DEFAULT 1 COMMENT 'จำกัดต่อผู้ใช้',
    
    -- ขอบเขต
    applicable_products JSON COMMENT 'สินค้าที่ใช้ได้',
    applicable_categories JSON COMMENT 'หมวดหมู่ที่ใช้ได้',
    excluded_products JSON COMMENT 'สินค้าที่ исключить',
    
    -- สถานะ
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางโปรโมชั่น/คูปอง';

-- =====================================================
-- 9. ตารางแบนเนอร์
-- =====================================================
CREATE TABLE retail_banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) COMMENT 'ชื่อแบนเนอร์',
    subtitle VARCHAR(500) COMMENT 'คำบรรยาย',
    
    -- รูปภาพ
    image_url VARCHAR(500) NOT NULL COMMENT 'รูปภาพ Desktop',
    image_mobile_url VARCHAR(500) COMMENT 'รูปภาพ Mobile',
    
    -- ลิงก์
    link_url VARCHAR(500) COMMENT 'ลิงก์',
    link_type ENUM('product', 'category', 'page', 'external') DEFAULT 'page' COMMENT 'ประเภทลิงก์',
    link_target VARCHAR(100) COMMENT 'เป้าหมายลิงก์',
    
    -- การแสดงผล
    position ENUM('home_top', 'home_middle', 'home_bottom', 'category_page', 'product_page') DEFAULT 'home_top' COMMENT 'ตำแหน่ง',
    display_order INT DEFAULT 0 COMMENT 'ลำดับ',
    
    -- ระยะเวลา
    start_date DATETIME,
    end_date DATETIME,
    
    -- สถานะ
    is_active TINYINT(1) DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_position (position),
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางแบนเนอร์';

-- =====================================================
-- 10. ตารางการตั้งค่าระบบ
-- =====================================================
CREATE TABLE retail_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'ชื่อการตั้งค่า',
    setting_value TEXT COMMENT 'ค่าการตั้งค่า',
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT 'ประเภท',
    description VARCHAR(500) COMMENT 'รายละเอียด',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางการตั้งค่าระบบ';

-- =====================================================
-- Insert Default Data
-- =====================================================

-- หมวดหมู่เริ่มต้น
INSERT INTO retail_categories (name, name_en, slug, display_order, show_in_menu) VALUES
('ยารักษาโรค', 'Medicines', 'medicines', 1, 1),
('วิตามินและอาหารเสริม', 'Vitamins & Supplements', 'vitamins-supplements', 2, 1),
('ผลิตภัณฑ์ดูแลสุขภาพ', 'Health Care', 'health-care', 3, 1),
('ผลิตภัณฑ์ความงาม', 'Beauty', 'beauty', 4, 1),
('อุปกรณ์การแพทย์', 'Medical Devices', 'medical-devices', 5, 1),
('สินค้าสำหรับเด็ก', 'Baby Products', 'baby-products', 6, 1),
('สินค้าอื่นๆ', 'Others', 'others', 99, 1);

-- การตั้งค่าเริ่มต้น
INSERT INTO retail_settings (setting_key, setting_value, setting_type, description) VALUES
('store_name', 'RE-YA Pharmacy', 'string', 'ชื่อร้านค้า'),
('store_phone', '02-xxx-xxxx', 'string', 'เบอร์โทรร้านค้า'),
('free_shipping_threshold', '499', 'number', 'ยอดซื้อขั้นต่ำสำหรับส่งฟรี'),
('default_shipping_fee', '50', 'number', 'ค่าจัดส่งเริ่มต้น'),
('tax_rate', '7', 'number', 'อัตราภาษี (%)'),
('points_per_baht', '1', 'number', 'คะแนนต่อ 1 บาท'),
('min_order_amount', '0', 'number', 'ยอดสั่งซื้อขั้นต่ำ'),
('order_notification_email', 'orders@re-ya.com', 'string', 'อีเมลแจ้งเตือนคำสั่งซื้อ');

-- แบนเนอร์เริ่มต้น
INSERT INTO retail_banners (title, subtitle, image_url, link_url, position, display_order, is_active) VALUES
('โปรโมชั่นพิเศษ', 'ลดสูงสุด 50% สำหรับสินค้าลดราคา', '/images/banners/promo1.jpg', '/shop?filter=promotion', 'home_top', 1, 1),
('สินค้าใหม่', 'พบกับสินค้าใหม่ล่าสุด', '/images/banners/new-arrival.jpg', '/shop?filter=new', 'home_top', 2, 1),
('สมาชิกรับสิทธิพิเศษ', 'สะสมคะแนนแลกส่วนลด', '/images/banners/member.jpg', '/profile', 'home_middle', 1, 1);
