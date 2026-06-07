/**
 * Knowledge Base — extracted from 38 professional soccer/fitness books
 * Used by AI prompts to generate evidence-based training plans
 */

const KB_DIR = "/kb/ocr-output";

interface BookMeta {
  file: string;
  chars: number;
  scanned: boolean;
  preview: string;
}

interface KBIndex {
  books: Record<string, BookMeta>;
  totalChars: number;
  totalFiles: number;
  topBooks: string[];
}

// In-memory cache
let _index: KBIndex | null = null;
const _cache: Map<string, string> = new Map();

async function loadIndex(): Promise<KBIndex> {
  if (_index) return _index;
  try {
    const res = await fetch(KB_DIR + "/_index.json");
    _index = await res.json();
    return _index!;
  } catch {
    return { books: {}, totalChars: 0, totalFiles: 0, topBooks: [] };
  }
}

/**
 * Search the knowledge base for passages relevant to the query keywords.
 * Returns top 5 most relevant passages with book citations.
 */
export async function searchKnowledgeBase(
  query: string,
  maxResults: number = 5
): Promise<Array<{ book: string; passage: string; relevance: number }>> {
  const index = await loadIndex();
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
  const results: Array<{ book: string; passage: string; relevance: number }> = [];

  for (const [bookName, meta] of Object.entries(index.books)) {
    if (meta.scanned || meta.chars < 500) continue;

    try {
      let content = _cache.get(bookName);
      if (!content) {
        const res = await fetch(KB_DIR + "/" + meta.file);
        content = await res.text();
        _cache.set(bookName, content);
      }

      // Split into paragraphs, score by keyword matches
      const paras = content.split(/\n\n+/).filter(p => p.length > 100);
      for (const para of paras) {
        const paraLower = para.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          const count = (paraLower.match(new RegExp(kw, "gi")) || []).length;
          score += count;
        }
        if (score > 0) {
          results.push({
            book: bookName,
            passage: para.slice(0, 800).replace(/\n/g, " "),
            relevance: score,
          });
        }
      }
    } catch {
      // skip failed loads
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

/**
 * Get a summary of available knowledge for a given topic.
 * Returns formatted string ready to inject into AI system prompt.
 */
export async function getKnowledgeContext(
  topic: string,
  position?: string,
  phase?: string
): Promise<string> {
  const queries = [topic];
  if (position) queries.push(position + "训练");
  if (phase) queries.push(phase + "训练");

  const allResults: Array<{ book: string; passage: string }> = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const results = await searchKnowledgeBase(q, 3);
    for (const r of results) {
      const key = r.passage.slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        allResults.push(r);
      }
    }
  }

  if (allResults.length === 0) return "";

  const lines: string[] = [
    "【参考知识库 — 基于专业书籍】",
    ...allResults.map(
      r => `📖 ${r.book.slice(0, 50)}: ${r.passage.slice(0, 400)}`
    ),
    "【以上知识仅供参考，请结合实际情况判断】",
  ];

  return lines.join("\n");
}

/**
 * Get list of top books for display.
 */
export async function getTopBooks(): Promise<string[]> {
  const index = await loadIndex();
  return index.topBooks || [];
}

/**
 * Get summary stats.
 */
export async function getKnowledgeStats(): Promise<{
  totalBooks: number;
  readableBooks: number;
  scannedBooks: number;
  totalChars: number;
}> {
  const index = await loadIndex();
  const books = Object.values(index.books);
  return {
    totalBooks: books.length,
    readableBooks: books.filter(b => !b.scanned && b.chars > 500).length,
    scannedBooks: books.filter(b => b.scanned || b.chars <= 500).length,
    totalChars: index.totalChars,
  };
}
