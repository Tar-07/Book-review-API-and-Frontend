"use client";

import { useEffect, useState, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Review {
  id: number;
  rating: number;
  content: string;
  bookId: number;
}

interface Book {
  id: number;
  title: string;
  author: string;
  publishedAt: string;
  coverUrl: string | null;
  reviews: Review[];
}

export default function BookReviewApp() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Book Create / Edit
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  // Modal State for Reviews
  const [activeReviewBook, setActiveReviewBook] = useState<Book | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // 1. Fetch Books
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/books`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Update preview URL when selectedFile changes
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingBook(null);
    setTitle("");
    setAuthor("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsBookModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setSelectedFile(null);
    setPreviewUrl(book.coverUrl);
    setIsBookModalOpen(true);
  };

  // Upload image helper
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }

    const data = await res.json();
    return data.url;
  };

  // Submit Book (Create / Update)
  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      alert("กรุณากรอกชื่อหนังสือและชื่อผู้แต่ง");
      return;
    }

    try {
      setIsSubmittingBook(true);
      let coverUrl = editingBook ? editingBook.coverUrl : null;

      // If a new file is chosen, upload it first
      if (selectedFile) {
        coverUrl = await uploadImage(selectedFile);
      }

      if (editingBook) {
        // Update (PUT)
        const res = await fetch(`${API_URL}/books/${editingBook.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, coverUrl }),
        });
        if (!res.ok) throw new Error("แก้ไขหนังสือไม่สำเร็จ");
      } else {
        // Create (POST)
        const res = await fetch(`${API_URL}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, coverUrl }),
        });
        if (!res.ok) throw new Error("เพิ่มหนังสือไม่สำเร็จ");
      }

      setIsBookModalOpen(false);
      fetchBooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setIsSubmittingBook(false);
    }
  };

  // Delete Book
  const handleDeleteBook = async (id: number, bookTitle: string) => {
    if (!confirm(`คุณต้องการลบหนังสือเรื่อง "${bookTitle}" หรือไม่?`)) return;

    try {
      const res = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบหนังสือไม่สำเร็จ");
      fetchBooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  // Submit Review
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

      // Refresh reviews in the active modal
      const bookRes = await fetch(`${API_URL}/books/${activeReviewBook.id}`);
      if (bookRes.ok) {
        const updatedBook = await bookRes.json();
        setActiveReviewBook(updatedBook);
      }

      setReviewContent("");
      setRating(5);
      fetchBooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [books, searchQuery]);

  // Overall stats
  const totalReviews = useMemo(() => {
    return books.reduce((acc, b) => acc + (b.reviews ? b.reviews.length : 0), 0);
  }, [books]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📖</span>
            <span className="text-xl font-bold bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              BookReview Studio
            </span>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow"
          >
            <span>+</span> เพิ่มหนังสือใหม่
          </button>
        </div>
      </header>

      {/* Hero / Controls Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">คลังหนังสือและรีวิว</h1>
            <p className="text-sm text-slate-500 mt-1">
              หนังสือทั้งหมด {books.length} เล่ม • มีรีวิวสะสม {totalReviews} รายการ
            </p>
          </div>

          {/* Search box */}
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

        {/* Books List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 animate-pulse h-96" />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => {
              const reviewCount = book.reviews ? book.reviews.length : 0;
              const avgRating =
                reviewCount > 0
                  ? (book.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
                  : null;

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-xl shadow-xs hover:shadow-md border border-slate-200 transition-all flex flex-col overflow-hidden"
                >
                  {/* Cover Image */}
                  <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <span className="text-4xl">📕</span>
                        <span className="text-xs mt-1">ไม่มีรูปภาพหน้าปก</span>
                      </div>
                    )}

                    {/* Star badge overlay */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span>{avgRating ? avgRating : "ไม่มีรีวิว"}</span>
                    </div>
                  </div>

                  {/* Book Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 line-clamp-1 text-base" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={book.author}>
                        ผู้แต่ง: <span className="text-slate-700 font-medium">{book.author}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveReviewBook(book)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg transition"
                      >
                        <span>💬</span>
                        <span>รีวิว ({reviewCount})</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(book)}
                          title="แก้ไข"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-xs font-medium"
                        >
                          ✏️
                        </button>
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

      {/* ==================================================== */}
      {/* Modal: Create / Edit Book (พร้อม Upload รูปภาพ) */}
      {/* ==================================================== */}
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

                {/* Image Preview */}
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

      {/* ==================================================== */}
      {/* Modal: View & Add Reviews */}
      {/* ==================================================== */}
      {activeReviewBook && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
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

            {/* Reviews List */}
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

            {/* Add Review Form */}
            <div className="p-5 border-t border-slate-100 bg-white">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ✍️ เขียนรีวิวใหม่
              </h4>
              <form onSubmit={handleAddReview} className="space-y-3">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Book Review Web Application • Express + Prisma + Next.js
      </footer>
    </div>
  );
}
