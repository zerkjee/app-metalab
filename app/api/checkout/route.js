import { getSessionUser } from "@/lib/auth";
import { setUserPlan } from "@/lib/db";
import { createCheckout, PLAN_PRICES } from "@/lib/payments";
import { notifyOwner, msgPagamento } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "login necessario" }, { status: 401 });

  let data = {};
  try { data = await request.json(); } catch {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  const { action, plan } = data;

  if (!PLAN_PRICES[plan]) {
    return Response.json({ error: "plano invalido" }, { status: 400 });
  }

  // ── Criar sessão de checkout ──────────────────────────────────────────────
  if (action === "create") {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    try {
      const result = await createCheckout({
        plan,
        userId: user.id,
        userEmail: user.email,
        successUrl: `${origin}/checkout/sucesso?plan=${plan}`,
        failUrl: `${origin}/checkout?plan=${plan}&erro=1`,
      });
      return Response.json(result);
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Erro ao criar checkout" }, { status: 500 });
    }
  }

  if (action === "confirm_mock") {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "mock desabilitado em produção" }, { status: 403 });
    }
    await setUserPlan(user.id, plan, undefined);
    notifyOwner("Pagamento confirmado", msgPagamento({ email: user.email, planLabel: PLAN_PRICES[plan].label }));
    return Response.json({ ok: true, plan, planLabel: PLAN_PRICES[plan].label });
  }

  return Response.json({ error: "acao invalida" }, { status: 400 });
}
