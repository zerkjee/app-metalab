"use client";

import Brand from "../brand";

const PLANS = [
  {
    id: "free",
    label: "Grátis",
    price: "R$ 0",
    period: "",
    highlight: false,
    features: [
      "5 análises por mês",
      "Conferência determinística completa",
      "Checklist NUVISA automático (47 itens)",
      "Banco de regras públicos",
    ],
    missing: ["Análise por IA", "Pesquisa ANVISA ao vivo", "Export PDF do laudo"],
    cta: "Solicitar acesso gratuito",
    href: "/#lista",
    primary: false,
  },
  {
    id: "pro",
    label: "Pro",
    badge: "Mais popular",
    price: "R$ 197",
    period: "/mês",
    highlight: true,
    features: [
      "200 análises por mês",
      "50 análises com IA por mês",
      "Pesquisa ANVISA ao vivo por ingrediente",
      "Leitura de PDF e foto (OCR automático)",
      "Laudo NUVISA completo com evidências",
      "Detecção de alegações terapêuticas disfarçadas",
      "Export PDF do laudo",
    ],
    missing: [],
    cta: "Assinar Pro",
    href: "/checkout?plan=pro",
    primary: true,
  },
  {
    id: "business",
    label: "Business",
    price: "R$ 697",
    period: "/mês",
    highlight: false,
    features: [
      "2.000 análises por mês",
      "500 análises com IA por mês",
      "Tudo do plano Pro",
      "Múltiplos usuários na conta",
      "Suporte prioritário via WhatsApp",
      "API de integração (em breve)",
    ],
    missing: [],
    cta: "Assinar Business",
    href: "/checkout?plan=business",
    primary: false,
  },
];

const CREDITS = [
  { qty: 5, price: "R$ 45", unit: "R$ 9/crédito" },
  { qty: 20, price: "R$ 149", unit: "R$ 7,45/crédito", tag: "Melhor valor" },
];

export default function PrecosPage() {
  return (
    <main className="lp">
      <header className="lp-nav">
        <Brand subtitle="Planos e preços" />
        <div style={{ display: "flex", gap: 8 }}>
          <a className="button" href="/">Início</a>
          <a className="button" href="/app">Já tenho acesso</a>
        </div>
      </header>

      <section style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <span className="lp-badge">Acesso fechado — planos mensais</span>
        <h1 className="lp-title" style={{ fontSize: 36, maxWidth: 620, margin: "14px auto 10px" }}>
          Escolha o plano certo para o seu volume
        </h1>
        <p className="lp-sub" style={{ maxWidth: 500, margin: "0 auto" }}>
          Todos os planos incluem o motor de conformidade determinístico. A IA entra nos planos pagos.
        </p>
      </section>

      {/* Cards de plano */}
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <div key={p.id} className={`plan-card${p.highlight ? " highlight" : ""}`}>
            {p.badge && <div className="plan-badge">{p.badge}</div>}
            <div className="plan-label">{p.label}</div>
            <div className="plan-price-row">
              <span className="plan-price">{p.price}</span>
              {p.period && <span className="plan-period">{p.period}</span>}
            </div>
            <ul className="plan-features">
              {p.features.map((f) => (
                <li key={f}><span className="feat-ok">✓</span> {f}</li>
              ))}
              {p.missing.map((f) => (
                <li key={f} className="feat-row-missing"><span className="feat-no">✗</span> {f}</li>
              ))}
            </ul>
            <a
              className={`button lp-cta${p.primary ? " primary" : ""}`}
              href={p.href}
              style={{ textAlign: "center", display: "block", marginTop: "auto" }}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Créditos avulsos */}
      <section style={{ marginTop: 48 }}>
        <h2 className="lp-h2" style={{ textAlign: "center", marginTop: 0 }}>Créditos de IA avulsos</h2>
        <p className="lp-sub" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto 20px" }}>
          Acabou a cota de IA do mês? Compre créditos e continue sem esperar o ciclo reiniciar.
        </p>
        <div className="credits-grid">
          {CREDITS.map((c) => (
            <div key={c.qty} className="credit-card">
              {c.tag && <div className="credit-tag">{c.tag}</div>}
              <div className="credit-qty">{c.qty} créditos de IA</div>
              <div className="credit-price">{c.price}</div>
              <div className="credit-unit">{c.unit}</div>
              <a className="button" href={`/checkout?credits=${c.qty}`} style={{ display: "block", textAlign: "center", marginTop: 14 }}>
                Comprar
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ marginTop: 52 }}>
        <h2 className="lp-h2">Perguntas frequentes</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <strong>O que é o "motor determinístico"?</strong>
            <p>É uma conferência automática baseada no banco de regras da ANVISA (limites por ingrediente, alegações autorizadas, advertências obrigatórias). Roda instantâneo, sem IA, disponível em todos os planos.</p>
          </div>
          <div className="faq-item">
            <strong>O que a IA faz que o motor não faz?</strong>
            <p>A IA lê fotos/PDF da embalagem (OCR), detecta alegações terapêuticas disfarçadas, pesquisa ao vivo no site da ANVISA para ingredientes sem regra no banco, e redige o laudo completo no padrão NUVISA com fonte e data.</p>
          </div>
          <div className="faq-item">
            <strong>Posso cancelar a qualquer momento?</strong>
            <p>Sim. O plano é mensal e você pode cancelar sem multa. Após o cancelamento, sua conta retorna ao plano Grátis no próximo ciclo.</p>
          </div>
          <div className="faq-item">
            <strong>O laudo substitui o Responsável Técnico?</strong>
            <p>Não. O METALAB é uma ferramenta de pré-auditoria e apoio à decisão. A liberação final e a responsabilidade técnica são sempre do RT registrado na ANVISA.</p>
          </div>
          <div className="faq-item">
            <strong>Formas de pagamento aceitas?</strong>
            <p>Pix e cartão de crédito (Visa, Mastercard, Elo). Os pagamentos são processados com segurança pelo Mercado Pago.</p>
          </div>
          <div className="faq-item">
            <strong>Meus dados são seguros?</strong>
            <p>Sim. Os dados dos seus rótulos são armazenados de forma criptografada no Brasil (São Paulo, Neon Postgres). Não compartilhamos com terceiros.</p>
          </div>
        </div>
      </section>

      <section className="lp-final" style={{ marginTop: 48 }}>
        <h2 className="lp-h2" style={{ marginTop: 0 }}>Tem dúvida antes de assinar?</h2>
        <p className="lp-sub">Fale com a gente antes de qualquer compromisso.</p>
        <a className="button primary lp-cta" href="/" style={{ display: "inline-block", width: "auto" }}>
          Entrar na lista de espera
        </a>
      </section>

      <footer className="lp-footer">
        <span>METALAB · Pré-auditoria de rotulagem com IA · Apoio à decisão; a liberação final é do Responsável Técnico.</span>
      </footer>
    </main>
  );
}
