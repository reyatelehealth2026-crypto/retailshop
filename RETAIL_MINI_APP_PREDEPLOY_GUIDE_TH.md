# คู่มือก่อนอัปขึ้นจริง Retail Mini App

เอกสารนี้สรุปว่า **ก่อนอัประบบขึ้น production** คุณต้องแก้ไฟล์ไหนบ้าง, ต้องตั้งค่าอะไรบ้าง, และต้องตรวจอะไรให้ครบ เพื่อให้ Frontend, PHP API, LINE LIFF และ Odoo ทำงานร่วมกันได้ถูกต้อง

# โครงสร้างระบบที่ต้องเข้าใจก่อน

ระบบนี้แยกเป็น 2 ส่วนหลัก

- **Frontend**
  - อยู่ที่ `app/`
  - ใช้ React + Vite
  - เป้าหมาย deploy คือ Vercel

- **Backend API**
  - อยู่ที่ `app/api/`
  - ใช้ PHP
  - เป้าหมาย deploy คือ shared hosting / PHP hosting

- **Database**
  - ฐานข้อมูลเป้าหมายคือ `zrismpsz_cny2`

# สิ่งที่ต้องแก้ก่อนอัปจริง

ให้เช็กตามหัวข้อนี้ทีละข้อ

- **[1] Frontend environment**
- **[2] Backend environment**
- **[3] Database schema**
- **[4] LINE LIFF / LINE Login / LINE Messaging**
- **[5] Odoo API / Sync / Webhook**
- **[6] Deploy และ validation ก่อนปล่อยใช้งาน**

---

# 1) Frontend: ต้องแก้ตรงไหนบ้าง

## 1.1 ไฟล์ที่ต้องแก้

- **ไฟล์จริงที่ต้องสร้าง/แก้**: `app/.env`
- **ไฟล์ตัวอย่าง**: `app/.env.example`

## 1.2 ค่าที่ต้องมีใน `app/.env`

อ้างอิงจากโค้ด frontend ตอนนี้ ต้องมีอย่างน้อยดังนี้

```env
VITE_API_URL=https://your-retail-api.example.com/api
VITE_LIFF_ID=your_liff_id_here
VITE_APP_NAME=RE-YA Retail
VITE_APP_VERSION=1.0.0
```

## 1.3 ความหมายของค่าแต่ละตัว

- **`VITE_API_URL`**
  - URL ของ PHP API ที่ frontend จะเรียกใช้งานจริง
  - ต้องชี้ไปที่ path ของ `app/api`
  - ตัวอย่าง
    - `https://cny.re-ya.com/app/api`
    - `https://your-domain.com/retail/api`

- **`VITE_LIFF_ID`**
  - LIFF ID ของ LINE Mini App
  - ถ้าไม่ใส่ คำสั่ง login ผ่าน LIFF จะใช้ไม่ได้

- **`VITE_APP_NAME`**
  - ชื่อแอปที่แสดงฝั่ง frontend

- **`VITE_APP_VERSION`**
  - version ของ frontend

## 1.4 ตัวอย่างค่าที่แนะนำ

```env
VITE_API_URL=https://cny.re-ya.com/app/api
VITE_LIFF_ID=200xxxxxxx-xxxxxxxx
VITE_APP_NAME=RE-YA Retail Mini App
VITE_APP_VERSION=1.0.0
```

## 1.5 ถ้า deploy บน Vercel ต้องตั้งที่ไหนเพิ่ม

นอกจากไฟล์ `.env` ในเครื่องแล้ว ควรตั้งค่า env ซ้ำใน Vercel ด้วยที่

- **Project Settings > Environment Variables**

ตัวที่ต้องตั้งคือ

- **`VITE_API_URL`**
- **`VITE_LIFF_ID`**
- **`VITE_APP_NAME`**
- **`VITE_APP_VERSION`**

## 1.6 ไฟล์ frontend ที่ปกติไม่ต้องแก้

- **`app/vercel.json`**
  - ใช้ rewrite route ทั้งหมดไป `index.html`
  - ปกติไม่ต้องแก้ ถ้ายัง deploy แบบ SPA บน Vercel

- **`app/vite.config.ts`**
  - ตั้งค่าเหมาะกับ Vercel แล้ว
  - ปกติไม่ต้องแก้

---

# 2) Backend PHP: ต้องแก้ตรงไหนบ้าง

Backend ฝั่ง PHP อ่านค่าจาก `getenv()` เป็นหลัก ดังนั้นค่าจริงควรตั้งใน environment ของ server

## 2.1 ไฟล์อ้างอิงหลัก

