import Foundation
import Vision
import ImageIO

let args = CommandLine.arguments.dropFirst()
guard !args.isEmpty else {
    fputs("Usage: ocr_vision.swift image1 [image2...]\n", stderr)
    exit(1)
}

for path in args {
    let url = URL(fileURLWithPath: path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        print("=== \(path) ===")
        print("[Could not load image]")
        continue
    }

    var output: [String] = []
    let request = VNRecognizeTextRequest { request, error in
        if let error = error {
            output.append("[OCR error: \(error.localizedDescription)]")
            return
        }

        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        output = observations.compactMap { observation -> String? in
            observation.topCandidates(1).first?.string
        }
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["pt-BR", "en-US"]

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    print("=== \(path) ===")
    do {
        try handler.perform([request])
        print(output.joined(separator: "\n"))
    } catch {
        print("[OCR perform error: \(error.localizedDescription)]")
    }
}
