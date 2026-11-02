# 📚 Book Review Application

เว็บแอปพลิเคชันระบบรีวิวหนังสือ (Fullstack Web Application) ประกอบด้วย Backend (Express + Prisma + SQLite) และ Frontend (Next.js + Tailwind CSS)

---

## 🛠 Tech Stack

* **Backend:** Node.js, Express.js, Prisma ORM, SQLite, Multer (สำหรับอัปโหลดไฟล์)
* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
* **Database:** SQLite

---

## 📋 สิ่งที่ต้องเตรียมก่อนเริ่ม (Prerequisites)

* **Git**
* **Node.js** (แนะนำเวอร์ชัน 18.x หรือ 20.x ขึ้นไป) และ **npm**

---

## 🚀 ขั้นตอนการติดตั้งหลัง Clone ลงเครื่องใหม่ (Setup Guide)

### 1. Clone โปรเจกต์
เปิด Terminal แล้วรันคำสั่ง:
```bash
git clone https://github.com/Tar-07/Book-review-API-and-Frontend
cd book-review-api
```

---

### 2. ตั้งค่าและรัน Backend

เปิด **Terminal ที่ 1**:

```bash
# 1. เข้าสู่โฟลเดอร์ backend
cd backend

# 2. ติดตั้ง Dependencies
npm install

# 3. สร้างไฟล์ .env จาก .env.example
# สำหรับ Windows (PowerShell):
copy .env.example .env
# หรือสำหรับ macOS / Linux:
# cp .env.example .env

# 4. ซิงค์ Database Schema (SQLite) และสร้าง Prisma Client
npx prisma db push

# 5. สตาร์ทเซิร์ฟเวอร์ Backend
npm run dev
# หรือ npm start
```
> เซิร์ฟเวอร์ Backend จะทำงานอยู่ที่: `http://localhost:3000`

---

### 3. ตั้งค่าและรัน Frontend

เปิด **Terminal ที่ 2** (เปิดควบคู่กับ Terminal ที่ 1):

```bash
# 1. เข้าสู่โฟลเดอร์ frontend
cd frontend

# 2. ติดตั้ง Dependencies
npm install

# 3. สร้างไฟล์ .env.local จาก .env.example
# สำหรับ Windows (PowerShell):
copy .env.example .env.local
# หรือสำหรับ macOS / Linux:
# cp .env.example .env.local

# 4. สตาร์ท Next.js ในโหมด Development
npm run dev
```
> เซิร์ฟเวอร์ Frontend จะทำงานอยู่ที่: `http://localhost:3001` (หรือพอร์ตที่ Next.js แจ้งใน Terminal)

---

### 4. เข้าใช้งานแอปพลิเคชัน

เปิดเว็บเบราว์เซอร์ไปที่:
👉 **[http://localhost:3001](http://localhost:3001)**

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
book-review-api/
├── backend/
│   ├── prisma/             # Prisma Schema & SQLite database
│   ├── uploads/            # โฟลเดอร์เก็บรูปภาพหน้าปกหนังสือที่อัปโหลด
│   ├── .env.example        # ตัวอย่าง Environment variables สำหรับ Backend
│   ├── index.js            # Express API Server endpoints
│   └── package.json
├── frontend/
│   ├── app/                # Next.js App Router (หน้าเว็บ UI)
│   ├── public/             # ไฟล์ Static assets
│   ├── .env.example        # ตัวอย่าง Environment variables สำหรับ Frontend
│   └── package.json
└── README.md
```
