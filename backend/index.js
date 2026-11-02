// ==============================================================================
// 1. นำเข้าโมดูลและไลบรารีที่จำเป็น
// ==============================================================================
const express = require('express');          // Express framework สำหรับจัดการเซิร์ฟเวอร์และ Routing
const cors = require('cors');                // CORS middleware อนุญาตให้เบราว์เซอร์ของ Frontend ยิงเรียกข้ามพอร์ตได้
const multer = require('multer');            // Multer middleware สำหรับรับและจัดเก็บไฟล์อัปโหลด (เช่น รูปภาพ)
const path = require('path');                // Path module ของ Node.js สำหรับจัดการ path โฟลเดอร์และไฟล์
const fs = require('fs');                    // File System module สำหรับตรวจสอบ/สร้างโฟลเดอร์ในเครื่อง
const { PrismaClient } = require('@prisma/client'); // Prisma ORM สำหรับจัดการและคิวรีฐานข้อมูล SQLite

// ==============================================================================
// 2. กำหนดค่าเริ่มต้นให้กับเซิร์ฟเวอร์
// ==============================================================================
const app = express();
const prisma = new PrismaClient();           // สร้าง instance ของ Prisma Client
const port = 3000;                           // กำหนด Port ของ Backend เป็น 3000

// เปิดใช้งาน Middleware
app.use(cors());                             // อนุญาตให้หน้าเว็บ Next.js (http://localhost:3001) เรียก API ข้าม Origin ได้
app.use(express.json());                      // ให้ Express อ่าน Request Body ที่ส่งมาในรูปแบบ JSON ได้

// ตรวจสอบและสร้างโฟลเดอร์ 'uploads' อัตโนมัติหากยังไม่มี เพื่อไว้เก็บไฟล์รูปภาพ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// เปิดให้คนภายนอกเข้าถึงไฟล์ในโฟลเดอร์ uploads ผ่าน URL เช่น http://localhost:3000/uploads/xxx.png
app.use('/uploads', express.static(uploadDir));

// ==============================================================================
// 3. ตั้งค่าระบบอัปโหลดไฟล์ด้วย Multer
// ==============================================================================
const storage = multer.diskStorage({
  // กำหนดโฟลเดอร์ปลายทางที่จะบันทึกไฟล์
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // กำหนดชื่อไฟล์ใหม่ ป้องกันชื่อไฟล์ซ้ำ: เวลาปัจจุบัน + เลขสุ่ม + นามสกุลเดิม
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ==============================================================================
// 4. API Endpoints
// ==============================================================================

/**
 * [GET] /
 * คำอธิบาย: Endpoint หน้าแรก ใช้สำหรับเช็คสถานะการทำงานของ Server API
 */
app.get('/', (req, res) => {
  res.send('📚 Book Review API is running! เข้าดูข้อมูลหนังสือได้ที่ /books');
});

/**
 * [POST] /upload
 * คำอธิบาย: Endpoint สำหรับอัปโหลดไฟล์รูปภาพหน้าปก
 * การทำงาน: หน้าบ้านส่ง FormData โดยแนบไฟล์ในคีย์ "file"
 * ผลลัพธ์: ส่งคืน JSON { url: "http://localhost:3000/uploads/..." } กลับไปให้ Frontend
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาแนบไฟล์รูปภาพ' });
  }
  // สร้าง URL สำหรับเข้าถึงรูปภาพผ่าน HTTP
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});

/**
 * [POST] /books (Create)
 * คำอธิบาย: สร้างรายการหนังสือใหม่ลงฐานข้อมูล
 * ข้อมูลที่รับ (req.body): { title, author, coverUrl }
 */
app.post('/books', async (req, res) => {
  const { title, author, coverUrl } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อหนังสือและชื่อผู้แต่ง' });
  }

  try {
    const book = await prisma.book.create({
      data: { 
        title, 
        author, 
        coverUrl: coverUrl || null 
      }
    });
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างหนังสือได้' });
  }
});

/**
 * [GET] /books (Read All)
 * คำอธิบาย: ดึงรายชื่อหนังสือทั้งหมดในระบบ พร้อมดึงรายการรีวิว (reviews) ที่ซ้อนอยู่ (Nested List)
 * เรียงลำดับจาก id ล่าสุดลงไป (orderBy desc)
 */
app.get('/books', async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        reviews: true // ดึงความสัมพันธ์ reviews มาด้วย
      },
      orderBy: {
        id: 'desc'    // เอาหนังสือที่สร้างล่าสุดขึ้นก่อน
      }
    });
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
  }
});

