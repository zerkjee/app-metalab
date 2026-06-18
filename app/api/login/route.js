import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { ensureOwner, verifyPassword, createSession, SESSION_COOKIE } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginLimit = rateLimit({ windowMs: 60_000, max: 8, prefix: "login" });

export async function POST(request) {
  const blocked = await loginLimit(request);
  if (blocked) return blocked;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Dados invalidos." }, { status: 400 });
  }
  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");

  await ensureOwner();

  const user = await getUserByEmail(email);
  if (!user || Number(user.active) !== 1 || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: "E-mail ou senha invalidos." }, { status: 401 });
  }

  const token = createSession(user.id);
  const response = NextResponse.json({ ok: true, isAdmin: Number(user.is_admin) === 1 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
