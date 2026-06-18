import { extractLabelText } from "@/lib/label-extraction";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const formData = await request.formData();
  const files = formData
    .getAll("packageFiles")
    .filter((file) => file instanceof File && file.size > 0);

  if (!files.length) {
    return Response.json({ error: "Nenhum arquivo recebido para extracao." }, { status: 400 });
  }

  try {
    const extraction = await extractLabelText(files);
    return Response.json(extraction);
  } catch (error) {
    return Response.json(
      {
        error: "Nao foi possivel extrair o texto da embalagem.",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}
