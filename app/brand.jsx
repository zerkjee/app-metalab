"use client";

import { useState } from "react";
import Logo from "./brand-logo";

// Usa a logo oficial (lockup) em public/brand/metalab-full.png em todas as marcas.
// Enquanto o arquivo nao existir, cai no fallback (icone vetorial + texto) para nao quebrar.
export default function Brand({ subtitle, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <div className={`brand ${className}`.trim()}>
        <img
          className="brand-lockup"
          src="/brand/metalab-full.png"
          alt="MetaLab"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`brand ${className}`.trim()}>
      <div className="brand-mark">
        <Logo size={36} />
      </div>
      <div>
        <div className="brand-title">METALAB</div>
        {subtitle ? <div className="brand-subtitle">{subtitle}</div> : null}
      </div>
    </div>
  );
}
