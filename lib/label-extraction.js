const MAX_FILES = 8;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 30;

function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fileKind(file) {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) return "image";
  if (type === "text/plain" || name.endsWith(".txt")) return "text";
  return "unknown";
}

async function extractTextFile(file) {
  return cleanExtractedText(await file.text());
}

async function extractPdfText(buffer) {
  const { PDFParse } = await import("pdf-parse");
  const { getData } = await import("pdf-parse/worker");
  PDFParse.setWorker(getData());

  const data = new Uint8Array(Buffer.from(new Uint8Array(buffer)));
  const parser = new PDFParse({ data });

  try {
    const info = await parser.getInfo();
    const pageCount = info.total || 0;
    const result = await parser.getText({ first: MAX_PDF_PAGES });

    return {
      text: cleanExtractedText(result.text),
      pageCount,
      processedPages: Math.min(pageCount || MAX_PDF_PAGES, MAX_PDF_PAGES),
    };
  } finally {
    await parser.destroy();
  }
}

async function preprocessImage(buffer) {
  const sharp = (await import("sharp")).default;
  return sharp(Buffer.from(buffer))
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width: 2600, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

async function createOcrWorker() {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker(["por", "eng"], 1, {
    logger: () => {},
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  return worker;
}

async function extractImageText(file, buffer, worker) {
  const image = await extractImageBufferText(buffer, worker);

  return image;
}

async function extractImageBufferText(buffer, worker) {
  const processed = await preprocessImage(buffer);
  const result = await worker.recognize(processed);

  return {
    text: cleanExtractedText(result.data.text),
    confidence: Math.round(result.data.confidence || 0),
  };
}

async function extractPdfImagesText(buffer, worker) {
  const { PDFParse } = await import("pdf-parse");
  const { getData } = await import("pdf-parse/worker");
  PDFParse.setWorker(getData());

  const data = new Uint8Array(Buffer.from(new Uint8Array(buffer)));
  const parser = new PDFParse({ data });
  const parts = [];
  const confidences = [];
  let imageCount = 0;
  let pageCount = 0;

  try {
    const result = await parser.getImage({
      first: MAX_PDF_PAGES,
      imageThreshold: 160,
      imageBuffer: true,
      imageDataUrl: false,
    });

    pageCount = result.total || 0;

    for (const page of result.pages) {
      for (const image of page.images || []) {
        if (!image.data?.length) continue;
        if (image.width < 160 || image.height < 160) continue;

        imageCount += 1;
        const extracted = await extractImageBufferText(image.data, worker);
        if (extracted.text) {
          parts.push(`Pagina ${page.pageNumber} / imagem ${imageCount}\n${extracted.text}`);
          confidences.push(extracted.confidence);
        }
      }
    }
  } finally {
    await parser.destroy();
  }

  const confidence = confidences.length
    ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
    : 0;

  return {
    text: cleanExtractedText(parts.join("\n\n")),
    confidence,
    imageCount,
    pageCount,
  };
}

export async function extractLabelText(files) {
  const selectedFiles = files.slice(0, MAX_FILES);
  const warnings = [];
  const results = [];
  const textParts = [];
  let ocrWorker = null;

  if (files.length > MAX_FILES) {
    warnings.push(`Foram processados apenas os ${MAX_FILES} primeiros arquivos.`);
  }

  try {
    for (const file of selectedFiles) {
      const kind = fileKind(file);
      const base = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        kind,
      };

      if (file.size > MAX_FILE_SIZE) {
        results.push({
          ...base,
          status: "ignorado",
          method: "limite",
          textLength: 0,
          warning: "Arquivo acima de 15 MB. Reduza a imagem ou envie uma versao menor.",
        });
        continue;
      }

      if (kind === "unknown") {
        results.push({
          ...base,
          status: "ignorado",
          method: "nao_suportado",
          textLength: 0,
          warning: "Formato nao suportado nesta etapa.",
        });
        continue;
      }

      const buffer = await file.arrayBuffer();

      if (kind === "text") {
        const text = await extractTextFile(file);
        if (text) textParts.push(`Arquivo: ${file.name}\n${text}`);
        results.push({ ...base, status: text ? "extraido" : "sem_texto", method: "txt", textLength: text.length });
        continue;
      }

      if (kind === "pdf") {
        const pdf = await extractPdfText(buffer);
        if (pdf.text && pdf.text.length >= 120) {
          textParts.push(`Arquivo: ${file.name}\n${pdf.text}`);
          results.push({
            ...base,
            status: "extraido",
            method: "pdf_texto",
            textLength: pdf.text.length,
            pageCount: pdf.pageCount,
            processedPages: pdf.processedPages,
          });
        } else {
          results.push({
            ...base,
            status: "sem_texto",
            method: "pdf_texto",
            textLength: 0,
            pageCount: pdf.pageCount,
            processedPages: pdf.processedPages,
            warning: "PDF escaneado ou sem texto selecionavel. Para maior precisao, envie fotos/PNG de cada face da embalagem.",
          });
        }
        continue;
      }

      results.push({
        ...base,
        status: "ignorado",
        method: "ocr_navegador",
        textLength: 0,
        warning: "OCR de imagem e feito no navegador para evitar demora no servidor.",
      });
    }
  } finally {
    if (ocrWorker) await ocrWorker.terminate();
  }

  const text = cleanExtractedText(textParts.join("\n\n---\n\n"));
  const extractedFiles = results.filter((item) => item.status === "extraido").length;

  if (!text) {
    warnings.push("Nenhum texto foi extraido. Use foto mais nitida, com boa luz, sem reflexo e uma face por imagem.");
  }

  return {
    text,
    files: results,
    warnings,
    extractedFiles,
    totalFiles: selectedFiles.length,
    generatedAt: new Date().toISOString(),
  };
}
