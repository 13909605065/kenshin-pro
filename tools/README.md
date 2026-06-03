# 工具脚本

## ocr_pdf.swift — PDF OCR 工具

利用 macOS 原生 Vision 框架，将扫描版 PDF 识别为中文+英文文字。

**用法：**

```bash
# OCR 第 1-10 页
swift tools/ocr_pdf.swift "路径/书.pdf" /tmp/output 1 10

# OCR 全书
swift tools/ocr_pdf.swift "路径/书.pdf" /tmp/output 1
```

**输出：** 每页生成一个 `.txt` 文件（如 `page_0001.txt`）。

**要求：** macOS，无需额外安装依赖。
