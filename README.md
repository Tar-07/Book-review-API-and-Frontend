# 📚 คู่มือการพัฒนาและสถาปัตยกรรมระบบ Book Review Application

เอกสารนี้รวบรวมรายละเอียดภาพรวมระบบ สถาปัตยกรรม **ขั้นตอนการติดตั้งเมื่อโคลนโปรเจกต์ลงเครื่องใหม่หรือแตกไฟล์ ZIP** ตลอดจน **จุดที่ต้องแก้ไขหากต้องการปรับเปลี่ยน Database, UI Frontend หรือ API การเชื่อมต่อระหว่างหน้าบ้านและหลังบ้าน**

---

## 🏗️ 1. ภาพรวมโครงสร้างโปรเจกต์ (Project Structure)

```text
book-review-api/
├── backend/                  # ส่วนจัดการเซิร์ฟเวอร์, API และฐานข้อมูล
│   ├── prisma/
│   │   ├── schema.prisma     # 🗄️ กำหนดโครงสร้าง Table / Model ของฐานข้อมูล
│   │   └── dev.db            # ไฟล์ฐานข้อมูล SQLite
│   ├── uploads/              # โฟลเดอร์เก็บไฟล์รูปภาพที่ผู้ใช้อัปโหลดเข้ามา
│   ├── index.js              # ⚙️ เซิร์ฟเวอร์ Express, จุดตั้งค่า Multer, CORS และ API Endpoints
│   ├── package.json          # รายการ Dependencies (express, cors, multer, prisma)
│   └── .env                  # DATABASE_URL="file:./dev.db"
│
├── frontend/                 # ส่วนหน้าเว็บ พัฒนาด้วย Next.js (App Router) + Tailwind CSS
│   ├── app/
│   │   ├── page.tsx          # 🎨 หน้าจอหลัก UI, State, Form และฟังก์ชัน Fetch ข้อมูลจาก Backend
│   │   ├── layout.tsx        # โครงสร้าง Layout หลักและ Metadata ของเว็บ
│   │   └── globals.css       # การตั้งค่า CSS และ Tailwind
│   ├── .env.local            # NEXT_PUBLIC_API_URL=http://localhost:3000
│   └── package.json          # รายการ Dependencies ของ Next.js
│
└── README.md                 # เอกสารคู่มือฉบับนี้
```

---

## 🚀 2. ขั้นตอนการติดตั้งและรันระบบเมื่อโคลนลงเครื่องใหม่ (Setup Guide for New Machine)

เมื่อทำการโคลนโปรเจกต์จาก Git หรือแตกไฟล์ ZIP ในเครื่องใหม่ โฟลเดอร์ `node_modules` จะไม่มีอยู่ ต้องทำการติดตั้ง Dependencies และสร้าง Prisma Client ตามลำดับนี้:

### 🔹 ฝั่ง Backend (Terminal ที่ 1)
เปิด Terminal หน้าต่างแรก แล้วเข้าไปที่โฟลเดอร์ `backend`:
```bash
cd backend

# 1. ติดตั้ง Library ทั้งหมดของ Backend (express, cors, multer, prisma)
npm install

# 2. สร้างไฟล์ .env จาก .env.example (ถ้ายังไม่มีไฟล์ .env)
# Windows (PowerShell / Command Prompt):
copy .env.example .env
# macOS / Linux:
# cp .env.example .env

# 3. ทำการ Generate Prisma Client เพื่อให้อ่าน Schema ล่าสุด
npx prisma generate

# 4. เริ่มต้นรัน Backend Server
node index.js
```
* **ผลลัพธ์:** เซิร์ฟเวอร์จะขึ้นข้อความ `Server is running at http://localhost:3000`
* สามารถทดสอบเข้าดูข้อมูล API ได้ที่: `http://localhost:3000/books`
* สามารถเข้าดูและทดสอบ API ผ่าน **Swagger UI** ได้ที่: `http://localhost:3000/api-docs`

---

