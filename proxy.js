import { NextResponse } from "next/server";

// Landing publica em "/" + captura de leads; ferramenta e admin ficam atras do login.
const PUBLIC_PATHS = ["/", "/login", "/precos", "/api/login", "/api/logout", "/api/waitlist", "/favicon.ico"];
const SESSION_COOKIE = "metalab_session";

function isPublicPath(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/brand")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname === "/manifest.webmanifest" || pathname === "/manifest.json") return true;
  if (pathname === "/apple-icon.png" || pathname === "/icon-192.png" || pathname === "/icon-512.png") return true;
  if (pathname.startsWith("/.well-known/")) return true;
  if (/\.(png|jpe?g|webp|svg|gif|ico|txt|xml|woff2?)$/i.test(pathname)) return true;
  return false;
}

function b64urlToUint8(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
  return u;
}

// Valida o cookie de sessao assinado (HMAC-SHA256) sem tocar no banco.
async function verifySession(token, secret) {
  if (!token) return false;
  const [p, s] = String(token).split(".");
  if (!p || !s) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToUint8(s), new TextEncoder().encode(p));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToUint8(p)));
    return Boolean(payload.exp) && payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const secret = process.env.SESSION_SECRET || "metalab-dev-session-secret-troque-em-producao";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token, secret)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
