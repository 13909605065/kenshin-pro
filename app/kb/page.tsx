"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, Database } from "lucide-react";

interface Book {
  name: string;
  file: string;
  chars: number;
  scanned: boolean;
}

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState({ readable: 0, scanned: 0, totalChars: 0 });
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    fetch("/kb/ocr-output/_index.json")
      .then(r => r.json())
      .then(data => {
        const list: Book[] = Object.entries(data.books || {}).map(([name, meta]: [string, any]) => ({
          name,
          file: meta.file,
          chars: meta.chars,
          scanned: meta.scanned,
        }));
        list.sort((a, b) => b.chars - a.chars);
        setBooks(list);
        setStats({
          readable: data.readable || list.filter(b => !b.scanned).length,
          scanned: data.scanned || list.filter(b => b.scanned).length,
          totalChars: data.totalChars || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return books;
    const q = search.toLowerCase();
    return books.filter(b => b.name.toLowerCase().includes(q));
  }, [books, search]);

  const fmt = (n: number) => n > 1e6 ? (n/1e6).toFixed(1)+"M" : n > 1e3 ? (n/1e3).toFixed(0)+"K" : String(n);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-[#d1d1d1] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#992828]" />
            专业知识库
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl p-4 text-center">
            <p className="text-[10px] text-gray-500 mb-1">专业著作</p>
            <p className="text-2xl font-bold text-[#992828]">{stats.readable + stats.scanned}</p>
            <p className="text-[9px] text-gray-600 mt-1">{stats.readable}本可检索 · {stats.scanned}本扫描</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl p-4 text-center">
            <p className="text-[10px] text-gray-500 mb-1">总字数</p>
            <p className="text-2xl font-bold text-[#992828]">{(stats.totalChars/1e6).toFixed(1)}M</p>
            <p className="text-[9px] text-gray-600 mt-1">{stats.totalChars.toLocaleString()} 字</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl p-4 text-center">
            <p className="text-[10px] text-gray-500 mb-1">覆盖领域</p>
            <p className="text-2xl font-bold text-[#992828]">7</p>
            <p className="text-[9px] text-gray-600 mt-1">体能·解剖·营养·心理·技术·战术·康复</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索书名..."
            className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#d1d1d1] placeholder-gray-600 focus:outline-none focus:border-[#992828] transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">清除</button>
          )}
        </div>

        {/* Book list */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-1">
            {filtered.map(book => (
              <div key={book.name}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition ${
                  book.scanned
                    ? "bg-[#0d0d0d] border-[#1a1a1a] opacity-50"
                    : "bg-[#1a1a1a] border-[#2c2c2c] hover:border-[#444]"
                }`}
              >
                <BookOpen className={`w-4 h-4 shrink-0 ${book.scanned ? "text-gray-600" : "text-[#992828]"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${book.scanned ? "text-gray-600" : "text-[#d1d1d1]"}`}>
                    {book.name}
                  </p>
                </div>
                <span className={`text-[10px] shrink-0 ${book.scanned ? "text-gray-700" : "text-gray-500"}`}>
                  {book.scanned ? "扫描版" : fmt(book.chars)+"字"}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${book.scanned ? "bg-gray-700" : "bg-green-500"}`} />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">没有匹配的书</div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-gray-600 text-center mt-8">
          AI 训练方案生成时自动检索以上著作 · 基于循证运动科学
        </p>
      </div>
    </div>
  );
}
