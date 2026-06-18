"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Brand from "../brand";

const PLAN_INFO = {
  pro: {
    label: "Pro",
    price: "R$ 197",
    period: "/mês",
    features: ["200 análises/mês", "50 análises com IA", "Pesquisa ANVISA ao vivo", "Export PDF"],
  },
  business: {
    label: "Business",
    price: "R$ 697",
    period: "/mês",
    features: ["2.000 análises/mês", "500 análises com IA", "Tudo do Pro", "Suporte prioritário"],
  },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className="button" onClick={copy} style={{ fontSize: 13 }}>
      {copied ? "Copiado ✓" : "Copiar código Pix"}
    </button>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const plan = params.get("plan");
  const planInfo = PLAN_INFO[plan];

  const [me, setMe] = useState(null);
  const [step, setStep] = useState("form"); // form | pix | success | error
  const [pix, setPix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({ name: "", cpf: "" });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!m) { window.location.href = `/login?next=/checkout?plan=${plan}`; return; }
        setMe(m);
        setForm((f) => ({ ...f, name: m.name || "" }));
        if (m.plan === plan) setStep("already");
      })
      .catch(() => { window.location.href = `/login?next=/checkout?plan=${plan}`; });
  }, [plan]);

  if (!planInfo) {
    return (
      <main className="login-shell">
        <section className="login-panel" style={{ textAlign: "center" }}>
          <Brand className="login-brand" />
          <p className="login-copy">Plano não encontrado.</p>
          <a className="button" href="/precos">Ver planos</a>
        </section>
      </main>
    );
  }

  function updateForm(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrMsg("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar checkout");

      if (data.mode === "redirect") {
        window.location.href = data.url;
        return;
      }

      // mock
      setPix(data);
      setStep("pix");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function confirmMock() {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_mock", plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao confirmar");
      setStep("success");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (step === "already") {
    return (
      <main className="login-shell">
        <section className="login-panel" style={{ textAlign: "center" }}>
          <Brand className="login-brand" />
          <div style={{ fontSize: 40, margin: "12px 0 4px" }}>✓</div>
          <h1 className="login-title">Você já tem o plano {planInfo.label}</h1>
          <p className="login-copy">Sua conta já está no plano {planInfo.label}.</p>
          <a className="button primary" href="/app" style={{ display: "block", textAlign: "center" }}>Ir para o app</a>
        </section>
      </main>
    );
  }

  if (step === "success") {
    return (
      <main className="login-shell">
        <section className="login-panel" style={{ textAlign: "center" }}>
          <Brand className="login-brand" />
          <div style={{ fontSize: 48, margin: "8px 0" }}>🎉</div>
          <h1 className="login-title">Plano {planInfo.label} ativado!</h1>
          <p className="login-copy">
            Sua conta foi atualizada. Você já tem acesso à análise por IA com pesquisa ANVISA ao vivo.
          </p>
          <a className="button primary" href="/app" style={{ display: "block", textAlign: "center" }}>
            Ir para o app →
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-shell">
      <header className="lp-nav" style={{ maxWidth: 900, margin: "0 auto", padding: "12px 22px 20px" }}>
        <Brand subtitle="Checkout" />
        <a className="button" href="/precos">Ver planos</a>
      </header>

      <div className="checkout-body">
        {/* Resumo do plano */}
        <aside className="checkout-summary">
          <div className="checkout-plan-card">
            <div className="checkout-plan-label">Plano {planInfo.label}</div>
            <div className="checkout-plan-price">
              {planInfo.price}<span>{planInfo.period}</span>
            </div>
            <ul className="checkout-features">
              {planInfo.features.map((f) => (
                <li key={f}><span style={{ color: "var(--ok)" }}>✓</span> {f}</li>
              ))}
            </ul>
            <div className="checkout-plan-note">
              Renovação mensal · Cancele quando quiser
            </div>
          </div>
        </aside>

        {/* Formulário / Pix */}
        <section className="checkout-main">
          {step === "form" && (
            <div className="checkout-panel">
              <h2 className="checkout-title">Seus dados</h2>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Nome completo</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    required
                    disabled={loading}
                    placeholder="Como aparece no seu CPF"
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input value={me?.email || ""} disabled style={{ opacity: 0.7 }} />
                </div>
                <div className="field">
                  <label>CPF</label>
                  <input
                    name="cpf"
                    value={form.cpf}
                    onChange={updateForm}
                    placeholder="000.000.000-00"
                    disabled={loading}
                    pattern="\d{3}\.?\d{3}\.?\d{3}-?\d{2}"
                  />
                </div>

                <div className="checkout-method-label">Forma de pagamento</div>
                <label className="checkout-method-row active">
                  <span className="checkout-method-icon">Pix</span>
                  <span>
                    <strong>Pix</strong>
                    <small>Aprovação imediata</small>
                  </span>
                </label>
                <label className="checkout-method-row disabled">
                  <span className="checkout-method-icon" style={{ opacity: 0.5 }}>💳</span>
                  <span>
                    <strong style={{ opacity: 0.5 }}>Cartão de crédito</strong>
                    <small style={{ opacity: 0.5 }}>Em breve</small>
                  </span>
                </label>

                {errMsg && <div className="form-error" style={{ marginTop: 10 }}>{errMsg}</div>}

                <div className="actions" style={{ marginTop: 18 }}>
                  <button className="button primary lp-cta" type="submit" disabled={loading} style={{ flex: 1 }}>
                    {loading ? "Gerando Pix..." : `Gerar Pix — ${planInfo.price}${planInfo.period}`}
                  </button>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8, textAlign: "center" }}>
                  Pagamento seguro · Dados protegidos
                </p>
              </form>
            </div>
          )}

          {step === "pix" && pix && (
            <div className="checkout-panel">
              <h2 className="checkout-title">Pagar via Pix</h2>
              <div className="pix-amount">
                {pix.amount}<span>{planInfo.period}</span>
              </div>

              {/* QR Code placeholder */}
              <div className="pix-qr-wrap">
                <div className="pix-qr-box">
                  <div className="pix-qr-inner">
                    {/* grade simulada de QR */}
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className="pix-qr-cell"
                        style={{ background: Math.random() > 0.45 ? "var(--ink)" : "transparent" }}
                      />
                    ))}
                  </div>
                </div>
                <p className="pix-qr-label">Escaneie com o app do seu banco</p>
              </div>

              <div className="pix-key-row">
                <span className="pix-key-label">Chave Pix:</span>
                <code className="pix-key">{pix.pixKey}</code>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <CopyButton text={pix.pixCode} />
              </div>

              {/* Banner de demo */}
              <div className="pix-demo-banner">
                <strong>Modo demonstração</strong>
                <p>Esta é uma simulação do fluxo de pagamento. Nenhum valor real será cobrado. Clique abaixo para simular a confirmação do pagamento.</p>
                <button
                  className="button primary"
                  onClick={confirmMock}
                  disabled={loading}
                  style={{ marginTop: 10, width: "100%" }}
                >
                  {loading ? "Ativando plano..." : "Simular pagamento confirmado ✓"}
                </button>
                {errMsg && <div className="form-error" style={{ marginTop: 8 }}>{errMsg}</div>}
              </div>

              <button
                className="button"
                onClick={() => setStep("form")}
                style={{ marginTop: 10, fontSize: 13 }}
                disabled={loading}
              >
                ← Voltar
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
