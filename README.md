# RE-YA Retail Mini App

ระบบขายปลีกออนไลน์ผ่าน LINE Mini App สำหรับร้านขายยา RE-YA

## 🚀 ระบบที่สร้างเสร็จแล้ว

### Frontend (React + TypeScript + Vite)
- ✅ หน้าแรก (Home) - แสดงสินค้าแนะนำ โปรโมชั่น หมวดหมู่
- ✅ หน้าร้านค้า (Shop) - รายการสินค้าพร้อมกรองและค้นหา
- ✅ หน้ารายละเอียดสินค้า (Product Detail)
- ✅ หน้าตะกร้าสินค้า (Cart)
- ✅ หน้าชำระเงิน (Checkout)
- ✅ หน้าประวัติคำสั่งซื้อ (Orders)
- ✅ หน้าโปรไฟล์ (Profile)
- ✅ หน้าค้นหา (Search)

### Backend API (PHP + MySQL)
- ✅ `/api/products` - จัดการสินค้า
- ✅ `/api/categories` - จัดการหมวดหมู่
- ✅ `/api/cart` - จัดการตะกร้าสินค้า
- ✅ `/api/orders` - จัดการคำสั่งซื้อ
- ✅ `/api/auth` - ระบบล็อกอิน LINE
- ✅ `/api/banners` - จัดการแบนเนอร์
- ✅ `/api/promotions` - จัดการโปรโมชั่น

### Database Schema
- ✅ `retail_products` - ตารางสินค้า
- ✅ `retail_categories` - ตารางหมวดหมู่
- ✅ `retail_customers` - ตารางลูกค้า
- ✅ `retail_cart` - ตารางตะกร้า
- ✅ `retail_orders` - ตารางคำสั่งซื้อ
- ✅ `retail_order_items` - ตารางรายการสินค้าในคำสั่งซื้อ
- ✅ `retail_promotions` - ตารางโปรโมชั่น
- ✅ `retail_banners` - ตารางแบนเนอร์

## 📁 โครงสร้างโปรเจค

```
app/
├── api/                    # Backend PHP API
│   ├── config/
│   │   ├── database.php   # การเชื่อมต่อฐานข้อมูล
│   │   └── schema.sql     # โครงสร้างฐานข้อมูล
│   ├── endpoints/
│   │   ├── products.php   # API สินค้า
│   │   ├── categories.php # API หมวดหมู่
│   │   ├── cart.php       # API ตะกร้า
│   │   ├── orders.php     # API คำสั่งซื้อ
│   │   ├── auth.php       # API ล็อกอิน
│   │   ├── banners.php    # API แบนเนอร์
│   │   ├── promotions.php # API โปรโมชั่น
│   │   └── notifications.php # API แจ้งเตือน
│   ├── index.php          # API Router
│   └── .htaccess          # Apache Rewrite Rules
├── src/
│   ├── api/               # Frontend API Clients
│   ├── components/        # React Components
│   ├── pages/             # Page Components
│   ├── stores/            # Zustand Stores
│   ├── types/             # TypeScript Types
│   └── utils/             # Utility Functions
├── dist/                  # Build Output
└── package.json
```

## 🔧 การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าฐานข้อมูล MySQL
```bash
# สร้าง database และ import schema
mysql -u root -p < api/config/schema.sql
```

### 3. ตั้งค่า Environment
```bash
cp .env.example .env
# แก้ไขค่า VITE_API_URL และ VITE_LIFF_ID
```

### 4. Build Frontend
```bash
npm run build
```

### 5. Deploy
- Frontend: ไฟล์ใน `dist/` พร้อมใช้งาน
- Backend: โฟลเดอร์ `api/` ต้องอยู่บน PHP Server

## 🌐 URL ที่ Deploy แล้ว

- **Frontend**: https://wjalmozolvxnc.ok.kimi.link
- **API Health Check**: https://wjalmozolvxnc.ok.kimi.link/api/health

## 📋 API Endpoints

### Products
- `GET /api/products` - รายการสินค้า
- `GET /api/products/:sku` - รายละเอียดสินค้า
- `GET /api/products/featured` - สินค้าแนะนำ
- `GET /api/products/new-arrivals` - สินค้าใหม่
- `GET /api/products/best-sellers` - สินค้าขายดี
- `GET /api/products/search?q=xxx` - ค้นหาสินค้า

### Cart
- `GET /api/cart` - ดูตะกร้า
- `POST /api/cart/add` - เพิ่มสินค้า
- `PUT /api/cart/update` - อัพเดทจำนวน
- `DELETE /api/cart/remove/:sku` - ลบสินค้า
- `DELETE /api/cart/clear` - ล้างตะกร้า

### Orders
- `GET /api/orders` - รายการคำสั่งซื้อ
- `GET /api/orders/:orderNo` - รายละเอียดคำสั่งซื้อ
- `POST /api/orders` - สร้างคำสั่งซื้อ

### Auth
- `POST /api/auth/line-login` - LINE Login
- `GET /api/auth/profile` - ดูโปรไฟล์
- `PUT /api/auth/profile` - อัพเดทโปรไฟล์

## 🔐 การเชื่อมต่อกับ Odoo

ระบบนี้รองรับการ sync ข้อมูลสินค้าจาก Odoo ERP ผ่าน:
- `odoo_product_id` - ID สินค้าใน Odoo
- `last_sync_at` - เวลาที่ sync ล่าสุด

## 📝 หมายเหตุ

- ระบบใช้ LINE LIFF สำหรับการล็อกอิน
- รองรับการชำระเงินผ่าน PromptPay, โอนเงิน, COD
- มีระบบคูปองและส่วนลด
- รองรับการแจ้งเตือนผ่าน LINE
