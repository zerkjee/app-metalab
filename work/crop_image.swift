import Foundation
import ImageIO
import CoreGraphics
import UniformTypeIdentifiers

struct CropSpec {
    let name: String
    let x: Int
    let y: Int
    let w: Int
    let h: Int
}

let input = URL(fileURLWithPath: "work/rendered_condroless/page300-1.png")
let outputDir = URL(fileURLWithPath: "work/rendered_condroless/crops", isDirectory: true)
try? FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Could not load input image\n", stderr)
    exit(1)
}

let specs = [
    CropSpec(name: "painel_principal_esquerdo.png", x: 560, y: 1580, w: 1150, h: 1920),
    CropSpec(name: "tabela_nutricional.png", x: 1680, y: 1650, w: 700, h: 1390),
    CropSpec(name: "painel_principal_central.png", x: 2400, y: 1580, w: 1100, h: 1920),
    CropSpec(name: "lateral_advertencias.png", x: 3500, y: 1620, w: 690, h: 1880),
    CropSpec(name: "dados_fabricante_codigo.png", x: 1740, y: 2700, w: 650, h: 760)
]

for spec in specs {
    let rect = CGRect(x: spec.x, y: spec.y, width: spec.w, height: spec.h)
    guard let cropped = image.cropping(to: rect) else {
        print("Could not crop \(spec.name)")
        continue
    }
    let url = outputDir.appendingPathComponent(spec.name)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        print("Could not create \(spec.name)")
        continue
    }
    CGImageDestinationAddImage(dest, cropped, nil)
    CGImageDestinationFinalize(dest)
    print(url.path)
}