- **`app/api/config/database.php`**
- **`app/api/classes/OdooRetailClient.php`**
- **`app/api/classes/LineNotifier.php`**
- **`app/api/endpoints/auth.php`**
- **`app/api/endpoints/orders.php`**

## 2.2 ค่าฐานข้อมูลที่ต้องตั้ง

อ้างอิงจาก `app/api/config/database.php`

- **`DB_HOST`**
- **`DB_NAME`**
- **`DB_USER`**
- **`DB_PASS`**

ค่าปัจจุบันในระบบมี fallback เป็น

- `DB_HOST=localhost`
- `DB_NAME=zrismpsz_cny2`
- `DB_USER=zrismpsz_cny2`

แต่ก่อนอัปจริงให้ใช้ค่าจริงของ shared hosting

ตัวอย่าง

```env
DB_HOST=localhost
DB_NAME=zrismpsz_cny2
DB_USER=zrismpsz_cny2
DB_PASS=your_real_db_password
```

## 2.3 ค่า auth token ที่ต้องตั้ง

- **`AUTH_TOKEN_SECRET`**

ตัวนี้ใช้ sign token ของระบบ login

คำแนะนำ

- ใช้ข้อความสุ่มยาว ๆ
- ห้ามใช้ค่าเดาง่าย
- ห้ามปล่อยว่างใน production

ตัวอย่าง

```env
AUTH_TOKEN_SECRET=replace_with_a_long_random_secret_value
```

## 2.4 ค่า CORS ที่ต้องตั้ง

อ้างอิงจาก `app/api/config/database.php`

- **`APP_ALLOWED_ORIGINS`**
- **`APP_ALLOW_ALL_ORIGINS`**

ตัวอย่าง production

```env
APP_ALLOWED_ORIGINS=https://your-project.vercel.app,https://retail.yourdomain.com
APP_ALLOW_ALL_ORIGINS=false
```

คำแนะนำ

- อย่าตั้ง `APP_ALLOW_ALL_ORIGINS=true` ใน production ถ้าไม่จำเป็น
- ถ้ามีหลายโดเมนให้คั่นด้วย comma
- ระบบรองรับโดเมน `.vercel.app` อยู่แล้ว แต่ก็ควรใส่โดเมนจริงไว้ด้วย

## 2.5 ค่า sync และ webhook ที่ต้องตั้ง

อ้างอิงจาก `app/api/config/database.php`

- **`RETAIL_SYNC_TOKEN`**
- **`ODOO_WEBHOOK_SECRET`**

ตัวอย่าง

```env
RETAIL_SYNC_TOKEN=replace_with_sync_secret
ODOO_WEBHOOK_SECRET=replace_with_webhook_secret
```

ใช้ดังนี้

- `RETAIL_SYNC_TOKEN` ใช้ป้องกัน endpoint sync สินค้า
- `ODOO_WEBHOOK_SECRET` ใช้ป้องกัน endpoint webhook ที่ Odoo เรียกกลับมา

---

# 3) Odoo: ต้องแก้ค่าอะไรบ้าง

อ้างอิงจาก `app/api/classes/OdooRetailClient.php`

## 3.1 ค่าเชื่อม Odoo API

- **`ODOO_API_BASE_URL`**
- **`CNY_ODOO_API_USER`**
- **`CNY_ODOO_USER_TOKEN`**
- **`ODOO_API_TIMEOUT`**

ตัวอย่าง

```env
ODOO_API_BASE_URL=https://cny.re-ya.com/reya
CNY_ODOO_API_USER=your_odoo_api_user
CNY_ODOO_USER_TOKEN=your_odoo_user_token
ODOO_API_TIMEOUT=30
```

## 3.2 ค่า partner fallback

อ้างอิงจาก `app/api/endpoints/orders.php`

- **`ODOO_DEFAULT_PARTNER_ID`**
- **`ODOO_DEFAULT_PARTNER_CODE`**

ตัวอย่าง

```env
ODOO_DEFAULT_PARTNER_ID=12345
ODOO_DEFAULT_PARTNER_CODE=CUSTOMER_DEFAULT
```

ใช้ในกรณีที่ลูกค้าใน mini app ยังไม่มี partner mapping ฝั่ง Odoo

---

# 4) LINE: ต้องแก้อะไรบ้าง

## 4.1 LINE LIFF / LINE Login

อ้างอิงจาก

- frontend: `app/.env`
- backend verify: `app/api/endpoints/auth.php`

ค่าที่ต้องมี

- **Frontend**
  - `VITE_LIFF_ID`

- **Backend**
  - `LINE_LOGIN_CHANNEL_ID`
  - หรือ `LINE_CHANNEL_ID`

ตัวอย่าง

```env
LINE_LOGIN_CHANNEL_ID=200xxxxxxx
```

