import { streamReport, MissingApiKeyError, PROMPT_VERSION, AGENT_MODEL } from "@/lib/anthropic-agent";
import {
  computeHash,
  getCached,
  saveAnalysis,
  listChecklist,
  countAnalysesThisMonth,
  countAiThisMonth,
  decrementCredit,
} from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { parseLabel } from "@/lib/label-parser";
import { loadRuleset } from "@/lib/rules";
import { checkCompliance } from "@/lib/compliance-engine";
import { renderComplianceMarkdown, buildEngineContext } from "@/lib/engine-report";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const analyzeLimit = rateLimit({ windowMs: 60_000, max: 10 });

function planNote(reason, plan) {
  if (reason === "plan_free")
    return "> **Plano Grátis.** A conferência automática acima é a análise determinística (itens com regra no banco). A **análise por IA** — leitura de foto/OCR, detecção de alegações proibidas/disfarçadas, pesquisa ao vivo na ANVISA e preenchimento de cada item NUVISA com evidência — está nos planos **Pro/Business**.\n";
  if (reason === "ia_config")
    return "> A conferência automática acima está completa. A análise por IA está temporariamente indisponível (configuração). Tente mais tarde.\n";
  if (reason === "ia_quota")
    return `> **Cota de IA do mês esgotada** no plano ${plan.label}. Use créditos avulsos ou faça upgrade. A conferência automática acima continua disponível.\n`;
  return "";
}

export async function POST(request) {
  const blocked = analyzeLimit(request);
  if (blocked) return blocked;

  const formData = await request.formData();

  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "Nao autenticado." }, { status: 401 });
  const plan = getPlan(user.plan);

  const packageFileName = String(formData.get("packageFileName") || "");
  const packageFileSize = Number(formData.get("packageFileSize") || 0);
  const packageInfo =
    packageFileName && packageFileSize > 0 ? { name: packageFileName, size: packageFileSize } : null;

  const input = {
    productName: String(formData.get("productName") || ""),
    brand: String(formData.get("brand") || ""),
    category: String(formData.get("category") || ""),
    version: String(formData.get("version") || ""),
    labelText: String(formData.get("labelText") || ""),
    packageInfo,
  };

  const forceFresh = String(formData.get("force") || "") === "true";
  const forceMock = String(formData.get("mock") || "") === "true";

  // --- Conferencia DETERMINISTICA (sem IA), sempre recalculada (inclusive no cache).
  let deterministicMd = "";
  let engineContext = "";
  try {
    const parsed = parseLabel(input.labelText);
    let ruleset = { constituents: [], claims: [], warnings: [] };
    let checklist = [];
    try {
      ruleset = await loadRuleset();
      checklist = await listChecklist();
    } catch {
      // sem banco -> motor roda com regras vazias
    }
    const result = checkCompliance(parsed, ruleset);
    deterministicMd = renderComplianceMarkdown(parsed, result, checklist, input.labelText);
    engineContext = buildEngineContext(parsed, result, checklist, input.labelText);
  } catch {
    deterministicMd = "";
  }

  const SEP = "\n\n---\n\n";
  const hash = computeHash({ ...input, model: AGENT_MODEL, promptVersion: PROMPT_VERSION });

  // --- Elegibilidade de IA conforme o plano/credito.
  const keyPresent = Boolean(process.env.ANTHROPIC_API_KEY) && !forceMock;
  let live = false;
  let useCredit = false;
  let reason = "";
  if (!plan.ai) {
    reason = "plan_free";
  } else if (!keyPresent) {
    reason = "ia_config";
  } else {
    const aiUsed = await countAiThisMonth(user.id);
    if (aiUsed < plan.monthlyAi) live = true;
    else if (Number(user.ai_credits) > 0) {
      live = true;
      useCredit = true;
    } else reason = "ia_quota";
  }
  const source = live ? "agent" : "deterministic";

  // 1) Reaproveitar narrativa do banco (conferencia vai sempre fresca).
  if (!forceFresh) {
    try {
      const cached = await getCached(hash, { requireLive: live });
      if (cached) {
        const date = new Date(cached.created_at).toLocaleString("pt-BR");
        const note = `> ♻️ **Narrativa reaproveitada do banco** (verificada em ${date}). A conferência automática acima é sempre recalculada.\n\n`;
        const body = (deterministicMd ? deterministicMd + SEP : "") + note + cached.report_md;
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Report-Source": "cache" },
        });
      }
    } catch {
      // segue para gerar
    }
  }

  // 2) Cota mensal de analises do plano.
  try {
    const used = await countAnalysesThisMonth(user.id);
    if (used >= plan.monthlyAnalyses) {
      return Response.json(
        { error: `Limite do plano ${plan.label} atingido (${plan.monthlyAnalyses} análises/mês). Faça upgrade para continuar.` },
        { status: 402 }
      );
    }
  } catch {
    // sem banco -> nao bloqueia
  }

  const encoder = new TextEncoder();
  let narrative = "";

  const stream = new ReadableStream({
    async start(controller) {
      if (deterministicMd) controller.enqueue(encoder.encode(deterministicMd + SEP));
      try {
        if (live) {
          for await (const chunk of streamReport({ ...input, engineContext })) {
            narrative += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          if (useCredit) {
            try {
              await decrementCredit(user.id);
            } catch {}
          }
        } else {
          narrative = planNote(reason, plan);
          controller.enqueue(encoder.encode(narrative));
        }
      } catch (error) {
        const message =
          error instanceof MissingApiKeyError
            ? error.message
            : error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar o relatorio.";
        const note = `\n\n> **Erro na analise:** ${message}\n`;
        narrative += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        try {
          if (narrative.trim()) {
            await saveAnalysis({
              hash,
              userId: user.id,
              ...input,
              model: AGENT_MODEL,
              promptVersion: PROMPT_VERSION,
              source,
              reportMd: narrative,
            });
          }
        } catch {
          // sem banco -> nao persiste
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Report-Source": source,
      "X-Accel-Buffering": "no",
    },
  });
}
