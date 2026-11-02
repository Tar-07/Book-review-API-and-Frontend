const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ==========================================
// API Endpoints
// ==========================================

// หน้าแรกของ API (บอกสถานะเซิร์ฟเวอร์)
app.get('/', (req, res) => {
  res.send('📚 Book Review API is running! เข้าดูข้อมูลหนังสือได้ที่ /books');
});

// 1. Upload File
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาแนบไฟล์รูปภาพ' });
  }
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});

// 2. Create Book
app.post('/books', async (req, res) => {
  const { title, author, coverUrl } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อหนังสือและชื่อผู้แต่ง' });
  }

  try {
    const book = await prisma.book.create({
      data: { title, author, coverUrl: coverUrl || null }
    });
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างหนังสือได้' });
  }
});

// 3. Get All Books (with Reviews)
app.get('/books', async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        reviews: true
      },
      orderBy: {
        id: 'desc'
      }
    });
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
  }
});

// 4. Get Single Book (with Reviews)
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

// 5. Update Book
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

// 6. Delete Book
app.delete('/books/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'รหัสหนังสือไม่ถูกต้อง' });
  }

  try {
    // Delete associated reviews first (foreign key protection)
    await prisma.review.deleteMany({
      where: { bookId: id }
    });

    const deletedBook = await prisma.book.delete({
      where: { id }
    });
    res.json({ message: 'ลบหนังสือเรียบร้อยแล้ว', book: deletedBook });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(400).json({ error: 'ลบหนังสือไม่สำเร็จ กรุณาตรวจสอบรหัสหนังสือ' });
  }
});

// 7. Add Review to Book
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
