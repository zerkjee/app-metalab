// Planos do produto. Determinístico (banco de regras) é a base; IA é premium.
// Cotas mensais; créditos (ai_credits no usuário) liberam IA além da cota do plano.
export const PLANS = {
  free: {
    label: "Grátis",
    ai: false,
    monthlyAnalyses: 5,
    monthlyAi: 0,
    pdf: false,
    bulkText: false, // análise rápida por texto (sem IA)
  },
  pro: {
    label: "Pro",
    ai: true,
    monthlyAnalyses: 200,
    monthlyAi: 50,
    pdf: true,
    bulkText: true,
  },
  business: {
    label: "Business",
    ai: true,
    monthlyAnalyses: 2000,
    monthlyAi: 500,
    pdf: true,
    bulkText: true,
  },
};

export function getPlan(name) {
  return PLANS[name] || PLANS.free;
}
