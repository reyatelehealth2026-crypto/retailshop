-- สร้างตาราง retail_order_items
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
