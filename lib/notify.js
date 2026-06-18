// Notificações para o dono do produto — nunca lança exceção.
//
// ── Resend (e-mail, recomendado) ─────────────────────────────────────────────
// NOTIFY_PROVIDER=resend  (padrão)
// RESEND_API_KEY=re_xxxxxxxxxxxx
// NOTIFY_EMAIL_TO=mlmetalab@gmail.com
//
// ── Telegram (push no celular, gratuito) ─────────────────────────────────────
// NOTIFY_PROVIDER=telegram
// TELEGRAM_BOT_TOKEN=123456:ABCDxxxx
// TELEGRAM_CHAT_ID=123456789
//
// ── Z-API (WhatsApp pago) ────────────────────────────────────────────────────
// NOTIFY_PROVIDER=zapi
// WHATSAPP_PHONE=+5511999999999
// ZAPI_INSTANCE_ID=xxx
// ZAPI_TOKEN=xxx
// ZAPI_CLIENT_TOKEN=xxx  (opcional)

async function sendResend(subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !to) throw new Error("RESEND_API_KEY ou NOTIFY_EMAIL_TO não configurados");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "METALAB <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend retornou ${res.status}: ${body}`);
  }
}

async function sendTelegram(subject, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados");

  const message = `*[METALAB] ${subject}*\n${text}`;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram retornou ${res.status}: ${body}`);
  }
}

async function sendZapi(phone, text) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) throw new Error("ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados");

  const clean = phone.replace(/\D/g, "");
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const headers = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: clean, message: text }),
  });
  if (!res.ok) throw new Error(`Z-API retornou ${res.status}`);
}

export async function notifyOwner(subject, text) {
  const provider = process.env.NOTIFY_PROVIDER || "resend";

  try {
    if (provider === "telegram") {
      await sendTelegram(subject, text);
    } else if (provider === "zapi") {
      const phone = process.env.WHATSAPP_PHONE;
      if (!phone) return;
      await sendZapi(phone, `*${subject}*\n${text}`);
    } else {
      // resend é o padrão
      await sendResend(`[METALAB] ${subject}`, text);
    }
  } catch (err) {
    console.error("[notify] falhou:", err?.message || err);
  }
}

export function msgNovoLead({ name, email, company, role }) {
  const linhas = [
    `Nome: ${name || "—"}`,
    `E-mail: ${email}`,
    company ? `Empresa: ${company}` : null,
    role ? `Cargo: ${role}` : null,
    `\nAcesse: https://estou-precisando-criar-um-agente-de.vercel.app/app/admin`,
  ].filter(Boolean);
  return linhas.join("\n");
}

export function msgPagamento({ email, planLabel }) {
  return [
    `E-mail: ${email}`,
    `Plano: ${planLabel}`,
    `\nAcesse: https://estou-precisando-criar-um-agente-de.vercel.app/app/admin`,
  ].join("\n");
}
