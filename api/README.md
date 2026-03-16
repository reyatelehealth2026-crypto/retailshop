# RE-YA Retail API

API สำหรับระบบขายปลีกออนไลน์ผ่าน LINE Mini App

## ภาพรวม

Backend API สำหรับระบบขายปลีกออนไลน์ สร้างด้วย PHP + MySQL เชื่อมต่อกับ Frontend React Application

## โครงสร้างโฟลเดอร์

```
api/
├── config/
│   └── database.php      # การตั้งค่าฐานข้อมูล
├── database/
│   ├── schema.sql        # โครงสร้างตาราง
│   └── seed.sql          # ข้อมูลตัวอย่าง
├── products/
│   ├── index.php         # GET /api/products
│   └── detail.php        # GET /api/products/detail
├── categories/
│   └── index.php         # GET /api/categories
├── cart/
│   └── index.php         # Cart API (GET, POST, PUT, DELETE)
├── orders/
│   └── index.php         # Orders API (GET, POST)
├── auth/
│   └── line-login.php    # LINE Login
├── banners/
│   └── index.php         # Banners API
├── .htaccess             # Apache Configuration
└── index.php             # API Root
```

## การติดตั้ง

### 1. สร้างฐานข้อมูล

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. ตั้งค่าการเชื่อมต่อฐานข้อมูล

แก้ไขไฟล์ `config/database.php` หรือตั้งค่า Environment Variables:

```bash
export DB_HOST=localhost
export DB_NAME=reya_retail
export DB_USER=your_username
export DB_PASS=your_password
```

### 3. ตั้งค่า Apache/Nginx

ตั้งค่า Document Root ให้ชี้ไปที่โฟลเดอร์ `app/` และตั้งค่า API path ให้ชี้ไปที่ `app/api/`

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | ดึงรายการสินค้า |
| GET | `/api/products?category={id}` | กรองตามหมวดหมู่ |
| GET | `/api/products?search={query}` | ค้นหาสินค้า |
| GET | `/api/products?filter=promotion` | สินค้าลดราคา |
| GET | `/api/products/detail.php?sku={sku}` | รายละเอียดสินค้า |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | ดึงรายการหมวดหมู่ |
| GET | `/api/categories?with_products=true` | รวมสินค้าในหมวดหมู่ |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | ดึงข้อมูลตะกร้า |
| POST | `/api/cart` | เพิ่มสินค้าในตะกร้า |
| PUT | `/api/cart` | อัพเดทจำนวนสินค้า |
| DELETE | `/api/cart` | ลบสินค้าออกจากตะกร้า |

**Headers Required:**
- `Authorization: Bearer {line_user_id}`

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | ดึงรายการคำสั่งซื้อ |
| GET | `/api/orders?order_no={order_no}` | รายละเอียดคำสั่งซื้อ |
| POST | `/api/orders` | สร้างคำสั่งซื้อใหม่ |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/line-login.php` | เข้าสู่ระบบด้วย LINE |

### Banners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banners` | ดึงรายการแบนเนอร์ |
| GET | `/api/banners?position=home_top` | กรองตามตำแหน่ง |

## Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## การเชื่อมต่อกับ Odoo

ระบบนี้ออกแบบให้เชื่อมต่อกับ Odoo ERP ผ่าน:

1. **Product Sync**: ซิงค์ข้อมูลสินค้าจาก Odoo มายัง `retail_products`
2. **Order Sync**: ส่งคำสั่งซื้อจากระบบขายปลีกไปยัง Odoo
3. **Customer Sync**: ซิงค์ข้อมูลลูกค้ากับ Odoo Partner

## ความปลอดภัย

- ใช้ PDO Prepared Statements ป้องกัน SQL Injection
- CORS Headers สำหรับ Cross-Origin Requests
- ตรวจสอบสิทธิ์ผู้ใช้ผ่าน LINE User ID

## License

Private - RE-YA Telepharmacy
