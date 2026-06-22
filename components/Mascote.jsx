"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MASCOTE_EVENT } from "@/lib/mascote-bus";
import styles from "./Mascote.module.css";

// "Méti, o Inspetor" — mascote interativo da MetaLab.
// Reage a estados emitidos via mascote-bus e segue o cursor.

const NOME = "Méti";

// Mensagem padrão por estado (sobrescrevível ao emitir).
const FALAS = {
  idle: null,
  greeting: `Oi! Sou o ${NOME}. Vou conferir seu rótulo. 👋`,
  scanning: "Lendo a embalagem com a lupa…",
  thinking: "Analisando o compliance…",
  success: "Tudo certo por aqui! ✅",
  warning: "Achei pontos pra revisar. 👀",
  error: "Algo deu errado. Tenta de novo?",
};

// Estados transitórios voltam para idle sozinhos.
const AUTO_IDLE = { greeting: 2600, success: 3200, warning: 3600, error: 3200 };

export function Mascote() {
  const [state, setState] = useState("greeting");
  const [message, setMessage] = useState(FALAS.greeting);
  const [mounted, setMounted] = useState(false);
  const charRef = useRef(null);
  const idleTimer = useRef(null);

  // Portala para o body só no client (evita SSR e ancestrais com transform,
  // que "prendem" o position:fixed e tiram o mascote do canto da tela).
  useEffect(() => setMounted(true), []);

  // Reage aos eventos do barramento.
  useEffect(() => {
    function onEvent(e) {
      const next = e.detail?.state;
      if (!next || !(next in FALAS)) return;
      setState(next);
      setMessage(e.detail?.message ?? FALAS[next]);
      clearTimeout(idleTimer.current);
      const back = AUTO_IDLE[next];
      if (back) {
        idleTimer.current = setTimeout(() => {
          setState("idle");
          setMessage(null);
        }, back);
      }
    }
    window.addEventListener(MASCOTE_EVENT, onEvent);
    // saudação inicial → idle
    idleTimer.current = setTimeout(() => {
      setState("idle");
      setMessage(null);
    }, AUTO_IDLE.greeting);
    return () => {
      window.removeEventListener(MASCOTE_EVENT, onEvent);
      clearTimeout(idleTimer.current);
    };
  }, []);

  // Pupilas seguem o cursor.
  useEffect(() => {
    function onMove(e) {
      const el = charRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const px = Math.max(-1, Math.min(1, (e.clientX - cx) / 220));
      const py = Math.max(-1, Math.min(1, (e.clientY - cy) / 220));
      el.style.setProperty("--px", px.toFixed(2));
      el.style.setProperty("--py", py.toFixed(2));
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!mounted || !document.body) return null;

  return createPortal(
    <div className={styles.wrap} aria-live="polite">
      <div className={styles.bubble} data-show={message ? "true" : "false"}>
        {message}
      </div>

      <svg
        ref={charRef}
        className={styles.char}
        data-state={state}
        viewBox="0 0 80 80"
        role="img"
        aria-label={`${NOME}, o inspetor de rótulos`}
        onClick={() => {
          setState("greeting");
          setMessage(FALAS.greeting);
          clearTimeout(idleTimer.current);
          idleTimer.current = setTimeout(() => {
            setState("idle");
            setMessage(null);
          }, AUTO_IDLE.greeting);
        }}
      >
        {/* halo de status */}
        <circle className={styles.halo} cx="40" cy="40" r="37" fill="none" strokeWidth="3" />

        {/* corpo / jaleco */}
        <path d="M22 58 q18 -10 36 0 v8 q-18 6 -36 0 z" fill="#e2e8f0" />
        {/* cabeça */}
        <circle cx="40" cy="34" r="20" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="2.5" />
        {/* gola do jaleco */}
        <path d="M31 50 l9 6 l9 -6" fill="none" stroke="#0ea5e9" strokeWidth="2" />

        {/* olhos */}
        <g>
          <circle cx="33" cy="33" r="5" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="47" cy="33" r="5" fill="#fff" stroke="#cbd5e1" strokeWidth="1" />
          <circle className={styles.pupil} cx="33" cy="33" r="2.4" fill="#0f172a" />
          <circle className={styles.pupil} cx="47" cy="33" r="2.4" fill="#0f172a" />
          {/* pálpebras (piscar) */}
          <rect className={styles.eyelid} x="28" y="28" width="10" height="6" rx="3" fill="#f8fafc" />
          <rect className={styles.eyelid} x="42" y="28" width="10" height="6" rx="3" fill="#f8fafc" />
        </g>

        {/* sorriso */}
        <path d="M34 42 q6 5 12 0" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />

        {/* braço + lupa */}
        <g className={styles.arm}>
          <line x1="24" y1="54" x2="50" y2="58" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <g className={styles.lupa}>
            <circle cx="58" cy="56" r="9" fill="rgba(14,165,233,0.18)" stroke="#0ea5e9" strokeWidth="2.5" />
            <line x1="64" y1="62" x2="70" y2="68" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>,
    document.body,
  );
}

export default Mascote;
