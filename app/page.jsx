"use client";

import { useState } from "react";
import Brand from "./brand";

export default function Landing() {
  const [data, setData] = useState({ name: "", email: "", company: "", role: "", note: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");

  function update(event) {
    setData((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "landing" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao enviar.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar.");
      setStatus("error");
    }
  }

  return (
    <main className="lp">
      <header className="lp-nav">
        <Brand subtitle="Conformidade ANVISA com IA" />
        <a className="button" href="/app">Já tenho acesso</a>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-badge">Pré-lançamento · suplementos alimentares</span>
          <h1 className="lp-title">
            O primeiro copiloto de IA que audita seu rótulo direto nas regras da ANVISA
          </h1>
          <p className="lp-sub">
            Envie a arte do rótulo e receba, em minutos, um laudo de pré-auditoria no padrão
            SRS&nbsp;BH&nbsp;/&nbsp;NUVISA: ingrediente por ingrediente (dose máxima, limites para
            crianças, gestantes e lactantes), todas as alegações, regularização e advertências —
            com a fonte oficial e a data de cada checagem.
          </p>
          <form className="lp-form" onSubmit={submit}>
            {status === "done" ? (
              <div className="lp-done">
                <strong>Solicitação recebida!</strong>
                <span>
                  Entraremos em contato pelo e-mail informado para liberar seu acesso e agendar a
                  <b> análise gratuita do seu rótulo</b>. Fique de olho na caixa de entrada.
                </span>
              </div>
            ) : (
              <>
                <div className="lp-form-row">
                  <input name="name" placeholder="Seu nome" value={data.name} onChange={update} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="E-mail*"
                    value={data.email}
                    onChange={update}
                  />
                </div>
                <div className="lp-form-row">
                  <input name="company" placeholder="Empresa / marca" value={data.company} onChange={update} />
                  <input name="role" placeholder="Seu cargo (ex.: dono, RT, regulatório)" value={data.role} onChange={update} />
                </div>
                <button className="button primary lp-cta" type="submit" disabled={status === "sending"}>
                  {status === "sending" ? "Enviando..." : "Quero a análise gratuita do meu rótulo"}
                </button>
                {error && <div className="form-error">{error}</div>}
                <small className="lp-formnote">
                  Sem custo e sem compromisso. Usamos seus dados apenas para entrar em contato.
                </small>
              </>
            )}
          </form>
        </div>
        <div className="lp-hero-card">
          <div className="lp-card-title">O que o laudo entrega</div>
          <ul className="lp-card-list">
            <li>✅ Análise profunda por ingrediente: dose permitida vs. dose do rótulo</li>
            <li>✅ Limites para crianças, gestantes e lactantes</li>
            <li>✅ Checklist completo das folhas NUVISA (atende / não atende)</li>
            <li>✅ Alegações: o que é permitido e o texto autorizado</li>
            <li>✅ Rito de regularização (RDC 843/2024 + IN 281/2024)</li>
            <li>✅ Cada conclusão com a norma, o link e a data</li>
          </ul>
        </div>
      </section>

      <section className="lp-stats">
        <div className="lp-stat">
          <strong>92,6%</strong>
          <span>de não conformidade em rótulos de proteicos importados (estudo acadêmico)</span>
        </div>
        <div className="lp-stat">
          <strong>R$ 13,8 bi</strong>
          <span>mercado de suplementos no Brasil projetado até 2030</span>
        </div>
        <div className="lp-stat">
          <strong>RDC 975/2025</strong>
          <span>novas regras de aditivos com prazo até 31/03/2026</span>
        </div>
      </section>

      <section className="lp-how">
        <h2 className="lp-h2">Como funciona</h2>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-n">1</div>
            <strong>Envie o rótulo</strong>
            <p>Suba o PDF ou fotos da embalagem. A IA lê o texto (OCR) automaticamente.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-n">2</div>
            <strong>A IA pesquisa a ANVISA ao vivo</strong>
            <p>Consulta as normas oficiais vigentes e o portal da ANVISA, ingrediente por ingrediente.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-n">3</div>
            <strong>Você recebe o laudo</strong>
            <p>Relatório no padrão NUVISA, com riscos, ajustes sugeridos e fontes. Pronto para o RT revisar.</p>
          </div>
        </div>
      </section>

      <section className="lp-who">
        <h2 className="lp-h2">Para quem é</h2>
        <div className="lp-who-grid">
          <div className="lp-who-card">
            <strong>Marcas de suplemento</strong>
            <p>Que não têm um time regulatório dedicado e querem reduzir risco de exigência e recolhimento.</p>
          </div>
          <div className="lp-who-card">
            <strong>Fábricas terceiristas</strong>
            <p>Que precisam validar rótulos de muitos clientes com rapidez e padronização.</p>
          </div>
          <div className="lp-who-card">
            <strong>Consultorias regulatórias</strong>
            <p>Que querem multiplicar a produtividade da equipe e entregar laudos mais rápido.</p>
          </div>
        </div>
      </section>

      {/* Preços resumidos */}
      <section className="lp-pricing">
        <h2 className="lp-h2">Planos</h2>
        <p className="lp-sub" style={{ marginBottom: 18 }}>
          Acesso por convite durante o período de lançamento.
          Preencha o formulário acima para solicitar sua vaga.
        </p>
        <div className="pricing-grid">
          {[
            {
              label: "Grátis",
              price: "R$ 0",
              desc: "5 análises/mês · conferência determinística",
              cta: "Solicitar acesso gratuito",
              onClick: true,
              primary: false,
            },
            {
              label: "Pro",
              price: "R$ 197/mês",
              desc: "200 análises + 50 com IA · pesquisa ANVISA ao vivo",
              cta: "Solicitar acesso Pro",
              onClick: true,
              primary: true,
              highlight: true,
            },
            {
              label: "Business",
              price: "R$ 697/mês",
              desc: "2.000 análises + 500 com IA · múltiplos usuários",
              cta: "Solicitar acesso Business",
              onClick: true,
              primary: false,
            },
          ].map((p) => (
            <div key={p.label} className={`plan-card${p.highlight ? " highlight" : ""}`}>
              <div className="plan-label">{p.label}</div>
              <div className="plan-price-row">
                <span className="plan-price" style={{ fontSize: 22 }}>{p.price}</span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>{p.desc}</p>
              <button
                className={`button${p.primary ? " primary" : ""}`}
                style={{ display: "block", width: "100%", cursor: "pointer" }}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <div className="lp-pricing-link">
          <a href="/precos">Ver todos os recursos e comparativo de planos →</a>
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-h2">Garanta sua análise gratuita</h2>
        <p className="lp-sub">Estamos selecionando as primeiras marcas e consultorias para testar o agente.</p>
        <a className="button primary lp-cta" href="#topo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Entrar na lista
        </a>
      </section>

      <footer className="lp-footer">
        <span>METALAB · Pré-auditoria de rotulagem com IA · Apoio à decisão; a liberação final é do Responsável Técnico.</span>
      </footer>
    </main>
  );
}
