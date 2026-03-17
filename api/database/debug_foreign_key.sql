-- ตรวจสอง retail_products ด้วย
DESCRIBE retail_products;

-- ถ้า primary key types ตรงกัน ลองสร้างตารางโดยไม่มี foreign key ก่อน
CREATE TABLE retail_order_items_temp (
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
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางรายการสินค้าในคำสั่งซื้อ';
