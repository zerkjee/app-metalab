import { Nunito } from "next/font/google";
import PageTransition from "./page-transition";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata = {
  title: "METALAB | Conformidade ANVISA com IA",
  description: "Pré-auditoria de rótulos de suplementos no padrão SRS BH / NUVISA",
  applicationName: "METALAB",
  appleWebApp: {
    capable: true,
    title: "METALAB",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0c1f4d",
};

const splashScreens = [
  { w: 1290, h: 2796, ratio: 3 },
  { w: 1179, h: 2556, ratio: 3 },
  { w: 1170, h: 2532, ratio: 3 },
  { w: 1125, h: 2436, ratio: 3 },
  { w: 1242, h: 2688, ratio: 3 },
  { w: 828,  h: 1792, ratio: 2 },
  { w: 750,  h: 1334, ratio: 2 },
  { w: 1242, h: 2208, ratio: 3 },
  { w: 640,  h: 1136, ratio: 2 },
  { w: 2048, h: 2732, ratio: 2 },
  { w: 1668, h: 2388, ratio: 2 },
  { w: 1536, h: 2048, ratio: 2 },
  { w: 1620, h: 2160, ratio: 2 },
];

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <head>
        {splashScreens.map(({ w, h, ratio }) => (
          <link
            key={`${w}x${h}`}
            rel="apple-touch-startup-image"
            href={`/splash-${w}x${h}.png`}
            media={`(device-width: ${w / ratio}px) and (device-height: ${h / ratio}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body>
        <PageTransition>{children}</PageTransition>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () =>
              navigator.serviceWorker.register('/sw.js').catch(() => {})
            );
          }
        `}} />
      </body>
    </html>
  );
}