### 🔹 ฝั่ง Frontend (Terminal ที่ 2)
เปิด Terminal หน้าต่างที่สองขึ้นมาควบคู่กัน แล้วเข้าไปที่โฟลเดอร์ `frontend`:
```bash
cd frontend

# 1. ติดตั้ง Library ทั้งหมดของ Next.js และ Tailwind CSS
npm install

# 2. สร้างไฟล์ .env.local จาก .env.example (ถ้ายังไม่มีไฟล์ .env.local)
# Windows (PowerShell / Command Prompt):
copy .env.example .env.local
# macOS / Linux:
# cp .env.example .env.local

# 3. เริ่มต้นรัน Dev Server ของหน้าเว็บ
npm run dev
```
* **ผลลัพธ์:** หน้าเว็บจะพร้อมทำงานที่ `http://localhost:3001` (หรือ `http://localhost:3000` หากไม่มีพอร์ตชน)

---

### 🌐 เข้าใช้งานระบบผ่านเบราว์เซอร์
เปิด Browser แล้วเข้าไปที่:
👉 **`http://localhost:3001`**

---

## 🛠️ 3. แนวทางการแก้ไขระบบแต่ละส่วน (How-To Guide)

หากต้องการปรับแต่งระบบ เพิ่มฟิลด์ หรือเปลี่ยนหน้าตา UI ให้ดูตามหัวข้อด้านล่างนี้ได้เลย:

---

### 🗄️ ส่วนที่ 1: การแก้ไขรูปแบบ Database (DB Schema & Fields)

ถ้าต้องการ **เพิ่มฟิลด์ใหม่** (เช่น เพิ่ม `price` ราคาสินค้า, `category` หมวดหมู่) หรือ **เปลี่ยนประเภทฐานข้อมูล** (เช่น ย้ายจาก SQLite ไปเป็น PostgreSQL หรือ MySQL):

#### 1. ไฟล์ที่ต้องแก้ไข: `backend/prisma/schema.prisma`
* ตัวอย่างการเพิ่มฟิลด์ `price` และ `category`:
  ```prisma
  model Book {
    id          Int      @id @default(autoincrement())
    title       String
    author      String
    price       Float?   // 👈 เพิ่มฟิลด์ใหม่ (Nullable)
    category    String?  // 👈 เพิ่มฟิลด์หมวดหมู่
    publishedAt DateTime @default(now())
    coverUrl    String?
    reviews     Review[]
  }
  ```
* หากต้องการเปลี่ยนเป็น PostgreSQL ให้แก้ตรง `datasource db`:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```

#### 2. คำสั่งที่ต้องรันหลังแก้ schema.prisma:
ทุกครั้งที่มีการเปลี่ยนโครงสร้าง Database ใน Prisma ต้องรันคำสั่ง Migration หรือ Generate ใหม่:
```bash
cd backend
npx prisma db push        # เพื่ออัปเดตตารางเข้าฐานข้อมูลทันที
npx prisma generate       # เพื่ออัปเดต Prisma Client ให้รู้จักฟิลด์ใหม่
```

#### 3. จุดต่อเนื่องที่ต้องปรับในโค้ด:
* **ใน `backend/index.js`:** เพิ่มฟิลด์ใหม่ใน `app.post('/books')` และ `app.put('/books/:id')` เพื่อให้รองรับการรับค่าและบันทึก
* **ใน `frontend/app/page.tsx`:** เพิ่มฟิลด์ลงใน `interface Book` และเพิ่มช่อง Input ใน Form รับข้อมูล

---

### 🔗 ส่วนที่ 2: การแก้ไขส่วนเชื่อมโยง API หน้าบ้านกับหลังบ้าน (API Communication)

จุดที่หน้าบ้าน (Frontend) ใช้เชื่อมต่อกับหลังบ้าน (Backend) มีดังนี้:

#### 1. ไฟล์ตั้งค่า URL ปลายทาง: `frontend/.env.local`
* หากเปลี่ยน Port หลังบ้าน หรือนำ Backend ไป Deploy ขึ้นคลาวด์ ให้แก้ URL ที่นี่:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3000
  ```

#### 2. ไฟล์กำหนด Endpoints ของหลังบ้าน: `backend/index.js`
* รายการ Endpoints ที่มีอยู่ในปัจจุบัน:
  * `POST /upload` : รับไฟล์ผ่าน FormData คีย์ `"file"` ส่งกลับ `{ url: "http://..." }`
  * `POST /books` : รับ JSON `{ title, author, coverUrl }` บันทึกหนังสือใหม่
  * `GET /books` : ส่งออกรายการหนังสือทั้งหมดพร้อม array `reviews`
  * `GET /books/:id` : ส่งออกหนังสือรายเล่ม
  * `PUT /books/:id` : แก้ไขข้อมูลหนังสือ
  * `DELETE /books/:id` : ลบหนังสือ (ลบรีวิวที่เกี่ยวข้องก่อนอัตโนมัติ)
  * `POST /books/:id/reviews` : รับ JSON `{ rating, content }` เพิ่มรีวิวให้หนังสือ