หมายเหตุ

- backend ใช้ channel id นี้ในการ verify LINE ID token
- frontend และ backend ต้องอยู่ใน LINE app ชุดที่ถูกต้องคู่กัน

## 4.2 LINE Messaging API

อ้างอิงจาก `app/api/classes/LineNotifier.php`

ค่าที่ต้องมี

- **`LINE_CHANNEL_ACCESS_TOKEN`**

ตัวอย่าง

```env
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
```

ถ้าไม่ใส่

- ระบบหลักยังทำงานได้บางส่วน
- แต่การ push notification หลังสร้าง order หรืออัปสลิปจะไม่สมบูรณ์

---

# 5) Database: ต้องอัปเดตอะไรบ้าง

## 5.1 ไฟล์ schema ที่ต้องใช้

- **`app/api/config/schema.sql`**

## 5.2 สิ่งที่ต้องตรวจในฐานข้อมูล production

ก่อนอัปจริงให้แน่ใจว่า database production ใช้ schema ล่าสุด โดยเฉพาะส่วนที่เกี่ยวกับงานรอบนี้

- **สถานะคำสั่งซื้อ `pending_payment` ต้องมีอยู่จริง**
  - อยู่ใน enum/status ของตาราง `retail_orders`

- **ฟิลด์เกี่ยวกับสลิปต้องมีอยู่จริง**
  - `payment_reference`
  - `payment_slip_path`
  - `payment_slip_uploaded_at`

- **ฟิลด์ Odoo ต้องมีอยู่จริง**
  - เช่นข้อมูลอ้างอิง order / product / customer ที่ sync กับ Odoo

- **ตาราง history / notification ต้องพร้อมใช้งาน**
  - เพราะระบบจะบันทึกสถานะและแจ้งเตือนเมื่อสร้าง order หรืออัปสลิป

## 5.3 ชื่อฐานข้อมูลที่ต้องใช้

ให้ใช้ฐานข้อมูล

- **`zrismpsz_cny2`**

ถ้ายังมีเอกสารเก่าที่อ้างถึง `reya_retail` ให้ยึดค่าปัจจุบันในโค้ดเป็นหลัก

---

# 6) Upload สลิป: ต้องตรวจอะไรบ้าง

อ้างอิงจาก `app/api/endpoints/payment.php`

## 6.1 สิ่งที่ backend ต้องทำได้

- เขียนไฟล์ลงโฟลเดอร์ upload ได้
- สร้าง path ประเภท `/uploads/slips/...` ได้
- web server ต้องมีสิทธิ์เขียนไฟล์ในตำแหน่งจริง

## 6.2 สิ่งที่ต้องเช็กบน hosting

- มีโฟลเดอร์สำหรับเก็บไฟล์สลิปจริง
- PHP process เขียนไฟล์ได้
- path ที่เสิร์ฟรูปออกเว็บสอดคล้องกับ path ที่บันทึกลง DB

## 6.3 หลังอัปสลิปแล้วควรเกิดอะไร

- order เปลี่ยนสถานะเป็น **`pending_payment`**
- บันทึก `payment_reference`
- บันทึก `payment_slip_path`
- บันทึก `payment_slip_uploaded_at`
- เพิ่มรายการใน order status history

---

# 7) Deploy Frontend บน Vercel

## 7.1 ก่อน deploy

ให้ตรวจว่าใน `app/` build ผ่านแล้ว

คำสั่ง

```bash
npm ci
npm run build
```

## 7.2 ถ้าจะรัน local dev

ให้ใช้ script ตัวเล็ก

```bash
npm run dev
```

ไม่ใช่

```bash
npm run DEV
npm run dec
```

## 7.3 ค่า env บน Vercel ที่ต้องใส่

- **`VITE_API_URL`**
- **`VITE_LIFF_ID`**
- **`VITE_APP_NAME`**
- **`VITE_APP_VERSION`**

## 7.4 หลัง deploy ต้องทดสอบ

- เปิดเว็บได้ปกติ
- refresh หน้า route ย่อยแล้วไม่ 404
- login ผ่าน LIFF ได้
- เรียก API จริงได้

---

# 8) Deploy Backend PHP

## 8.1 สิ่งที่ต้องอัปขึ้น server

อัปโฟลเดอร์ `app/api/` ขึ้น shared hosting ให้ครบ

## 8.2 สิ่งที่ต้องตั้งค่าใน server

- environment variables ทั้งหมดที่กล่าวไว้ข้างบน
- database production ต้องพร้อม
- web server ต้องยิงเข้า `app/api/index.php` ได้ตาม path ที่ frontend เรียก

