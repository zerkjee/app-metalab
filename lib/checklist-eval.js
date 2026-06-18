// Avaliador determinístico dos itens do checklist NUVISA.
// Retorna { status: "A"|"NA"|"NAP"|"SE", evidence: string }
// A  = conforme / evidência presente
// NA = não conforme / exigência ausente
// NAP= não aplicável a este produto
// SE = sem evidência suficiente para decidir (IA ou RT deve revisar)

function norm(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function has(text, ...patterns) {
  return patterns.some((p) => (p instanceof RegExp ? p.test(text) : text.includes(norm(p))));
}

// Avalia um item do checklist contra o texto bruto e os dados estruturados do rótulo.
export function evaluateChecklistItem(item, ensaio, rawText, parsed, ingredientFindings) {
  const ni = norm(item);
  const ne = norm(ensaio);
  const t = norm(rawText || "");

  // ── Folha 1 — Geral ──────────────────────────────────────────────────────

  if (ni.includes("denominacao do produto")) {
    const ok = has(t, "suplemento alimentar", "suplemento em", "suplemento proteico");
    return ok
      ? { status: "A", evidence: "Denominação 'suplemento alimentar' identificada." }
      : { status: "NA", evidence: "Denominação 'suplemento alimentar' não encontrada no texto." };
  }

  if (ni.includes("lista de ingredientes")) {
    const ok = has(t, /ingredientes?:/);
    return ok
      ? { status: "A", evidence: "Lista de ingredientes declarada." }
      : { status: "NA", evidence: "Lista de ingredientes ausente." };
  }

  if (ni.includes("conteudo liquido")) {
    const ok = has(t, /\d+\s*(g|mg|ml|kg|comp|caps|cap|comprimido|capsula)/);
    return ok
      ? { status: "A", evidence: "Conteúdo/quantidade declarado." }
      : { status: "SE", evidence: "Conteúdo líquido não identificado claramente." };
  }

  if (ni.includes("identificacao da origem") || (ni.includes("fabricante") && !ni.includes("importador"))) {
    const ok = has(t, /cnpj|fabricado por|fabricante|importado por|importador|industria|ind\./);
    return ok
      ? { status: "A", evidence: "Identificação do fabricante/origem presente." }
      : { status: "NA", evidence: "Fabricante ou CNPJ não identificado." };
  }

  if (ni.includes("identificacao do lote")) {
    const ok = has(t, /\blote\b/);
    return ok
      ? { status: "A", evidence: "Lote declarado." }
      : { status: "NA", evidence: "Identificação do lote ausente." };
  }

  if (ni.includes("prazo de validade") || ni.includes("validade")) {
    const ok = has(t, /validade|val\.\s*\d|vence/);
    return ok
      ? { status: "A", evidence: "Prazo de validade declarado." }
      : { status: "NA", evidence: "Prazo de validade ausente." };
  }

  if (ni.includes("recomendacoes de uso") || ni.includes("recomendacao de uso")) {
    const ok = has(t, /recomendacao de uso|recomendação de uso|modo de uso|ingerir|tomar \d/);
    return ok
      ? { status: "A", evidence: "Recomendação de uso presente." }
      : { status: "SE", evidence: "Recomendação de uso não identificada claramente." };
  }

  if (ni.includes("cuidado de conservacao")) {
    const ok = has(t, /conservar|armazenar|temperatura|local fresco|ao abrigo|fora do calor/);
    return ok
      ? { status: "A", evidence: "Cuidados de conservação declarados." }
      : { status: "SE", evidence: "Cuidados de conservação não identificados." };
  }

  if (ni.includes("nova formula")) {
    const ok = has(t, "nova formula", "nova fórmula");
    return ok
      ? { status: "A", evidence: "Declaração 'nova fórmula' presente." }
      : { status: "NAP", evidence: "Sem declaração de nova fórmula — não aplicável." };
  }

  if (ni.includes("requisitos gerais")) {
    return { status: "SE", evidence: "Verificação de requisitos gerais requer análise RT." };
  }

  if (ni.includes("requisitos especificos") || ni.includes("requisitos especificos")) {
    const hasAdvSup = has(t, /nao e um medicamento|não é um medicamento/) && has(t, /nao exceder|não exceder/);
    return hasAdvSup
      ? { status: "A", evidence: "Frases obrigatórias de suplemento identificadas." }
      : { status: "SE", evidence: "Verificar advertências específicas do constituinte." };
  }

  if (ni.includes("limites minimos e maximos") || (ni.includes("limites") && ni.includes("constituintes"))) {
    if (ingredientFindings && ingredientFindings.length > 0) {
      const nonConf = ingredientFindings.filter((f) => f.status === "acima" || f.status === "nao_conforme");
      const noRule = ingredientFindings.filter((f) => f.status === "sem_regra");
      if (nonConf.length > 0) {
        return { status: "NA", evidence: `${nonConf.length} ingrediente(s) fora do limite. Ver seção Ingredientes.` };
      }
      if (noRule.length > 0) {
        return { status: "SE", evidence: `${noRule.length} ingrediente(s) sem regra no banco — RT deve verificar.` };
      }
      return { status: "A", evidence: "Todos os ingredientes com regra estão dentro dos limites." };
    }
    return { status: "SE", evidence: "Nenhum ingrediente analisado." };
  }

  if (ni.includes("informacoes enganosas") || ni.includes("declaracoes figuras") || ni.includes("causam confusao")) {
    return { status: "SE", evidence: "Verificação de informações enganosas requer análise RT/IA." };
  }

  if (ni.includes("numero da notificacao") || ni.includes("notificacao/registro") || ni.includes("analise da notificacao")) {
    const hasNotif = has(t, /notifica[cç][aã]o\s*n[o°\.]?\s*\d|n[o°]\s*\d{8,}|rdc\s*240|isento de registro|dispensad[ao]/);
    const hasFrase = has(t, "isento de registro", "conforme resolucao", "produto isento");
    if (hasNotif || hasFrase) {
      return { status: "A", evidence: "Número de notificação ou frase de dispensa identificada." };
    }
    return { status: "SE", evidence: "Número de notificação não identificado — verificar arte." };
  }

  // ── Folha 2 — Advertências ────────────────────────────────────────────────

  if (ni.includes("advertencia") && ni.includes("gluten")) {
    const ok = has(t, /gl[uú]ten/);
    return ok
      ? { status: "A", evidence: "Declaração de glúten presente." }
      : { status: "NA", evidence: "Declaração de glúten (contém/não contém) ausente." };
  }

  if (ni.includes("advertencia") && ni.includes("alergenico")) {
    const temAlerg = has(t, /alergenico|alérgico|pode conter|contém.*leite|contém.*soja|contém.*trigo|contém.*amendoim/);
    return temAlerg
      ? { status: "A", evidence: "Declaração de alergênicos presente." }
      : { status: "SE", evidence: "Verificar se há alergênicos aplicáveis ao produto." };
  }

  if (ni.includes("advertencia") && ni.includes("lactose")) {
    const ok = has(t, "lactose");
    return ok
      ? { status: "A", evidence: "Declaração de lactose presente." }
      : { status: "SE", evidence: "Verificar se há lactose nos ingredientes." };
  }

  if (ni.includes("advertencia") && ni.includes("suplemento")) {
    const hasNaoMed = has(t, /nao e um medicamento|não é um medicamento/);
    const hasNaoExc = has(t, /nao exceder|não exceder/);
    if (hasNaoMed && hasNaoExc) {
      return { status: "A", evidence: "Advertências obrigatórias de suplemento presentes." };
    }
    if (hasNaoMed || hasNaoExc) {
      return { status: "SE", evidence: "Advertência parcial — verificar se todas as frases obrigatórias estão presentes." };
    }
    return { status: "NA", evidence: "Advertências obrigatórias de suplemento ausentes." };
  }

  if (ni.includes("advertencia") && (ni.includes("edulcorante") || ni.includes("aditivo"))) {
    const hasEdul = has(t, /edulcorante|aspartame|sacarina|stevia|sucralose|acess?ulfame/);
    if (!hasEdul) return { status: "NAP", evidence: "Nenhum edulcorante identificado no texto." };
    const hasAdv = has(t, /fenilcetonurico|fenilalanina/);
    return hasAdv
      ? { status: "A", evidence: "Advertência de edulcorante presente." }
      : { status: "SE", evidence: "Edulcorante identificado — verificar advertência obrigatória." };
  }

  if (ni.includes("natureza transgenica") || ni.includes("transgenico")) {
    const hasTrans = has(t, /transgenico|transgênico|geneticamente modificado/);
    if (hasTrans) return { status: "A", evidence: "Declaração transgênica presente." };
    return { status: "NAP", evidence: "Nenhum ingrediente transgênico identificado no texto." };
  }

  if (ni.includes("especie doadora")) {
    const hasTrans = has(t, /transgenico|transgênico/);
    if (!hasTrans) return { status: "NAP", evidence: "Sem ingredientes transgênicos — não aplicável." };
    return { status: "SE", evidence: "Verificar espécie doadora do gene se aplicável." };
  }

  if (ni.includes("simbolo transgenico")) {
    const hasTrans = has(t, /transgenico|transgênico/);
    if (!hasTrans) return { status: "NAP", evidence: "Sem transgênicos — não aplicável." };
    return { status: "SE", evidence: "Verificar presença do símbolo 'T' na arte." };
  }

  if (ni.includes("declaracao da natureza nao transgenica")) {
    const hasDec = has(t, "nao transgenico", "não transgênico", "livre de ogm", "sem ogm");
    if (hasDec) return { status: "A", evidence: "Declaração 'não transgênico' presente." };
    return { status: "NAP", evidence: "Sem declaração não transgênica — não aplicável." };
  }

  if (ni.includes("criterios de tolerancia")) {
    return { status: "SE", evidence: "Critérios de tolerância requerem confronto com laudo analítico." };
  }

  if (ni.includes("alegacoes nutricionais")) {
    if (parsed && parsed.claims && parsed.claims.length > 0) {
      return { status: "A", evidence: `${parsed.claims.length} alegação(ões) detectada(s) — verificar base regulatória.` };
    }
    return { status: "NAP", evidence: "Nenhuma alegação nutricional detectada." };
  }

  if (ni.includes("declaracao da tabela de informacao nutricional") || (ni.includes("tabela") && ni.includes("informacao nutricional"))) {
    const ok = has(t, /informacao nutricional|informação nutricional|tabela nutricional/);
    return ok
      ? { status: "A", evidence: "Tabela de informação nutricional presente." }
      : { status: "NA", evidence: "Tabela de informação nutricional ausente." };
  }

  if (ni.includes("declaracao dos nutrientes obrigatorios") || ni.includes("nutrientes obrigatorios")) {
    const ok = has(t, /valor energetico|proteinas|carboidratos|gorduras totais|sodio/);
    return ok
      ? { status: "A", evidence: "Nutrientes obrigatórios declarados na tabela." }
      : { status: "SE", evidence: "Verificar se todos os nutrientes obrigatórios estão presentes." };
  }

  if (ni.includes("regras para declaracao dos nutrientes")) {
    return { status: "SE", evidence: "Verificação de formato/unidades requer análise da arte." };
  }

  if (ni.includes("declaracao da porcao") || ni.includes("medida caseira")) {
    const ok = has(t, /porcao|porção|medida caseira|porcoes por embalagem|porções por embalagem/);
    return ok
      ? { status: "A", evidence: "Porção e/ou medida caseira declarada." }
      : { status: "NA", evidence: "Declaração de porção ausente." };
  }

  if (ni.includes("declaracao da") && ni.includes("%vd") || ni.includes("valor energetico") && ni.includes("%vd")) {
    const ok = has(t, /%vd|% vd|valor diario/);
    return ok
      ? { status: "A", evidence: "%VD e/ou valor energético declarados." }
      : { status: "SE", evidence: "Verificar %VD e cálculo do valor energético." };
  }

  if (ni.includes("localizacao da tabela")) {
    return { status: "SE", evidence: "Localização da tabela requer análise da arte gráfica." };
  }

  // ── Folha 3 — Formatação e Cálculos ──────────────────────────────────────

  if (ni.includes("formatacao") || ni.includes("compactacao") || ni.includes("modelo tabela") || ni.includes("modelo linear")) {
    return { status: "SE", evidence: "Formatação da tabela requer análise da arte gráfica." };
  }

  if (ni.includes("embalagem multipla")) {
    return { status: "SE", evidence: "Verificar se é embalagem múltipla." };
  }

  if (ne.includes("calculo") || ne.includes("calculos")) {
    return { status: "SE", evidence: "Cálculo requer confronto aritmético com memorial nutricional." };
  }

  // ── Default ───────────────────────────────────────────────────────────────
  return { status: "SE", evidence: null };
}
