import { extractLabelText } from "@/lib/label-extraction";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

// OCR é caro (tesseract/sharp/pdf-parse, até 8 arquivos x 10MB). Limita abuso/custo.
const extractLimit = rateLimit({ windowMs: 60_000, max: 5, prefix: "extract" });

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo
const MAX_FILES = 8;

// Valida o CONTEÚDO real (magic bytes) — o MIME/extensão são forjáveis. Evita
// alimentar sharp/pdf-parse/tesseract com arquivos arbitrários e limita DoS.
async function fileLooksValid(file) {
  if (file.size > MAX_FILE_BYTES) return false;
  const buf = Buffer.from(await file.slice(0, 16).arrayBuffer());
  const eq = (sig, off = 0) => sig.every((b, i) => buf[off + i] === b);
  if (eq([0x25, 0x50, 0x44, 0x46, 0x2d])) return true; // %PDF-
  if (eq([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true; // PNG
  if (eq([0xff, 0xd8, 0xff])) return true; // JPEG
  if (eq([0x52, 0x49, 0x46, 0x46]) && eq([0x57, 0x45, 0x42, 0x50], 8)) return true; // WEBP
  return false;
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const blocked = await extractLimit(request);
  if (blocked) return blocked;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Dados invalidos." }, { status: 400 });
  }
  const files = formData
    .getAll("packageFiles")
    .filter((file) => file instanceof File && file.size > 0);

  if (!files.length) {
    return Response.json({ error: "Nenhum arquivo recebido para extracao." }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `Muitos arquivos. O limite é ${MAX_FILES}.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!(await fileLooksValid(file))) {
      return Response.json(
        {
          error:
            "Arquivo inválido ou muito grande. Envie imagem (PNG, JPG, WEBP) ou PDF de até 10 MB.",
        },
        { status: 400 }
      );
    }
  }

  try {
    const extraction = await extractLabelText(files);
    return Response.json(extraction);
  } catch (error) {
    // Loga o detalhe no servidor; não vaza stack/caminho interno ao cliente.
    console.error("extract-label falhou:", error);
    return Response.json(
      { error: "Nao foi possivel extrair o texto da embalagem." },
      { status: 500 }
    );
  }
}