#### 3. ไฟล์การเรียกใช้ Fetch ในหน้าบ้าน: `frontend/app/page.tsx`
* ค้นหาตำแหน่งฟังก์ชันต่อไปนี้เพื่อปรับแก้ Logic การยิง API:
  * `fetchBooks()` : ฟังก์ชันยิง `GET ${API_URL}/books` เพื่อดึงข้อมูลมาเก็บลง State `books`
  * `uploadImage(file)` : ฟังก์ชันสร้าง `new FormData()`, แนบไฟล์ลงในคีย์ `formData.append("file", file)` แล้วส่งไป `POST ${API_URL}/upload`
  * `handleSubmitBook()` : ฟังก์ชันยิง `POST ${API_URL}/books` (เพิ่มใหม่) หรือ `PUT ${API_URL}/books/:id` (แก้ไข)
  * `handleDeleteBook(id)` : ฟังก์ชันยิง `DELETE ${API_URL}/books/:id`
  * `handleAddReview()` : ฟังก์ชันยิง `POST ${API_URL}/books/:id/reviews`

---

### 🎨 ส่วนที่ 3: การแก้ไข UI Frontend (Design & Components)

ทุกอย่างของหน้าจอถูกรวมไว้ใน **`frontend/app/page.tsx`** อย่างเป็นสัดส่วน โดยใช้คลาสของ **Tailwind CSS**:

#### 1. การเปลี่ยนรูปแบบสีและธีม (Colors & Themes)
* สียอดนิยมที่ใช้อยู่ในโค้ดปัจจุบัน:
  * ปุ่มหลัก / ลิงก์: `bg-indigo-600 hover:bg-indigo-700`
  * แถบ Navbar: `bg-white border-b border-slate-200`
  * พื้นหลังเว็บ: `bg-slate-100`
* **วิธีแก้:** ค้นหาคำว่า `indigo-600` แล้วแทนที่ด้วยสีที่ต้องการ เช่น `emerald-600` (เขียว), `rose-600` (ชมพู/แดง) หรือ `sky-600` (ฟ้า)

#### 2. การแก้ไขการ์ดหนังสือ (Book Card Layout)
* **ตำแหน่งในโค้ด:** บรรทัดที่เริ่ม `filteredBooks.map((book) => ...)`
* การปรับขนาดรูปหน้าปก: ค้นหาแท็ก `<div className="h-56 ...">` สามารถเปลี่ยนความสูงได้ เช่น `h-48`, `h-64`
* การปรับตารางกริด: ค้นหา `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">` สามารถปรับจำนวนคอลัมน์ตามต้องการ

#### 3. การแก้ไข Modal แบบฟอร์มเพิ่ม/แก้ไขหนังสือ (Form Modal)
* **ตำแหน่งในโค้ด:** ส่วนเงื่อนไข `{isBookModalOpen && (...)}`
* หากมีฟิลด์ใหม่ ให้เพิ่มแท็ก `<input>` หรือ `<textarea>` ภายใน `<form onSubmit={handleSubmitBook}>`
* ผูก State ด้วย `value={...}` และ `onChange={(e) => set...}`

#### 4. การแก้ไข Modal รีวิวและความคิดเห็น (Reviews Modal)
* **ตำแหน่งในโค้ด:** ส่วนเงื่อนไข `{activeReviewBook && (...)}`
* จุดแสดงรายการรีวิวเดิม: อยู่ในแท็ก `activeReviewBook.reviews.map((rev) => ...)`
* จุดให้คะแนนดาว: อยู่ในฟอร์ม `<form onSubmit={handleAddReview}>`

---

## 📦 4. คำแนะนำสำหรับการซิปส่งงาน
* ห้ามซิปโฟลเดอร์ `node_modules` (ทั้งใน backend และ frontend)
* ห้ามซิปโฟลเดอร์ `.next` (ใน frontend)
* **ไฟล์ที่พร้อมส่งทันที:** ในโฟลเดอร์โปรเจกต์มีไฟล์ `67160139.zip` ที่ถูกกรองไฟล์ขยะออกเรียบร้อยแล้ว สามารถนำไปส่งได้ทันที
