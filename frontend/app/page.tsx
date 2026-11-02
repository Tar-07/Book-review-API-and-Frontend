"use client";

// ==============================================================================
// 1. นำเข้าโมดูลและ Hooks จาก React
// ==============================================================================
import { useEffect, useState, useMemo } from "react";

// อ่านค่า URL ของ Backend API จาก Environment Variable (.env.local) หรือใช้ localhost:3000 เป็นค่าเริ่มต้น
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ==============================================================================
// 2. ประกาศ Interface กำหนดโครงสร้างข้อมูล (TypeScript Type Definition)
// ==============================================================================

// โครงสร้างของข้อมูล Review แต่ละรายการ
interface Review {
  id: number;
  rating: number;
  content: string;
  bookId: number;
}

// โครงสร้างของข้อมูล Book แต่ละเล่ม รวมถึงอาร์เรย์ของ reviews ที่ซ้อนอยู่
interface Book {
  id: number;
  title: string;
  author: string;
  publishedAt: string;
  coverUrl: string | null;
  reviews: Review[];
}

// ==============================================================================
// 3. Main Component หน้าจอหลักของแอพพลิเคชัน
// ==============================================================================
export default function BookReviewApp() {
  // ----------------------------------------------------------------------------
  // State: สำหรับจัดการข้อมูลและแสดงผลรายการหนังสือ
  // ----------------------------------------------------------------------------
  const [books, setBooks] = useState<Book[]>([]);           // รายการหนังสือทั้งหมดที่ดึงมาจาก API
  const [loading, setLoading] = useState(true);              // สถานะกำลังโหลดข้อมูล
  const [searchQuery, setSearchQuery] = useState("");        // ข้อความคำค้นหาใน Search box

  // ----------------------------------------------------------------------------
  // State: สำหรับจัดการ Modal เพิ่ม/แก้ไขหนังสือ (Create / Edit Book)
  // ----------------------------------------------------------------------------
  const [isBookModalOpen, setIsBookModalOpen] = useState(false); // ควบคุมการเปิด/ปิด Modal
  const [editingBook, setEditingBook] = useState<Book | null>(null); // เก็บเล่มที่กำลังแก้ไข (ถ้าเป็น null แปลว่าสร้างใหม่)
  const [title, setTitle] = useState("");                     // ค่าในช่องกรอกชื่อหนังสือ
  const [author, setAuthor] = useState("");                   // ค่าในช่องกรอกชื่อผู้แต่ง
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // ไฟล์รูปภาพที่ผู้ใช้เลือกผ่าน input file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);   // URL พรีวิวรูปภาพก่อนกดส่ง
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);     // สถานะกำลังบันทึกข้อมูลหนังสือ

  // ----------------------------------------------------------------------------
  // State: สำหรับจัดการ Modal ดูและเพิ่มรีวิว (Review Modal)
  // ----------------------------------------------------------------------------
  const [activeReviewBook, setActiveReviewBook] = useState<Book | null>(null); // เก็บเล่มที่กำลังเปิดดู/เขียนรีวิว
  const [rating, setRating] = useState(5);                                     // คะแนนดาวที่เลือก (1-5)
  const [reviewContent, setReviewContent] = useState("");                      // ข้อความรีวิว
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);         // สถานะกำลังส่งรีวิว

  // ============================================================================
  // 4. ฟังก์ชันเชื่อมต่อกับ Backend API (Data Fetching & Mutations)
  // ============================================================================

  /**
   * [Read] ฟังก์ชันดึงรายการหนังสือทั้งหมดจาก Backend: GET /books
   */
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/books`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      setBooks(data); // นำข้อมูลมาเซ็ตลง State
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoading(false);
    }
  };

  // เรียกใช้ fetchBooks ทันทีเมื่อเปิดหน้าเว็บครั้งแรก (Component Mount)
  useEffect(() => {
    fetchBooks();
  }, []);

  /**
   * Effect จัดการรูปภาพ Preview: เมื่อมีการเลือกไฟล์รูปใหม่ จะสร้าง Object URL มาพรีวิว
   */
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    // Cleanup URL เมื่อ Component unmount หรือเปลี่ยนไฟล์ใหม่ เพื่อประหยัด Memory
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  /**
   * เปิด Modal สำหรับเพิ่มหนังสือใหม่ (เคลียร์ค่าเก่าออกทั้งหมด)
   */
  const handleOpenCreateModal = () => {
    setEditingBook(null);
    setTitle("");
    setAuthor("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsBookModalOpen(true);
  };

  /**
   * เปิด Modal สำหรับแก้ไขหนังสือ (นำค่าของเล่มที่เลือกมาใส่ใน Form)
   */
  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setSelectedFile(null);
    setPreviewUrl(book.coverUrl); // แสดงรูปเดิมที่มีอยู่ก่อน
    setIsBookModalOpen(true);
  };

  /**
   * [Upload] ฟังก์ชันอัปโหลดไฟล์รูปภาพไปยัง Backend: POST /upload
   * ส่งไฟล์ผ่าน FormData และรับ URL ของรูปภาพกลับมา
   */
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file); // แนบคีย์ชื่อ 'file' ให้ตรงกับ multer ใน backend

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }

    const data = await res.json();
    return data.url; // ส่งคืน URL เช่น http://localhost:3000/uploads/xxx.png
  };

  /**
   * [Create / Update] ฟังก์ชันบันทึกข้อมูลหนังสือ
   * - ถ้า editingBook มีค่า: ส่งคำขอ PUT /books/:id
   * - ถ้า editingBook เป็น null: ส่งคำขอ POST /books
   */
  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      alert("กรุณากรอกชื่อหนังสือและชื่อผู้แต่ง");
      return;
    }

    try {
      setIsSubmittingBook(true);
      let coverUrl = editingBook ? editingBook.coverUrl : null;

      // ถ้าผู้ใช้เลือกไฟล์ใหม่ ให้อัปโหลดไฟล์ก่อนเพื่อเอา URL มาเก็บ
      if (selectedFile) {
        coverUrl = await uploadImage(selectedFile);
      }

      if (editingBook) {
        // อัปเดตหนังสือเล่มเดิม (PUT)
        const res = await fetch(`${API_URL}/books/${editingBook.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, coverUrl }),
        });
        if (!res.ok) throw new Error("แก้ไขหนังสือไม่สำเร็จ");
      } else {
        // เพิ่มหนังสือเล่มใหม่ (POST)
        const res = await fetch(`${API_URL}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, coverUrl }),
        });
        if (!res.ok) throw new Error("เพิ่มหนังสือไม่สำเร็จ");
      }

      setIsBookModalOpen(false); // ปิด Modal
      fetchBooks();              // โหลดรายการหนังสือใหม่ให้หน้าจออัปเดตทันที
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setIsSubmittingBook(false);
    }
  };

  /**
   * [Delete] ฟังก์ชันลบหนังสือ: DELETE /books/:id
   */
  const handleDeleteBook = async (id: number, bookTitle: string) => {
    if (!confirm(`คุณต้องการลบหนังสือเรื่อง "${bookTitle}" หรือไม่?`)) return;

    try {
      const res = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบหนังสือไม่สำเร็จ");
      fetchBooks(); // โหลดรายการหนังสือใหม่หลังจากลบ
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  /**
   * [Create Review] ฟังก์ชันส่งรีวิวใหม่: POST /books/:id/reviews
   */
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewBook) return;
    if (!reviewContent.trim()) {
      alert("กรุณาใส่ข้อความรีวิว");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await fetch(`${API_URL}/books/${activeReviewBook.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, content: reviewContent }),
      });

      if (!res.ok) throw new Error("เพิ่มรีวิวไม่สำเร็จ");

      // ดึงข้อมูลหนังสือเล่มนี้ใหม่ เพื่ออัปเดตรายการรีวิวใน Modal ทันที
      const bookRes = await fetch(`${API_URL}/books/${activeReviewBook.id}`);
      if (bookRes.ok) {
        const updatedBook = await bookRes.json();
        setActiveReviewBook(updatedBook);
      }

      setReviewContent(""); // เคลียร์ข้อความในฟอร์ม
      setRating(5);          // รีเซ็ตคะแนนเป็น 5 ดาว
      fetchBooks();          // อัปเดตรายการหน้าหลัก
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ----------------------------------------------------------------------------
  // คำนวณข้อมูลช่วยแสดงผล (Computed / Memoized Values)
  // ----------------------------------------------------------------------------

  // กรองรายชื่อหนังสือตามคำค้นหา (ชื่อเรื่อง หรือ ชื่อผู้แต่ง)
  const filteredBooks = useMemo(() => {
    return books.filter((b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [books, searchQuery]);

  // คำนวณจำนวนรีวิวสะสมทั้งหมดในระบบ
  const totalReviews = useMemo(() => {
    return books.reduce((acc, b) => acc + (b.reviews ? b.reviews.length : 0), 0);
  }, [books]);

  // ============================================================================
  // 5. ส่วนแสดงผล UI (JSX & Tailwind CSS)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* -------------------- ส่วนแถบเมนูด้านบน (Navbar) -------------------- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📖</span>
            <span className="text-xl font-bold bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              BookReview Studio
            </span>
          </div>

          {/* ปุ่มเปิด Modal เพิ่มหนังสือใหม่ */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow"
          >
            <span>+</span> เพิ่มหนังสือใหม่
          </button>
        </div>
      </header>

      {/* -------------------- ส่วนเนื้อหาหลัก (Main Content) -------------------- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* หัวข้อและช่องค้นหา */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">คลังหนังสือและรีวิว</h1>
            <p className="text-sm text-slate-500 mt-1">
              หนังสือทั้งหมด {books.length} เล่ม • มีรีวิวสะสม {totalReviews} รายการ
            </p>
          </div>

          {/* ช่องกรอกค้นหา (Search Box) */}
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="ค้นหาชื่อหนังสือ หรือชื่อผู้แต่ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* ตารางแสดงการ์ดหนังสือ (Grid Layout) */}
        {loading ? (
          // แสดง Skeleton จำลองขณะกำลังโหลด
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 animate-pulse h-96" />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          // กรณีไม่มีข้อมูลหนังสือ
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center my-6">
            <div className="text-5xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-slate-800">
              {searchQuery ? "ไม่พบหนังสือที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลหนังสือในระบบ"}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง"
                : "เริ่มต้นโดยการกดปุ่ม 'เพิ่มหนังสือใหม่' ด้านบน เพื่อสร้างหนังสือและอัปโหลดรูปหน้าปก"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                + เพิ่มหนังสือแรก
              </button>
            )}
          </div>
        ) : (
          // แสดงการ์ดหนังสือแต่ละเล่ม
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => {
              const reviewCount = book.reviews ? book.reviews.length : 0;
              // คำนวณค่าเฉลี่ยคะแนนดาว
              const avgRating =
                reviewCount > 0
                  ? (book.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
                  : null;

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-xl shadow-xs hover:shadow-md border border-slate-200 transition-all flex flex-col overflow-hidden"
                >
                  {/* รูปภาพหน้าปกหนังสือ (Cover Image) */}
                  <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // กรณีรูปเสีย ให้ซ่อนและแสดงไอคอนสำรองแทน
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <span className="text-4xl">📕</span>
                        <span className="text-xs mt-1">ไม่มีรูปภาพหน้าปก</span>
                      </div>
                    )}

                    {/* ป้ายแสดงคะแนนดาวเฉลี่ยมุมขวาบน */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span>{avgRating ? avgRating : "ไม่มีรีวิว"}</span>
                    </div>
                  </div>

                  {/* ข้อมูลรายละเอียดหนังสือ */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 line-clamp-1 text-base" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={book.author}>
                        ผู้แต่ง: <span className="text-slate-700 font-medium">{book.author}</span>
                      </p>
                    </div>

                    {/* ปุ่ม Action ด้านล่างการ์ด: รีวิว, แก้ไข, ลบ */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* ปุ่มเปิดดูรีวิว */}
                      <button
                        onClick={() => setActiveReviewBook(book)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg transition"
                      >
                        <span>💬</span>
                        <span>รีวิว ({reviewCount})</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* ปุ่มแก้ไขข้อมูล */}
                        <button
                          onClick={() => handleOpenEditModal(book)}
                          title="แก้ไข"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-xs font-medium"
                        >
                          ✏️
                        </button>
                        {/* ปุ่มลบหนังสือ */}
                        <button
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          title="ลบ"
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-medium"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------------ */}
      {/* 6. Modal: เพิ่ม/แก้ไขหนังสือ พร้อมระบบ Upload รูปภาพ */}
      {/* ------------------------------------------------------------------------ */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingBook ? "✏️ แก้ไขข้อมูลหนังสือ" : "📖 เพิ่มหนังสือใหม่"}
              </h2>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBook} className="space-y-4">
              {/* ช่องกรอกชื่อหนังสือ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อหนังสือ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น Clean Code, JavaScript Deep Dive"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* ช่องกรอกชื่อผู้แต่ง */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้แต่ง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="เช่น Robert C. Martin"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* ช่องเลือกไฟล์รูปภาพหน้าปกสำหรับ Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รูปภาพหน้าปกหนังสือ (อัปโหลดไฟล์)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />

                {/* ส่วนแสดงภาพตัวอย่าง Preview */}
                {previewUrl && (
                  <div className="mt-3 relative w-32 h-44 rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      title="ยกเลิกรูป"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* ปุ่มยกเลิกและบันทึก */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingBook}
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBook}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition shadow-xs"
                >
                  {isSubmittingBook ? "กำลังบันทึก..." : editingBook ? "บันทึกการแก้ไข" : "เพิ่มหนังสือ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------ */}
      {/* 7. Modal: ดูรายการรีวิว และเขียนรีวิวใหม่ */}
      {/* ------------------------------------------------------------------------ */}
      {activeReviewBook && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-100 overflow-hidden">
            {/* ส่วนหัวของ Modal แสดงชื่อหนังสือ */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                {activeReviewBook.coverUrl ? (
                  <img
                    src={activeReviewBook.coverUrl}
                    alt={activeReviewBook.title}
                    className="w-12 h-16 object-cover rounded-md border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-16 bg-slate-200 rounded-md flex items-center justify-center text-xl">
                    📖
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{activeReviewBook.title}</h3>
                  <p className="text-xs text-slate-500">โดย {activeReviewBook.author}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReviewBook(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* รายการรีวิวเดิม */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ความคิดเห็นทั้งหมด ({activeReviewBook.reviews?.length || 0})
                </h4>
              </div>

              {!activeReviewBook.reviews || activeReviewBook.reviews.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="text-3xl block mb-1">💬</span>
                  <p className="text-sm">ยังไม่มีรีวิวสำหรับหนังสือเล่มนี้</p>
                  <p className="text-xs text-slate-400 mt-1">ร่วมเป็นคนแรกที่เขียนรีวิวเลย!</p>
                </div>
              ) : (
                activeReviewBook.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex text-amber-400 text-sm">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < rev.rating ? "text-amber-400" : "text-slate-200"}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">คะแนน {rev.rating}/5</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{rev.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* ฟอร์มสำหรับส่งรีวิวใหม่ */}
            <div className="p-5 border-t border-slate-100 bg-white">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ✍️ เขียนรีวิวใหม่
              </h4>
              <form onSubmit={handleAddReview} className="space-y-3">
                {/* เลือกคะแนนดาว 1-5 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">คะแนนความพึงพอใจ</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-xl transition-transform hover:scale-110 ${
                          star <= rating ? "text-amber-400" : "text-slate-200"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs text-slate-500 self-center ml-2">
                      ({rating} จาก 5 ดาว)
                    </span>
                  </div>
                </div>

                {/* ช่องกรอกข้อความรีวิว */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ข้อความรีวิว
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="พิมพ์ความคิดเห็นของคุณเกี่ยวกับหนังสือเล่มนี้..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2 rounded-lg text-sm transition shadow-xs"
                  >
                    {isSubmittingReview ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ส่วนแถบท้ายหน้าเว็บ (Footer) -------------------- */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Book Review Web Application • Express + Prisma + Next.js
      </footer>
    </div>
  );
}
