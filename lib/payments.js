// Abstração de gateway de pagamento.
// PAYMENT_PROVIDER=mock (padrão) | mercadopago | asaas
// Quando as chaves chegarem, basta setar a env e descomentar o bloco correto.

export const PLAN_PRICES = {
  pro: {
    label: "Pro",
    priceMonthly: 19700, // centavos
    priceDisplay: "R$ 197",
    period: "/mês",
    description: "200 análises + 50 com IA por mês",
  },
  business: {
    label: "Business",
    priceMonthly: 69700,
    priceDisplay: "R$ 697",
    period: "/mês",
    description: "2.000 análises + 500 com IA por mês",
  },
};

export const CREDIT_PRICE = {
  unit: 900, // R$ 9 por crédito
  pack5: 4500, // R$ 45 — pack de 5
  pack20: 14900, // R$ 149 — pack de 20
};

// Cria sessão de checkout. Retorna { mode, ... } dependendo do provider.
export async function createCheckout({ plan, userId, userEmail, successUrl, failUrl }) {
  const planInfo = PLAN_PRICES[plan];
  if (!planInfo) throw new Error("Plano inválido");

  const provider = process.env.PAYMENT_PROVIDER || "mock";

  // ── Mercado Pago Checkout Pro ─────────────────────────────────────────────
  if (provider === "mercadopago") {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

    const body = {
      items: [{ title: `METALAB ${planInfo.label} — mensal`, quantity: 1, unit_price: planInfo.priceMonthly / 100, currency_id: "BRL" }],
      payer: { email: userEmail },
      external_reference: `${userId}|${plan}`,
      back_urls: { success: successUrl, failure: failUrl, pending: failUrl },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment`,
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`MP error: ${res.status}`);
    const data = await res.json();
    return { mode: "redirect", url: data.init_point };
  }

  // ── Asaas ─────────────────────────────────────────────────────────────────
  if (provider === "asaas") {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) throw new Error("ASAAS_API_KEY não configurado");

    // 1) criar/buscar cliente no Asaas
    // 2) criar cobrança Pix
    // 3) retornar { mode: "redirect", url: charge.invoiceUrl }
    // TODO: implementar quando as chaves chegarem
    throw new Error("Asaas: implementar com as chaves");
  }

  // ── Mock (demonstração) ───────────────────────────────────────────────────
  const pixKey = `00020126580014br.gov.bcb.pix0136${userId.slice(0, 32)}5204000053039865406${(planInfo.priceMonthly / 100).toFixed(2).replace(".", "")}5802BR5910MetaLab6009SAOPAU62290525METALAB${plan.toUpperCase()}${Date.now().toString().slice(-8)}6304`;
  const checksum = "ABCD"; // checksum falso p/ demo
  return {
    mode: "mock",
    plan,
    amount: planInfo.priceDisplay,
    pixCode: pixKey + checksum,
    pixKey: `metalab-demo-${plan}@pix.demo`,
  };
}

// Verifica assinatura do webhook do MP e extrai { userId, plan, status }.
export function parseMPWebhook(body, headers) {
  // TODO: validar assinatura HMAC do MP quando a chave chegar
  const { data, type } = body || {};
  if (type !== "payment") return null;
  const paymentId = data?.id;
  return { paymentId }; // chamar MP API para buscar external_reference
}
