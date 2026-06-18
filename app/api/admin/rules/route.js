import { getSessionUser } from "@/lib/auth";
import { listChecklist } from "@/lib/db";
import { seedChecklistFromKit } from "@/lib/seed-checklist";
import { seedRuleset } from "@/lib/seed-rules";
import {
  loadRuleset,
  addConstituent,
  addClaim,
  addWarning,
  verifyConstituent,
  verifyClaim,
  verifyWarning,
} from "@/lib/rules";

export const runtime = "nodejs";

async function requireAdmin(request) {
  const user = await getSessionUser(request);
  return user && Number(user.is_admin) === 1 ? user : null;
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const ruleset = await loadRuleset();
    const checklist = await listChecklist();
    return Response.json({ ...ruleset, checklist });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "falha", constituents: [], claims: [], warnings: [], checklist: [] },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "acesso restrito" }, { status: 403 });

  let data = {};
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "dados invalidos" }, { status: 400 });
  }

  const { action, type } = data;
  try {
    if (action === "seedChecklist") {
      const result = await seedChecklistFromKit({ force: data.force === true });
      return Response.json({ ok: true, ...result });
    }

    if (action === "seedRuleset") {
      const result = await seedRuleset({ force: data.force === true });
      return Response.json({ ok: true, ...result });
    }

    if (action === "verify") {
      if (!data.id) return Response.json({ error: "id ausente" }, { status: 400 });
      const who = admin.email || "RT";
      if (type === "constituent") await verifyConstituent(data.id, who);
      else if (type === "claim") await verifyClaim(data.id, who);
      else if (type === "warning") await verifyWarning(data.id, who);
      else return Response.json({ error: "tipo invalido" }, { status: 400 });
      return Response.json({ ok: true });
    }

    if (action === "add") {
      // Regra adicionada manualmente pelo admin nasce 'verified' (ele e o revisor).
      const status = data.status === "draft" ? "draft" : "verified";
      if (type === "constituent") {
        if (!data.name) return Response.json({ error: "nome obrigatorio" }, { status: 400 });
        await addConstituent({ ...data, verifiedBy: admin.email, status });
      } else if (type === "claim") {
        if (!data.claimText) return Response.json({ error: "texto da alegacao obrigatorio" }, { status: 400 });
        await addClaim({ ...data, verifiedBy: admin.email, status });
      } else if (type === "warning") {
        if (!data.triggerTerm || !data.text) return Response.json({ error: "gatilho e texto obrigatorios" }, { status: 400 });
        await addWarning({ ...data, verifiedBy: admin.email, status });
      } else {
        return Response.json({ error: "tipo invalido" }, { status: 400 });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "acao invalida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "falha ao salvar" }, { status: 500 });
  }
}
