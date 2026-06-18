import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { parseLabel } from "@/lib/label-parser";
import { loadRuleset } from "@/lib/rules";
import { checkCompliance } from "@/lib/compliance-engine";
import { renderComplianceMarkdown } from "@/lib/engine-report";
import { listChecklist, countAnalysesThisMonth, saveAnalysis } from "@/lib/db";
import { computeHash } from "@/lib/db";
import { PROMPT_VERSION, AGENT_MODEL } from "@/lib/anthropic-agent";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const analyzeLimit = rateLimit({ windowMs: 60_000, max: 10, prefix: "analise-rapida" });

export async function POST(request) {
  const blocked = await analyzeLimit(request);
  if (blocked) return blocked;

  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const plan = getPlan(user.plan);
  if (!plan.bulkText) {
    return Response.json(
      { error: "A análise rápida por texto está disponível nos planos Pro e Business. Faça upgrade para usar esta funcionalidade." },
      { status: 403 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const input = {
    productName: String(body.productName || "").slice(0, 200),
    brand: String(body.brand || "").slice(0, 200),
    category: String(body.category || "").slice(0, 200),
    version: String(body.version || "").slice(0, 100),
    labelText: String(body.labelText || "").slice(0, 50000),
  };

  if (!input.labelText.trim()) {
    return Response.json({ error: "Cole o texto da embalagem antes de analisar." }, { status: 400 });
  }

  // Cota mensal de análises
  try {
    const used = await countAnalysesThisMonth(user.id);
    if (used >= plan.monthlyAnalyses) {
      return Response.json(
        { error: `Limite do plano ${plan.label} atingido (${plan.monthlyAnalyses} análises/mês). Faça upgrade para continuar.` },
        { status: 402 }
      );
    }
  } catch {
    // sem banco → não bloqueia
  }

  // Motor determinístico
  let reportMd = "";
  try {
    const parsed = parseLabel(input.labelText);
    let ruleset = { constituents: [], claims: [], warnings: [] };
    let checklist = [];
    try {
      ruleset = await loadRuleset();
      checklist = await listChecklist();
    } catch {
      // banco indisponível → motor roda com regras vazias
    }
    const result = checkCompliance(parsed, ruleset);
    reportMd = renderComplianceMarkdown(parsed, result, checklist, input.labelText);
  } catch (err) {
    return Response.json({ error: "Erro ao analisar o texto: " + (err?.message || "falha interna.") }, { status: 500 });
  }

  // Persiste para histórico
  try {
    const hash = computeHash({ ...input, model: "deterministic", promptVersion: PROMPT_VERSION });
    await saveAnalysis({
      hash,
      userId: user.id,
      ...input,
      model: "deterministic",
      promptVersion: PROMPT_VERSION,
      source: "deterministic",
      reportMd,
    });
  } catch {
    // falha silenciosa na persistência
  }

  return Response.json({ ok: true, reportMd });
}
