"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Brand from "../../brand";

marked.setOptions({ gfm: true, breaks: true });

export default function AnaliseRapidaPage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productName: "",
    brand: "",
    category: "Suplemento alimentar",
    version: "",
    labelText: "",
  });

  const reportHtml = useMemo(() => (report ? DOMPurify.sanitize(marked.parse(report)) : ""), [report]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (m) setMe(m); })
      .catch(() => {});
  }, []);

  function updateField(e) {
    if (loading) return;
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  }

  async function analyze() {
    if (loading) return;
    if (!form.labelText.trim()) {
      setError("Cole o texto da embalagem no campo abaixo antes de analisar.");
      return;
    }
    setLoading(true);
    setError("");
    setReport("");
    try {
      const res = await fetch("/api/analise-rapida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao analisar.");
      setReport(data.reportMd || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao analisar.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const name = (form.productName || "relatorio").replace(/[^\w.-]+/g, "_");
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conferencia_${name}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  // Bloqueio de plano: mostra aviso se o usuário carregou e não tem bulkText
  const blocked = me && !me.bulkText;

  return (
    <main className="shell">
      <aside className="sidebar">
        <Brand subtitle="Rotulagem regulatória" />
        <div className="nav-section">
          <a className="nav-item nav-link" href="/app">IA</a>
          <a className="nav-item nav-link" href="/app/analise-rapida" style={{ background: "rgba(255,255,255,0.12)", borderRadius: 6 }}>
            Texto
          </a>
        </div>
        <button className="button" onClick={logout} style={{ marginLeft: "auto", fontSize: 12, minHeight: 32, padding: "4px 10px" }}>Sair</button>
      </aside>

      <section className="content">
        <div className="topbar">
          <h1 className="page-title">Análise rápida por texto</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="status-pill">Determinístico · sem IA</div>
            {report && (
              <button className="button" onClick={downloadReport}>Baixar (.md)</button>
            )}
          </div>
        </div>

        {blocked ? (
          <div className="workspace">
            <section className="panel">
              <div className="panel-body" style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
                <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>Disponível nos planos Pro e Business</h2>
                <p className="muted" style={{ maxWidth: 420, margin: "0 auto 24px" }}>
                  A análise rápida por texto cola o conteúdo completo da embalagem e roda a conferência determinística
                  (checklist NUVISA + limites ANVISA) sem gastar tokens de IA. Disponível a partir do plano Pro.
                </p>
                <a className="button primary" href="/precos">Ver planos e fazer upgrade →</a>
              </div>
            </section>
          </div>
        ) : (
          <div className="workspace">
            <section className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Dados do produto</h2>
              </div>
              <div className="panel-body">
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="ar-name">Produto</label>
                    <input id="ar-name" name="productName" value={form.productName} onChange={updateField} disabled={loading} placeholder="Ex: Condroless Complex" />
                  </div>
                  <div className="field">
                    <label htmlFor="ar-brand">Marca</label>
                    <input id="ar-brand" name="brand" value={form.brand} onChange={updateField} disabled={loading} placeholder="Ex: Laboratório XYZ" />
                  </div>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="ar-cat">Categoria</label>
                    <input id="ar-cat" name="category" value={form.category} onChange={updateField} disabled={loading} />
                  </div>
                  <div className="field">
                    <label htmlFor="ar-ver">Versão do rótulo</label>
                    <input id="ar-ver" name="version" value={form.version} onChange={updateField} disabled={loading} placeholder="Ex: V012025" />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="ar-text">
                    Texto completo da embalagem
                    <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                      Cole tudo: tabela nutricional, ingredientes, advertências, modo de uso, etc.
                    </span>
                  </label>
                  <textarea
                    id="ar-text"
                    name="labelText"
                    value={form.labelText}
                    onChange={updateField}
                    disabled={loading}
                    style={{ minHeight: 260, fontFamily: "monospace", fontSize: 13 }}
                    placeholder={`Cole aqui TODO o texto da embalagem, por exemplo:\n\nSUPLEMENTO ALIMENTAR EM COMPRIMIDOS\nProduto XYZ\nVitamina C 500 mg\nPorção: 1 comprimido (600 mg)\n...\nIngredientes: Vitamina C, Celulose microcristalina, ...\nNão contém glúten. Não contém lactose.\nEste produto não é um medicamento.\nLote e validade impressos na embalagem.`}
                  />
                </div>

                <div className="actions">
                  <button className="button primary" onClick={analyze} disabled={loading}>
                    {loading ? "Analisando…" : "Analisar sem IA"}
                  </button>
                  <button className="button" onClick={() => { setForm((f) => ({ ...f, labelText: "" })); setReport(""); setError(""); }} disabled={loading}>
                    Limpar
                  </button>
                </div>
                {error && <div className="form-error">{error}</div>}
              </div>
            </section>

            {report && (
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Conferência automática</h2>
                  <span className="status-pill">Determinístico · sem IA · sem tokens</span>
                </div>
                <div className="panel-body">
                  <article className="markdown" dangerouslySetInnerHTML={{ __html: reportHtml }} />
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
