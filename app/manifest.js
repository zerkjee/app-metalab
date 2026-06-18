export default function manifest() {
  return {
    id: "/app",
    name: "METALAB — Conformidade ANVISA",
    short_name: "METALAB",
    description: "Pré-auditoria de rótulos de suplementos com IA e motor ANVISA",
    start_url: "/app",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0c1f4d",
    theme_color: "#0c1f4d",
    categories: ["business", "productivity"],
    lang: "pt-BR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "METALAB no desktop",
      },
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "METALAB no celular",
      },
    ],
    shortcuts: [
      {
        name: "Nova análise",
        url: "/app",
        description: "Abrir o analisador de rótulos",
      },
      {
        name: "Preços",
        url: "/precos",
        description: "Ver planos",
      },
    ],
  };
}
