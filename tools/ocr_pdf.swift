import Vision
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("Usage: swift ocr_pdf.swift <pdf_path> <output_dir> [start_page] [end_page]")
    exit(1)
}

let pdfPath = args[1]
let outputDir = args[2]
let startPage = args.count > 3 ? Int(args[3]) ?? 1 : 1
let endPage = args.count > 4 ? Int(args[4]) ?? 999 : 999

try? FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

guard let pdf = CGPDFDocument(NSURL(fileURLWithPath: pdfPath)) else {
    print("Failed to open PDF: \(pdfPath)")
    exit(1)
}

let totalPages = pdf.numberOfPages
let lastPage = min(endPage, totalPages)

for pageNum in startPage...lastPage {
    guard let page = pdf.page(at: pageNum) else { continue }
    
    let pageRect = page.getBoxRect(.mediaBox)
    let scale: CGFloat = 2.0
    let width = Int(pageRect.width * scale)
    let height = Int(pageRect.height * scale)
    
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else { continue }
    
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.scaleBy(x: scale, y: scale)
    context.drawPDFPage(page)
    
    guard let cgImage = context.makeImage() else { continue }
    
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
    request.usesLanguageCorrection = true
    
    do {
        try handler.perform([request])
    } catch {
        print("Page \(pageNum): OCR error: \(error)")
        continue
    }
    
    guard let results = request.results else { continue }
    
    // Sort results top-to-bottom, left-to-right
    let sorted = results.sorted { a, b in
        let ay = a.boundingBox.origin.y
        let by = b.boundingBox.origin.y
        if abs(ay - by) > 0.01 { return ay > by }
        return a.boundingBox.origin.x < b.boundingBox.origin.x
    }
    
    var text = ""
    for obs in sorted {
        if let top = obs.topCandidates(1).first {
            text += top.string + "\n"
        }
    }
    
    if !text.isEmpty {
        let outPath = "\(outputDir)/page_\(String(format: "%04d", pageNum)).txt"
        try? text.write(toFile: outPath, atomically: true, encoding: .utf8)
        print("Page \(pageNum)/\(totalPages): \(sorted.count) text blocks → \(outPath)")
    } else {
        print("Page \(pageNum)/\(totalPages): no text found")
    }
}

print("Done. Output: \(outputDir)")