/**
 * [GET] /books/:id (Read One)
 * คำอธิบาย: ดึงข้อมูลหนังสือทีละ 1 เล่มตาม ID ที่ส่งมาใน URL Parameter
 */
app.get('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'รหัสหนังสือไม่ถูกต้อง' });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id },
      include: { reviews: true }
    });
    if (!book) {
      return res.status(404).json({ error: 'ไม่พบหนังสือรหัสนี้' });
    }
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

/**
 * [PUT] /books/:id (Update)
 * คำอธิบาย: แก้ไขข้อมูลหนังสือ (ชื่อ, ผู้แต่ง, หรือรูปหน้าปก) ตาม ID
 * ข้อมูลที่รับ (req.body): { title, author, coverUrl }
 */
app.put('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'รหัสหนังสือไม่ถูกต้อง' });
  }

  const { title, author, coverUrl } = req.body;

  try {
    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(author !== undefined && { author }),
        ...(coverUrl !== undefined && { coverUrl })
      }
    });
    res.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(400).json({ error: 'แก้ไขข้อมูลไม่สำเร็จ กรุณาตรวจสอบรหัสหนังสือ' });
  }
});

/**
 * [DELETE] /books/:id (Delete)
 * คำอธิบาย: ลบข้อมูลหนังสือตาม ID
 * หมายเหตุ: ต้องลบข้อมูลรีวิวที่เชื่อมกับหนังสือเล่มนี้ก่อน (Cascade Delete) เพื่อไม่ให้ติดข้อผิดพลาด Foreign Key Constraint
 */
app.delete('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'รหัสหนังสือไม่ถูกต้อง' });
  }

  try {
    // 1. ลบรีวิวทั้งหมดที่มี bookId ตรงกับ id เล่มนี้ก่อน
    await prisma.review.deleteMany({
      where: { bookId: id }
    });

    // 2. ลบหนังสือเล่มนี้ออกจากตาราง
    const deletedBook = await prisma.book.delete({
      where: { id }
    });
    res.json({ message: 'ลบหนังสือเรียบร้อยแล้ว', book: deletedBook });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(400).json({ error: 'ลบหนังสือไม่สำเร็จ กรุณาตรวจสอบรหัสหนังสือ' });
  }
});

/**
 * [POST] /books/:id/reviews (Create Review)
 * คำอธิบาย: เพิ่มความคิดเห็นและคะแนนรีวิวให้กับหนังสือเล่มนั้นๆ (สืบทอดจากโจทย์งานเดิม)
 * ข้อมูลที่รับ (req.body): { rating: 1-5, content: "ข้อความรีวิว" }
 */
app.post('/books/:id/reviews', async (req, res) => {
  const bookId = parseInt(req.params.id);
  if (isNaN(bookId)) {
    return res.status(400).json({ error: 'รหัสหนังสือไม่ถูกต้อง' });
  }

  const { rating, content } = req.body;
  if (!rating || !content) {
    return res.status(400).json({ error: 'กรุณากรอกคะแนน (rating) และเนื้อหารีวิว (content)' });
  }

  try {
    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        content,
        bookId
      }
    });
    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(400).json({ error: 'เพิ่มรีวิวไม่ได้ กรุณาตรวจสอบรหัสหนังสือ' });
  }
});

// ==============================================================================
// 5. เริ่มต้นรันเซิร์ฟเวอร์ Express
// ==============================================================================
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
