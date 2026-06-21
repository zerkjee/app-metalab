/** @type {import('next').NextConfig} */

// ===========================================================================
// Content Security Policy
// ---------------------------------------------------------------------------
// OCR/PDF rodam no SERVIDOR (serverExternalPackages), então o cliente não baixa
// nada de CDN externa — a CSP pode ser bem fechada. Sem nonce (não há
// middleware aqui), por isso script-src ainda usa 'unsafe-inline'.
// Próximo passo de endurecimento: CSP com nonce via middleware.
// ===========================================================================
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // 'self' + https: permite redirecionar para o provedor de pagamento via form.
  "form-action 'self' https:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdf-parse",
    "sharp",
    "tesseract.js",
    "better-sqlite3",
    "pg",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
