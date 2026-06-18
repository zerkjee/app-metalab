import { getSessionUser } from "@/lib/auth";
import { countAnalysesThisMonth, countAiThisMonth } from "@/lib/db";
import { getPlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "nao autenticado" }, { status: 401 });

  const plan = getPlan(user.plan);
  let analysesThisMonth = 0;
  let aiThisMonth = 0;
  try {
    [analysesThisMonth, aiThisMonth] = await Promise.all([
      countAnalysesThisMonth(user.id),
      countAiThisMonth(user.id),
    ]);
  } catch {
    // banco indisponivel; retorna zeros
  }

  return Response.json({
    email: user.email,
    name: user.name || "",
    isAdmin: Number(user.is_admin) === 1,
    plan: user.plan || "free",
    planLabel: plan.label,
    aiEnabled: plan.ai,
    bulkText: plan.bulkText || false,
    aiCredits: Number(user.ai_credits || 0),
    monthlyAnalyses: plan.monthlyAnalyses,
    monthlyAi: plan.monthlyAi,
    analysesThisMonth,
    aiThisMonth,
  });
}
