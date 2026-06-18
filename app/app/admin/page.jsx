"use client";

import { useCallback, useEffect, useState } from "react";
import Brand from "../../brand";

const PLAN_OPTIONS = ["free", "pro", "business"];
const PLAN_LABELS = { free: "Grátis", pro: "Pro", business: "Business" };

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", isAdmin: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editing, setEditing] = useState(null); // { id, plan, aiCredits }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.status === 403) { setDenied(true); return; }
      const data = await response.json();
      setUsers(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("Falha ao carregar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(event) {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [event.target.name]: value }));
  }

  async function post(body) {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha");
    return data;
  }

  async function createUser(event) {
    event.preventDefault();
    setSaving(true);
    setError(""); setOk("");
    try {
      await post({ action: "create", ...form });
      setOk(`Usuario ${form.email} cadastrado.`);
      setForm({ name: "", email: "", password: "", isAdmin: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(u) {
    setError("");
    try {
      await post({ action: "setPlan", id: u.id, plan: editing.plan, aiCredits: editing.aiCredits });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar plano.");
    }
  }

  async function toggleActive(u) {
    setError("");
    try {
      await post({ action: "setActive", id: u.id, active: Number(u.active) !== 1 });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar status.");
    }
  }

  if (denied) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <Brand className="login-brand" subtitle="Administração" />
          <h1 className="login-title">Acesso negado</h1>
          <p className="login-copy">Esta área é exclusiva do administrador.</p>
          <a className="button" href="/app">Voltar ao app</a>
        </section>
      </main>
    );
  }

  return (
    <main className="content" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="topbar">
        <h1 className="page-title">Administração — usuários</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="button" href="/app/admin/rules">Banco de regras</a>
          <a className="button" href="/app">Voltar ao app</a>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Cadastrar novo usuário</h2>
        </div>
        <div className="panel-body">
          <form onSubmit={createUser}>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="name">Nome</label>
                <input id="name" name="name" value={form.name} onChange={update} disabled={saving} />
              </div>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" value={form.email} onChange={update} disabled={saving} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Senha (mínimo 6)</label>
              <input id="password" name="password" type="text" value={form.password} onChange={update} disabled={saving} required />
            </div>
            <label className="check-row" htmlFor="isAdmin">
              <input id="isAdmin" name="isAdmin" type="checkbox" checked={form.isAdmin} onChange={update} disabled={saving} />
              <span>
                <strong>Administrador</strong>
                <small>Pode cadastrar outros usuários (deixe desmarcado para clientes comuns).</small>
              </span>
            </label>
            <div className="actions">
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? "Cadastrando..." : "Cadastrar usuário"}
              </button>
            </div>
            {error && <div className="form-error">{error}</div>}
            {ok && <div className="muted" style={{ marginTop: 8 }}>{ok}</div>}
          </form>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <h2 className="panel-title">Usuários ({users.length})</h2>
          <button className="button" onClick={load} disabled={loading}>Atualizar</button>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Plano</th>
                  <th>Créditos IA</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isEditing = editing?.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.name || "—"}</td>
                      <td>{u.email}</td>
                      <td>{Number(u.is_admin) === 1 ? "Admin" : "Cliente"}</td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editing.plan}
                            onChange={(e) => setEditing((prev) => ({ ...prev, plan: e.target.value }))}
                            style={{ fontSize: 13 }}
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${u.plan === "pro" || u.plan === "business" ? "A" : "SE"}`}>
                            {PLAN_LABELS[u.plan] || u.plan || "Grátis"}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editing.aiCredits}
                            onChange={(e) => setEditing((prev) => ({ ...prev, aiCredits: e.target.value }))}
                            style={{ width: 70, fontSize: 13 }}
                          />
                        ) : (
                          Number(u.ai_credits) || 0
                        )}
                      </td>
                      <td>
                        <button
                          className="button"
                          style={{ fontSize: 12, padding: "2px 8px" }}
                          onClick={() => toggleActive(u)}
                        >
                          {Number(u.active) === 1 ? "ativo" : "inativo"}
                        </button>
                      </td>
                      <td>{new Date(u.created_at).toLocaleString("pt-BR")}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <>
                            <button className="button primary" style={{ fontSize: 12, padding: "2px 8px", marginRight: 4 }} onClick={() => savePlan(u)}>Salvar</button>
                            <button className="button" style={{ fontSize: 12, padding: "2px 8px" }} onClick={() => setEditing(null)}>Cancelar</button>
                          </>
                        ) : (
                          <button
                            className="button"
                            style={{ fontSize: 12, padding: "2px 8px" }}
                            onClick={() => setEditing({ id: u.id, plan: u.plan || "free", aiCredits: Number(u.ai_credits || 0) })}
                          >
                            Editar plano
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
