"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const body = new FormData();
    body.set("email", email);
    body.set("password", password);
    const response = await fetch("/api/login", { method: "POST", body });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const next = searchParams.get("next") || "/app";
    window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  }

  return (
    <main className="login-shell">
      <div className="login-bg-mark" aria-hidden="true">
        <svg viewBox="6 12 108 98" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <path d="M76 25.6 A 42 42 0 0 1 34 98.4" stroke="var(--brand-logo-1)" strokeWidth="10" strokeLinecap="round" fill="none"/>
          <path d="M18.6 83 A 42 42 0 0 1 18.6 41" stroke="var(--brand-logo-2)" strokeWidth="9" strokeLinecap="round" fill="none"/>
          <path d="M38 40 Q 45 58 55 76" stroke="var(--brand-logo-1)" strokeWidth="20" strokeLinecap="round" fill="none"/>
          <circle cx="55" cy="76" r="22" fill="var(--brand-logo-1)"/>
          <circle cx="38" cy="40" r="15" fill="var(--brand-logo-1)"/>
          <circle cx="64" cy="41" r="10" fill="var(--brand-logo-2)"/>
        </svg>
      </div>

      <section className="login-panel">
        <div className="login-content">
          <div className="login-wordmark">
            <span className="login-wordmark-meta">meta</span>
            <span className="login-wordmark-lab">lab</span>
          </div>
          <p className="login-tagline">Pré-auditoria de rotulagem ANVISA</p>

          <form onSubmit={submit} className="login-form">
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="button primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
