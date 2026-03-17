-- เพิ่ม foreign key constraints ทีหลัง
ALTER TABLE retail_order_items_temp 
ADD CONSTRAINT fk_order_id 
FOREIGN KEY (order_id) REFERENCES retail_orders(id) ON DELETE CASCADE;

ALTER TABLE retail_order_items_temp 
ADD CONSTRAINT fk_product_id 
FOREIGN KEY (product_id) REFERENCES retail_products(id) ON DELETE SET NULL;

-- เปลี่ยนชื่อตาราง
RENAME TABLE retail_order_items_temp TO retail_order_items;
