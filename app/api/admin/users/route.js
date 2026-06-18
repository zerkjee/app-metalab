import { getSessionUser, hashPassword } from "@/lib/auth";
import { listUsers, createUser, getUserByEmail, setUserPlan, setUserActive } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(request) {
  const user = await getSessionUser(request);
  return user && Number(user.is_admin) === 1 ? user : null;
}

export async function GET(request) {
  if (!(await requireAdmin(request))) {
    return Response.json({ error: "acesso restrito" }, { status: 403 });
  }
  return Response.json({ items: await listUsers() });
}

export async function POST(request) {
  if (!(await requireAdmin(request))) {
    return Response.json({ error: "acesso restrito" }, { status: 403 });
  }

  let data = {};
  try {
    const ct = request.headers.get("content-type") || "";
    data = ct.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  const action = String(data.action || "create");

  if (action === "setPlan") {
    const { id, plan, aiCredits } = data;
    const validPlans = ["free", "pro", "business"];
    if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400 });
    if (plan && !validPlans.includes(plan)) return Response.json({ error: "plano invalido" }, { status: 400 });
    await setUserPlan(String(id), plan || "free", aiCredits !== undefined ? Number(aiCredits) : undefined);
    return Response.json({ ok: true });
  }

  if (action === "setActive") {
    const { id, active } = data;
    if (!id) return Response.json({ error: "id obrigatorio" }, { status: 400 });
    await setUserActive(String(id), active !== false && active !== "false");
    return Response.json({ ok: true });
  }

  // action === "create"
  const email = String(data.email || "").toLowerCase().trim();
  const password = String(data.password || "");
  const name = String(data.name || "").trim();
  const isAdmin = data.isAdmin === true || data.isAdmin === "true" || data.isAdmin === "on";

  if (!EMAIL_RE.test(email)) return Response.json({ error: "e-mail invalido" }, { status: 400 });
  if (password.length < 6) return Response.json({ error: "senha muito curta (minimo 6)" }, { status: 400 });
  if (await getUserByEmail(email)) return Response.json({ error: "e-mail ja cadastrado" }, { status: 409 });

  await createUser({ email, name, passwordHash: hashPassword(password), isAdmin: isAdmin ? 1 : 0 });
  return Response.json({ ok: true });
}