## 8.3 Endpoint สำคัญที่ควรตรวจหลังอัป

- **Auth**
  - login ด้วย LIFF แล้ว backend ออก token ได้

- **Products**
  - ดึงรายการสินค้าได้
  - sync สินค้าจาก Odoo ได้

- **Orders**
  - สร้าง order ได้
  - order ใหม่ push ไป Odoo ได้

- **Payment**
  - อัปสลิปได้
  - สถานะเป็น `pending_payment`

- **Webhook**
  - Odoo callback เข้าได้ด้วย token ที่ถูกต้อง

---

# 9) Checklist ก่อนอัปจริง

## 9.1 Frontend checklist

- **สร้างไฟล์ `app/.env` แล้ว**
- **ตั้ง `VITE_API_URL` เป็น URL production แล้ว**
- **ตั้ง `VITE_LIFF_ID` แล้ว**
- **`npm run build` ผ่านแล้ว**
- **ตั้ง env ซ้ำใน Vercel แล้ว**

## 9.2 Backend checklist

- **ตั้ง `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` แล้ว**
- **ตั้ง `AUTH_TOKEN_SECRET` แล้ว**
- **ตั้ง `APP_ALLOWED_ORIGINS` แล้ว**
- **ตั้ง `RETAIL_SYNC_TOKEN` แล้ว**
- **ตั้ง `ODOO_WEBHOOK_SECRET` แล้ว**
- **ตั้ง Odoo credentials แล้ว**
- **ตั้ง LINE credentials แล้ว**
- **server เขียนไฟล์ upload ได้แล้ว**

## 9.3 Database checklist

- **ใช้ฐาน `zrismpsz_cny2` แล้ว**
- **schema ล่าสุดถูก apply แล้ว**
- **มี status `pending_payment` แล้ว**
- **ฟิลด์ payment slip พร้อมแล้ว**

## 9.4 Integration checklist

- **LIFF login ใช้งานได้จริง**
- **profile user ดึงได้จริง**
- **สร้าง order ได้จริง**
- **push order ไป Odoo ได้จริง**
- **upload slip ได้จริง**
- **webhook จาก Odoo เข้าได้จริง**
- **LINE notification ส่งได้จริง**

---

# 10) จุดที่ควรระวัง

- **อย่าใช้เอกสารเก่าที่อ้าง DB ชื่อ `reya_retail`**
  - ตอนนี้โค้ดปัจจุบันใช้ `zrismpsz_cny2`

- **อย่าปล่อยค่า secret ว่างใน production**
  - โดยเฉพาะ `AUTH_TOKEN_SECRET`, `RETAIL_SYNC_TOKEN`, `ODOO_WEBHOOK_SECRET`

- **อย่าตั้ง CORS กว้างเกินจำเป็น**
  - ถ้าไม่จำเป็นอย่าใช้ `APP_ALLOW_ALL_ORIGINS=true`

- **อย่าลืมตั้ง LINE ฝั่ง backend และ frontend ให้เป็นชุดเดียวกัน**
  - `VITE_LIFF_ID` และ `LINE_LOGIN_CHANNEL_ID` ต้องสัมพันธ์กัน

- **อย่าลืมสิทธิ์เขียนไฟล์ upload**
  - ไม่อย่างนั้นอัปสลิปไม่ผ่านแม้ API อื่นจะทำงานปกติ

---

# 11) สรุปสั้นที่สุดว่าต้องแก้อะไร

ถ้าจะสรุปแบบสั้นมาก ก่อนอัปจริงคุณต้องทำอย่างน้อยนี้

- **แก้ `app/.env`**
  - ใส่ `VITE_API_URL`
  - ใส่ `VITE_LIFF_ID`

- **ตั้ง env ให้ PHP server**
  - DB
  - JWT secret
  - CORS
  - Odoo credentials
  - LINE credentials
  - sync/webhook secret

- **อัปเดตฐานข้อมูล production ให้เป็น schema ล่าสุด**
  - โดยเฉพาะ `pending_payment` และฟิลด์ payment slip

- **เช็กสิทธิ์ upload ไฟล์บน hosting**

- **build frontend ให้ผ่าน แล้วค่อย deploy ขึ้น Vercel**

- **ทดสอบ flow จริงครบ**
  - login
  - ดูสินค้า
  - สร้าง order
  - อัปสลิป
  - sync Odoo
  - webhook

หากต้องการ คู่มือต่อไปที่ควรทำคือ

- **คู่มือ deploy แบบ step-by-step สำหรับ shared hosting + Vercel**
- **ตัวอย่าง `.env` production แบบกรอกค่าได้เลย**
- **checklist หลังอัปจริงสำหรับทดสอบทีละ endpoint**
