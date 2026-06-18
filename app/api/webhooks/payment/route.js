// Webhook de confirmação de pagamento — chamado pelo Mercado Pago ou Asaas.
// Quando as chaves chegarem: (1) setar PAYMENT_PROVIDER, (2) completar o bloco do provider.
import { setUserPlan, getUserById } from "@/lib/db";
import { notifyOwner, msgPagamento } from "@/lib/notify";

export const runtime = "nodejs";

// POST /api/webhooks/payment
export async function POST(request) {
  const provider = process.env.PAYMENT_PROVIDER || "mock";

  // ── Mercado Pago ──────────────────────────────────────────────────────────
  if (provider === "mercadopago") {
    let body = {};
    try { body = await request.json(); } catch {}

    if (body.type !== "payment") return new Response("ok", { status: 200 });

    const paymentId = body.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    // Buscar detalhes do pagamento na API do MP
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!res.ok) return new Response("ok", { status: 200 });

    const payment = await res.json();
    if (payment.status !== "approved") return new Response("ok", { status: 200 });

    // external_reference = "userId|plan"
    const [userId, plan] = String(payment.external_reference || "").split("|");
    if (userId && plan) {
      await setUserPlan(userId, plan, undefined);
      const u = await getUserById(userId).catch(() => null);
      notifyOwner("Pagamento confirmado", msgPagamento({ email: u?.email || userId, planLabel: plan }));
    }

    return new Response("ok", { status: 200 });
  }

  // ── Asaas ─────────────────────────────────────────────────────────────────
  if (provider === "asaas") {
    let body = {};
    try { body = await request.json(); } catch {}

    if (!["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(body.event)) {
      return new Response("ok", { status: 200 });
    }

    const ref = body.payment?.externalReference || "";
    const [userId, plan] = ref.split("|");
    if (userId && plan) {
      await setUserPlan(userId, plan, undefined);
      const u = await getUserById(userId).catch(() => null);
      notifyOwner("Pagamento confirmado", msgPagamento({ email: u?.email || userId, planLabel: plan }));
    }

    return new Response("ok", { status: 200 });
  }

  // ── Mock (não usa webhook — a UI chama /api/checkout confirm_mock) ────────
  return new Response("ok", { status: 200 });
}

// GET para verificar que a rota está no ar (útil na config do MP/Asaas)
export async function GET() {
  return Response.json({ ok: true, provider: process.env.PAYMENT_PROVIDER || "mock" });
}
