import { addWaitlist, listWaitlist } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notifyOwner, msgNovoLead } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const waitlistLimit = rateLimit({ windowMs: 60_000, max: 5, prefix: "waitlist" });

export async function POST(request) {
  const blocked = await waitlistLimit(request);
  if (blocked) return blocked;
  let data = {};
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return Response.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const email = String(data.email || "").trim();
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Informe um e-mail valido." }, { status: 400 });
  }

  const entry = {
    name: String(data.name || "").trim(),
    email,
    company: String(data.company || "").trim(),
    role: String(data.role || "").trim(),
    note: String(data.note || "").trim(),
    source: String(data.source || "landing").trim(),
  };

  try {
    await addWaitlist(entry);
  } catch {
    return Response.json({ error: "Nao foi possivel registrar agora." }, { status: 500 });
  }

  // Notificação WhatsApp — best-effort, não bloqueia a resposta
  notifyOwner("Novo lead", msgNovoLead(entry));

  return Response.json({ ok: true });
}

// Lista de cadastros (leads) — apenas para o administrador.
export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user || Number(user.is_admin) !== 1) {
    return Response.json({ error: "Acesso restrito." }, { status: 403 });
  }
  try {
    return Response.json({ items: await listWaitlist() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao listar.", items: [] },
      { status: 200 }
    );
  }
}
