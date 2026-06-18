"use client";

import { useCallback, useEffect, useState } from "react";
import Brand from "../../../brand";

const EMPTY_C = {
  name: "", aliases: "", unit: "mg", minClaim: "", maxAdult: "", maxChild: "", maxPregnant: "", maxLactating: "",
  forbiddenChild: false, forbiddenPregnant: false, forbiddenLactating: false, warning: "", norm: "", sourceUrl: "",
};
const EMPTY_CL = { claimText: "", constituent: "", minDose: "", unit: "mg", condition: "", norm: "", sourceUrl: "" };
const EMPTY_W = { triggerTerm: "", text: "", norm: "", sourceUrl: "" };

export default function RulesAdminPage() {
  const [data, setData] = useState({ constituents: [], claims: [], warnings: [], checklist: [] });
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [c, setC] = useState(EMPTY_C);
  const [cl, setCl] = useState(EMPTY_CL);
  const [w, setW] = useState(EMPTY_W);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/rules");
    if (r.status === 403) {
      setDenied(true);
      return;
    }
    setData(await r.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body) {
    setError("");
    try {
      const r = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "falha");
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "falha");
      return false;
    }
  }

  const verify = (type, id) => post({ action: "verify", type, id });

  if (denied) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <Brand className="login-brand" subtitle="Regras" />
          <h1 className="login-title">Acesso negado</h1>
          <a className="button" href="/app">Voltar ao app</a>
        </section>
      </main>
    );
  }

  const set = (setter) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setter((cur) => ({ ...cur, [e.target.name]: v }));
  };

  return (
    <main className="content" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="topbar">
        <h1 className="page-title">Banco de regras</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="button" href="/app/admin">Usuários</a>
          <a className="button" href="/app">Voltar ao app</a>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}

      {/* Seed ANVISA */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Importação rápida — regras ANVISA (IN 28/2018)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button primary" onClick={() => post({ action: "seedRuleset", force: false })}>
              Importar constituintes / alegações / advertências
            </button>
            <button className="button" onClick={() => {
              if (window.confirm("Isso apaga e recria todos os constituintes, alegações e advertências do seed. Continuar?")) {
                post({ action: "seedRuleset", force: true });
              }
            }}>
              Reimportar (força)
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="muted" style={{ fontSize: 13 }}>
            Popula o banco com <strong>{data.constituents.length > 0 ? data.constituents.length : "~40"} constituintes</strong>,{" "}
            <strong>{data.claims.length > 0 ? data.claims.length : "~27"} alegações autorizadas</strong> e{" "}
            <strong>{data.warnings.length > 0 ? data.warnings.length : "~13"} advertências</strong> direto da{" "}
            <strong>IN 28/2018 (Anexos III, IV, V e VI)</strong> e RDC 243/2018 — todos marcados como <em>verified</em>.{" "}
            Só semeia se o banco estiver vazio (use "Reimportar" para forçar). O RT pode adicionar ou ajustar abaixo.
          </div>
        </div>
      </section>

      {/* Checklist NUVISA (folhas) */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Checklist NUVISA — itens das folhas ({data.checklist?.length || 0})</h2>
          <button className="button primary" onClick={() => post({ action: "seedChecklist", force: false })}>
            Importar das folhas NUVISA
          </button>
        </div>
        <div className="panel-body">
          {(!data.checklist || data.checklist.length === 0) ? (
            <div className="muted">
              Clique em “Importar das folhas NUVISA” para registrar os 47 itens no banco — cada item ligado ao seu ensaio,
              com a <strong>legislação</strong> e a <strong>regra de bloqueio</strong> da folha.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Ensaio</th><th>Item</th><th>Legislação</th><th>Regra de bloqueio</th></tr>
                </thead>
                <tbody>
                  {data.checklist.map((c) => (
                    <tr key={c.id}>
                      <td>{c.ensaio}</td>
                      <td>{c.item}</td>
                      <td>{c.legislacao}</td>
                      <td>{c.regra_bloqueio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Constituintes */}
      <section className="panel">
        <div className="panel-header"><h2 className="panel-title">Constituintes / limites ({data.constituents.length})</h2></div>
        <div className="panel-body">
          <form onSubmit={async (e) => { e.preventDefault(); if (await post({ action: "add", type: "constituent", ...c })) setC(EMPTY_C); }}>
            <div className="field-grid">
              <div className="field"><label>Nome*</label><input name="name" value={c.name} onChange={set(setC)} required /></div>
              <div className="field"><label>Sinônimos (vírgula)</label><input name="aliases" value={c.aliases} onChange={set(setC)} /></div>
            </div>
            <div className="field-grid">
              <div className="field"><label>Unidade</label><input name="unit" value={c.unit} onChange={set(setC)} /></div>
              <div className="field"><label>Mín. p/ alegação</label><input name="minClaim" value={c.minClaim} onChange={set(setC)} /></div>
            </div>
            <div className="field-grid">
              <div className="field"><label>Máx. adulto</label><input name="maxAdult" value={c.maxAdult} onChange={set(setC)} /></div>
              <div className="field"><label>Máx. criança</label><input name="maxChild" value={c.maxChild} onChange={set(setC)} /></div>
            </div>
            <div className="field-grid">
              <div className="field"><label>Máx. gestante</label><input name="maxPregnant" value={c.maxPregnant} onChange={set(setC)} /></div>
              <div className="field"><label>Máx. lactante</label><input name="maxLactating" value={c.maxLactating} onChange={set(setC)} /></div>
            </div>
            <div className="actions" style={{ flexWrap: "wrap", gap: 14 }}>
              <label className="check-row" style={{ margin: 0 }}><input type="checkbox" name="forbiddenChild" checked={c.forbiddenChild} onChange={set(setC)} /><span><strong>Proibido p/ crianças</strong></span></label>
              <label className="check-row" style={{ margin: 0 }}><input type="checkbox" name="forbiddenPregnant" checked={c.forbiddenPregnant} onChange={set(setC)} /><span><strong>Proibido p/ gestantes</strong></span></label>
              <label className="check-row" style={{ margin: 0 }}><input type="checkbox" name="forbiddenLactating" checked={c.forbiddenLactating} onChange={set(setC)} /><span><strong>Proibido p/ lactantes</strong></span></label>
            </div>
            <div className="field-grid">
              <div className="field"><label>Advertência ligada</label><input name="warning" value={c.warning} onChange={set(setC)} /></div>
              <div className="field"><label>Norma</label><input name="norm" value={c.norm} onChange={set(setC)} /></div>
            </div>
            <div className="field"><label>Fonte (link)</label><input name="sourceUrl" value={c.sourceUrl} onChange={set(setC)} /></div>
            <div className="actions"><button className="button primary" type="submit">Adicionar constituinte (verificado)</button></div>
          </form>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Nome</th><th>Un.</th><th>Adulto</th><th>Criança</th><th>Gest.</th><th>Lact.</th><th>Proibições</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.constituents.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td><td>{r.unit}</td><td>{r.max_adult || "—"}</td><td>{r.max_child || "—"}</td>
                    <td>{r.max_pregnant || "—"}</td><td>{r.max_lactating || "—"}</td>
                    <td>{[Number(r.forbidden_child) && "cri", Number(r.forbidden_pregnant) && "gest", Number(r.forbidden_lactating) && "lact"].filter(Boolean).join(", ") || "—"}</td>
                    <td><span className={`badge ${r.status === "verified" ? "A" : "SE"}`}>{r.status}</span></td>
                    <td>{r.status !== "verified" && <button className="button" onClick={() => verify("constituent", r.id)}>Verificar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Alegacoes */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header"><h2 className="panel-title">Alegações autorizadas ({data.claims.length})</h2></div>
        <div className="panel-body">
          <form onSubmit={async (e) => { e.preventDefault(); if (await post({ action: "add", type: "claim", ...cl })) setCl(EMPTY_CL); }}>
            <div className="field"><label>Texto da alegação*</label><input name="claimText" value={cl.claimText} onChange={set(setCl)} required /></div>
            <div className="field-grid">
              <div className="field"><label>Constituinte que sustenta</label><input name="constituent" value={cl.constituent} onChange={set(setCl)} /></div>
              <div className="field"><label>Dose mínima</label><input name="minDose" value={cl.minDose} onChange={set(setCl)} /></div>
            </div>
            <div className="field-grid">
              <div className="field"><label>Unidade</label><input name="unit" value={cl.unit} onChange={set(setCl)} /></div>
              <div className="field"><label>Norma</label><input name="norm" value={cl.norm} onChange={set(setCl)} /></div>
            </div>
            <div className="actions"><button className="button primary" type="submit">Adicionar alegação (verificada)</button></div>
          </form>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Alegação</th><th>Constituinte</th><th>Mín.</th><th>Norma</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.claims.map((r) => (
                  <tr key={r.id}>
                    <td>{r.claim_text}</td><td>{r.constituent || "—"}</td><td>{r.min_dose ? `${r.min_dose} ${r.unit || ""}` : "—"}</td>
                    <td>{r.norm || "—"}</td>
                    <td><span className={`badge ${r.status === "verified" ? "A" : "SE"}`}>{r.status}</span></td>
                    <td>{r.status !== "verified" && <button className="button" onClick={() => verify("claim", r.id)}>Verificar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Advertencias */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header"><h2 className="panel-title">Advertências obrigatórias ({data.warnings.length})</h2></div>
        <div className="panel-body">
          <form onSubmit={async (e) => { e.preventDefault(); if (await post({ action: "add", type: "warning", ...w })) setW(EMPTY_W); }}>
            <div className="field-grid">
              <div className="field"><label>Gatilho* (ex.: cafeina)</label><input name="triggerTerm" value={w.triggerTerm} onChange={set(setW)} required /></div>
              <div className="field"><label>Norma</label><input name="norm" value={w.norm} onChange={set(setW)} /></div>
            </div>
            <div className="field"><label>Texto da advertência*</label><input name="text" value={w.text} onChange={set(setW)} required /></div>
            <div className="actions"><button className="button primary" type="submit">Adicionar advertência (verificada)</button></div>
          </form>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Gatilho</th><th>Texto</th><th>Norma</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.warnings.map((r) => (
                  <tr key={r.id}>
                    <td>{r.trigger_term}</td><td>{r.text}</td><td>{r.norm || "—"}</td>
                    <td><span className={`badge ${r.status === "verified" ? "A" : "SE"}`}>{r.status}</span></td>
                    <td>{r.status !== "verified" && <button className="button" onClick={() => verify("warning", r.id)}>Verificar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
