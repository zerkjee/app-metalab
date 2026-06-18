import { listAnalyses, getAnalysis } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const record = await getAnalysis(id);
      if (!record) return Response.json({ error: "Analise nao encontrada." }, { status: 404 });
      if (record.user_id && record.user_id !== user.id && Number(user.is_admin) !== 1) {
        return Response.json({ error: "Acesso negado." }, { status: 403 });
      }
      return Response.json(record);
    }
    const items = Number(user.is_admin) === 1
      ? await listAnalyses(50)
      : await listAnalyses(50, user.id);
    return Response.json({ items });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao acessar o historico.", items: [] },
      { status: 200 }
    );
  }
}
