import crypto from "node:crypto";
import { createUser, getUserByEmail, getUserById } from "./db.js";

export const SESSION_COOKIE = "metalab_session";
const TTL_DAYS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  // Em produção, NUNCA usar um segredo default (este arquivo é público): sem
  // SESSION_SECRET as sessões seriam forjáveis. Falha fechado.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET não definido em produção. Defina um segredo forte (ex.: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\") antes de subir.",
    );
  }
  return "metalab-dev-session-secret-troque-em-producao";
}

// ---------- Senha (scrypt, sem dependencia externa) ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(pw, stored) {
  const [saltHex, hashHex] = String(stored || "").split(":");
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

// ---------- Sessao (cookie assinado HMAC) ----------
export function createSession(uid) {
  const payload = { uid, exp: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400 };
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(p).digest("base64url");
  return `${p}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const [p, s] = String(token).split(".");
  if (!p || !s) return null;
  const expected = crypto.createHmac("sha256", secret()).update(p).digest("base64url");
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Usuario atual a partir do cookie da requisicao (null se nao logado/invalido).
export async function getSessionUser(request) {
  const payload = verifyToken(readCookie(request, SESSION_COOKIE));
  if (!payload) return null;
  const user = await getUserById(payload.uid);
  if (!user || Number(user.active) !== 1) return null;
  return user;
}

// Cria o dono/admin a partir de OWNER_EMAIL/OWNER_PASSWORD se ainda nao existir.
export async function ensureOwner() {
  const email = process.env.OWNER_EMAIL;
  const pw = process.env.OWNER_PASSWORD;
  if (!email || !pw) return;
  const existing = await getUserByEmail(email);
  if (existing) return;
  await createUser({ email, name: "Dono", passwordHash: hashPassword(pw), isAdmin: 1 });
}
