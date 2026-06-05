#!/bin/bash
# ocr-book.sh — OCR扫描版PDF并提取知识合成
# 用法: ./tools/ocr-book.sh <pdf路径> [起始页] [结束页] [dpi]
# 依赖: tesseract (brew install tesseract tesseract-lang)
#       Python3 + PyMuPDF + pytesseract + Pillow
#       pip3 install pymupdf pytesseract Pillow

set -e

PDF="$1"
START_PAGE="${2:-1}"
END_PAGE="${3:-}"
DPI="${4:-200}"
NAME=$(basename "$PDF" .pdf | sed 's/[^a-zA-Z0-9_-]//g' | head -c 30)
OUTDIR="${HOME}/Desktop/Kenshin体能/kb/ocr-output"
mkdir -p "$OUTDIR"

echo "📖 OCR: $(basename "$PDF")"
echo "   Pages: ${START_PAGE}-${END_PAGE:-all} @ ${DPI}dpi"
echo ""

python3 - "$PDF" "$START_PAGE" "$END_PAGE" "$DPI" "$OUTDIR" "$NAME" << 'PYEOF'
import sys, fitz, pytesseract, io, json
from PIL import Image
from pathlib import Path

pdf_path = sys.argv[1]
start_page = int(sys.argv[2])
end_page = int(sys.argv[3]) if sys.argv[3] else None
dpi = int(sys.argv[4])
outdir = Path(sys.argv[5])
name = sys.argv[6]

doc = fitz.open(pdf_path)
total = doc.page_count
end_page = min(end_page or total, total)

print(f"Total pages: {total}, OCRing {start_page}-{end_page}")

full_text = []
page_texts = {}

for pn in range(start_page - 1, end_page):
    page = doc[pn]
    pix = page.get_pixmap(dpi=dpi)
    img = Image.open(io.BytesIO(pix.tobytes("png")))

    # Try chi_sim+eng first, fall back to eng
    for lang in ['chi_sim+eng', 'eng']:
        try:
            text = pytesseract.image_to_string(img, lang=lang)
            break
        except:
            continue
    else:
        text = pytesseract.image_to_string(img, lang='eng')

    full_text.append(f"\n=== PAGE {pn+1} ===\n{text}")
    page_texts[str(pn+1)] = text

    if (pn - start_page + 2) % 10 == 0:
        print(f"  Progress: {pn - start_page + 2}/{end_page - start_page + 1} pages")

doc.close()

# Save raw text
raw_path = outdir / f"{name}_ocr_raw.txt"
raw_path.write_text('\n'.join(full_text), encoding='utf-8')
print(f"\n✅ Raw text: {raw_path} ({raw_path.stat().st_size} bytes)")

# Save structured JSON
json_path = outdir / f"{name}_ocr_pages.json"
json_path.write_text(json.dumps(page_texts, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"✅ JSON: {json_path}")

# Quick knowledge extraction — find key sections
key_terms = {
    '力量': ['力量', 'strength', '1RM', '深蹲', 'squat', 'deadlift', '硬拉'],
    '速度': ['速度', 'speed', '冲刺', 'sprint', '加速', 'acceleration'],
    '爆发力': ['爆发', 'power', 'Plyometric', '增强式', '跳箱', 'box jump'],
    '耐力': ['耐力', 'endurance', '有氧', 'aerobic', 'HIIT', '间歇', 'MAS'],
    '周期': ['周期', 'periodi', '休赛', '季前', '赛季', 'off-season', 'pre-season', 'in-season'],
    '伤病': ['伤病', 'injury', '康复', 'rehab', '预防', 'prevention', 'ACL'],
    '营养': ['营养', 'nutrition', '碳水', '蛋白', '补液', 'hydration'],
    '测试': ['测试', 'test', '评估', 'assessment', 'Yo-Yo', 'CMJ', 'FMS'],
    '热身': ['热身', 'warm-up', 'RAMP', '动态拉伸', 'FIFA 11+'],
    '女运动员': ['女性', 'female', '女', '月经', 'menstrual'],
    '青少年': ['青少年', 'youth', 'PHV', '<18'],
}

print("\n📊 Knowledge map:")
for category, terms in key_terms.items():
    hits = []
    for pn_str, text in page_texts.items():
        for t in terms:
            if t.lower() in text.lower():
                hits.append(pn_str)
                break
    if hits:
        print(f"  {category}: pages {', '.join(sorted(set(hits), key=int)[:10])}")

print(f"\n🎯 Done! {end_page - start_page + 1} pages OCR'd.")
print(f"   Next: Read {raw_path} and create synthesis markdown.")
PYEOF

echo ""
echo "💡 下一步: 读 ${OUTDIR}/${NAME}_ocr_raw.txt 提取知识 → 写入 kb/ 合成文件"
