/**
 * Knowledge Base — 38 professional soccer/fitness books (4.6M words)
 * Server-side search engine for evidence-based training plan generation.
 */

import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "kb/ocr-output");

interface BookMeta { file: string; chars: number; scanned: boolean; preview: string; }
interface KBIndex { books: Record<string, BookMeta>; totalChars: number; totalFiles: number; topBooks: string[]; }

let _index: KBIndex | null = null;
const _cache: Map<string, string> = new Map();

function loadIndex(): KBIndex {
  if (_index) return _index;
  try {
    _index = JSON.parse(fs.readFileSync(path.join(KB_PATH, "_index.json"), "utf8"));
    return _index!;
  } catch {
    return { books: {}, totalChars: 0, totalFiles: 0, topBooks: [] };
  }
}

/** Search knowledge base for passages matching query keywords */
export function searchKnowledgeBase(
  query: string,
  maxResults: number = 5
): Array<{ book: string; passage: string; relevance: number }> {
  const index = loadIndex();
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
  if (keywords.length === 0) return [];

  const results: Array<{ book: string; passage: string; relevance: number }> = [];

  for (const [bookName, meta] of Object.entries(index.books)) {
    if (meta.scanned || meta.chars < 500) continue;
    try {
      let content = _cache.get(bookName);
      if (!content) {
        content = fs.readFileSync(path.join(KB_PATH, meta.file), "utf8");
        _cache.set(bookName, content);
      }
      const paras = content.split(/\n\n+/).filter(p => p.length > 80);
      for (const para of paras) {
        let score = 0;
        const paraLower = para.toLowerCase();
        for (const kw of keywords) {
          score += (paraLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
        }
        if (score > 0) {
          results.push({ book: bookName, passage: para.slice(0, 600).replace(/\n/g, " "), relevance: score });
        }
      }
    } catch { /* skip */ }
  }
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, maxResults);
}

/** Get formatted knowledge context for injecting into AI prompts */
export function getKnowledgeContext(topic: string, position?: string, phase?: string): string {
  const queries = [topic];
  if (position) queries.push(position);
  if (phase) queries.push(phase);

  const allResults: Array<{ book: string; passage: string }> = [];
  const seen = new Set<string>();
  for (const q of queries) {
    for (const r of searchKnowledgeBase(q, 3)) {
      const key = r.passage.slice(0, 40);
      if (!seen.has(key)) { seen.add(key); allResults.push(r); }
    }
  }
  if (allResults.length === 0) return "";
  return "\n\n【参考知识库 — 基于以下专业书籍】\n" +
    allResults.map(r => `📖 ${r.book.slice(0, 60)}: ${r.passage.slice(0, 300)}`).join("\n") +
    "\n【以上知识仅供参考】\n";
}

export function getKnowledgeStats() {
  const idx = loadIndex();
  const books = Object.values(idx.books);
  return {
    totalBooks: books.length,
    readable: books.filter(b => !b.scanned && b.chars > 500).length,
    scanned: books.filter(b => b.scanned || b.chars <= 500).length,
    totalChars: idx.totalChars,
  };
}
