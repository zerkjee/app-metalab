// Logo METALAB recriado em vetor a partir da arte da marca.
// Usa variaveis de tema (--brand-logo-1 azul-claro, --brand-logo-2 marinho/branco)
// para funcionar tanto no modo claro quanto no escuro.
export default function Logo({ size = 40, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      role="img"
      aria-label="METALAB"
    >
      <title>METALAB</title>
      {/* anel azul-claro: envolve direita + base */}
      <path
        d="M76 25.6 A 42 42 0 0 1 34 98.4"
        stroke="var(--brand-logo-1)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* arco marinho curto: lado esquerdo */}
      <path
        d="M18.6 83 A 42 42 0 0 1 18.6 41"
        stroke="var(--brand-logo-2)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* figura: pescoço + corpo + cabeça (mesmo azul, se fundem) */}
      <path
        d="M38 40 Q 45 58 55 76"
        stroke="var(--brand-logo-1)"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <circle cx="55" cy="76" r="22" fill="var(--brand-logo-1)" />
      <circle cx="38" cy="40" r="15" fill="var(--brand-logo-1)" />
      {/* ponto marinho no encaixe */}
      <circle cx="64" cy="41" r="10" fill="var(--brand-logo-2)" />
    </svg>
  );
}
