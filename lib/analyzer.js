const STATUS_ORDER = { NA: 0, SE: 1, NAP: 2, A: 3 };

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(normalize(term)));
}

function textDensity(rawText) {
  const compact = rawText.replace(/\s/g, "");
  if (!compact.length) return { symbolRatio: 0, digitLetterMixRatio: 0 };

  const symbols = compact.match(/[^\p{L}\p{N}%/.,;:()+\-]/gu)?.length || 0;
  const mixedTokens = rawText
    .split(/\s+/)
    .filter((token) => /[A-Za-z]/.test(token) && /\d/.test(token) && token.length >= 3).length;
  const tokens = rawText.split(/\s+/).filter(Boolean).length || 1;

  return {
    symbolRatio: symbols / compact.length,
    digitLetterMixRatio: mixedTokens / tokens,
  };
}

function lineQuality(rawText) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { shortLineRatio: 0, averageLineLength: 0 };

  const shortLines = lines.filter((line) => line.length <= 3).length;
  const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;

  return {
    shortLineRatio: shortLines / lines.length,
    averageLineLength,
  };
}

function findMatches(rawText, checks) {
  return checks.flatMap((check) => {
    const matches = [...rawText.matchAll(check.pattern)];
    return matches.slice(0, 4).map((match) => ({
      found: match[0],
      suggestion: check.suggestion,
      reason: check.reason,
    }));
  });
}

function reviewExtractedText(rawText, enabled) {
  if (!enabled) {
    return {
      enabled: false,
      status: "Nao executada",
      score: null,
      summary: "Revisao de OCR desativada para esta analise.",
      issues: [],
      suggestions: [],
    };
  }

  const text = rawText || "";
  const normalized = normalize(text);
  const issues = [];
  const suggestions = [];

  if (text.trim().length < 120) {
    issues.push({
      severity: "alta",
      title: "Texto insuficiente para auditoria",
      detail: "O texto extraido tem pouco conteudo. Conferir se o OCR capturou todas as faces da embalagem.",
    });
  }

  if (text.includes("\uFFFD")) {
    issues.push({
      severity: "alta",
      title: "Caracteres corrompidos",
      detail: "O texto contem caracteres de substituicao, indicando erro de leitura ou codificacao.",
    });
  }

  const density = textDensity(text);
  if (density.symbolRatio > 0.04) {
    issues.push({
      severity: "media",
      title: "Excesso de simbolos incomuns",
      detail: "Ha muitos caracteres fora do padrao de rotulo. Conferir nomes de ingredientes, numeros e unidades.",
    });
  }

  if (density.digitLetterMixRatio > 0.08) {
    issues.push({
      severity: "media",
      title: "Possivel troca entre letras e numeros",
      detail: "O texto tem muitos termos misturando letras e numeros, comum em OCR com O/0, I/1 e S/5.",
    });
  }

  const lines = lineQuality(text);
  if (lines.shortLineRatio > 0.22 || (lines.averageLineLength > 0 && lines.averageLineLength < 12)) {
    issues.push({
      severity: "media",
      title: "Linhas muito quebradas",
      detail: "O OCR pode ter quebrado frases ou tabela nutricional. Conferir porcao, %VD, lote e validade.",
    });
  }

  const foreignTerms = [
    "ingredients",
    "serving size",
    "daily value",
    "supplement facts",
    "warning",
    "expiration",
    "lot number",
  ];
  if (includesAny(normalized, foreignTerms)) {
    issues.push({
      severity: "media",
      title: "Possivel traducao ou texto estrangeiro no OCR",
      detail: "Foram encontrados termos que podem ter vindo de traducao automatica. Conferir se o rotulo final esta em portugues.",
    });
  }

  suggestions.push(
    ...findMatches(text, [
      { pattern: /\bR[0O]C\b/gi, suggestion: "RDC", reason: "Referencia legal pode ter sido lida com D/O/0 incorreto." },
      { pattern: /\bANV[1Il]SA\b/gi, suggestion: "ANVISA", reason: "Nome do orgao pode ter sido lido com I/1/l incorreto." },
      { pattern: /\bSUPLEMENT[0O]\b/gi, suggestion: "SUPLEMENTO", reason: "Troca comum entre O e zero em denominacao de produto." },
      { pattern: /\bGL[UÜ]T[3E]N\b/gi, suggestion: "GLUTEN", reason: "Declaracao de gluten deve ser conferida no original." },
      { pattern: /\bLACT[0O]SE\b/gi, suggestion: "LACTOSE", reason: "Advertencia de lactose pode ter troca de O/0." },
      { pattern: /\bL[0O]TE\b/gi, suggestion: "LOTE", reason: "Identificacao de lote precisa estar legivel." },
      { pattern: /\bVALIDAD[3E]\b/gi, suggestion: "VALIDADE", reason: "Prazo de validade precisa estar legivel." },
      { pattern: /\bP[0O]RC[AÃ]O\b/gi, suggestion: "PORCAO", reason: "Porcao e medida caseira precisam ser conferidas na tabela nutricional." },
      { pattern: /\bM[CG]G\b/gi, suggestion: "mg ou mcg", reason: "Unidade pode ter sido lida de forma ambigua." },
      { pattern: /\b%V[D0O]\b/gi, suggestion: "%VD", reason: "Percentual de valores diarios pode ter sido lido incorretamente." },
    ])
  );

  if (suggestions.length > 0) {
    issues.push({
      severity: "media",
      title: "Termos criticos com leitura suspeita",
      detail: "Ha termos regulatorios ou nutricionais que podem ter sido extraidos com erro. Conferir sugestoes abaixo.",
    });
  }

  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === "alta" ? 28 : 14), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty - suggestions.length * 3));
  const status = score < 60 ? "Revisar antes do laudo" : score < 82 ? "Usar com cautela" : "Texto apto para triagem";

  return {
    enabled: true,
    status,
    score,
    summary:
      issues.length === 0
        ? "Nao foram encontrados sinais fortes de erro de OCR ou traducao automatica."
        : "O agente encontrou pontos que precisam ser conferidos no arquivo original antes de liberar conclusao.",
    issues,
    suggestions: suggestions.slice(0, 12),
  };
}

function hasProcessNumber(raw) {
  return /\b25351[.\d/-]{6,}\b/.test(raw) || /\b2535\d{10,}\b/.test(raw);
}

function classifyRegularization({ category, labelText }) {
  const raw = `${category || ""}\n${labelText || ""}`;
  const text = normalize(raw);

  if (includesAny(text, ["formula infantil", "nutricao enteral", "nutrição enteral", "dietoterapica", "dietoterápica"])) {
    return {
      rite: "Registro na Anvisa",
      base: "RDC 843/2024 e IN 281/2024, Anexo I",
      evidence: "Termos de categoria de registro encontrados no texto.",
      status: hasProcessNumber(raw) ? "A" : "SE",
      requiredDocument: "Numero/comprovacao de registro.",
    };
  }

  if (includesAny(text, ["suplemento alimentar", "funcao articular", "função articular", "alegacao funcional", "alegação funcional", "controle de peso"])) {
    return {
      rite: "Notificacao na Anvisa",
      base: "RDC 843/2024 e IN 281/2024, Anexo II",
      evidence: includesAny(text, ["suplemento alimentar"]) ? "Rotulo declara suplemento alimentar." : "Texto indica alegacao funcional/saude.",
      status: hasProcessNumber(raw) ? "A" : "NA",
      requiredDocument: "Numero/processo de notificacao Anvisa.",
    };
  }

  if (includesAny(text, ["biscoito", "chocolate", "cha", "chá", "tempero", "molho", "agua mineral", "água mineral", "massa", "farinha", "oleo vegetal", "óleo vegetal"])) {
    return {
      rite: "Comunicacao local",
      base: "RDC 843/2024 e IN 281/2024, Anexo III",
      evidence: "Categoria-base de comunicacao local identificada.",
      status: "SE",
      requiredDocument: "Protocolo de comunicacao junto a Vigilancia Sanitaria local.",
    };
  }

  return {
    rite: "Inconclusivo",
    base: "RDC 843/2024 e IN 281/2024",
    evidence: "Categoria insuficiente para classificar automaticamente.",
    status: "SE",
    requiredDocument: "Classificacao regulatoria por Regulatorios/RT.",
  };
}

function resultForItem(item, ctx) {
  const name = normalize(item.item_nuvisa);
  const text = ctx.normalizedText;
  const raw = ctx.rawText;

  if (name.includes("denominacao")) return includesAny(text, ["suplemento alimentar"]) ? status("A", "Denominacao localizada no rotulo.") : status("SE", "Denominacao nao localizada no texto informado.");
  if (name.includes("lista de ingredientes")) return includesAny(text, ["ingredientes"]) ? status(ctx.colorConflict ? "NA" : "A", ctx.colorConflict ? "Ha declaracao de colorido artificialmente sem corante identificado." : "Lista de ingredientes localizada.") : status("SE", "Lista de ingredientes nao localizada.");
  if (name.includes("conteudo liquido")) return /\b\d+\s*(g|mg|ml|l|comprimidos|capsulas|cápsulas)\b/i.test(raw) ? status("A", "Conteudo/quantidade localizado.") : status("SE", "Conteudo liquido nao localizado.");
  if (name.includes("origem")) return includesAny(text, ["cnpj", "fabricado", "industria brasileira", "indústria brasileira"]) ? status("A", "Origem/fabricante localizado.") : status("SE", "Origem/fabricante nao localizado.");
  if (name.includes("lote")) return includesAny(text, ["lote"]) ? status("A", "Lote ou campo de lote localizado.") : status("NA", "Lote nao localizado.");
  if (name.includes("validade")) return includesAny(text, ["validade"]) ? status("A", "Validade ou campo de validade localizado.") : status("NA", "Validade nao localizada.");
  if (name.includes("recomendacoes de uso")) return includesAny(text, ["ingerir", "recomendacao de uso", "recomendação de uso", "ao dia"]) ? status("A", "Recomendacao de uso localizada.") : status("SE", "Recomendacao de uso nao localizada.");
  if (name.includes("nova formula")) return includesAny(text, ["nova formula", "nova fórmula"]) ? status("SE", "Declaracao de nova formula exige historico.") : status("NAP", "Nao ha declaracao de nova formula.");
  if (name.includes("conservacao")) return includesAny(text, ["conservacao", "conservação", "armazenamento", "temperatura"]) ? status("A", "Cuidados de conservacao localizados.") : status("SE", "Cuidados de conservacao nao localizados.");
  if (name.includes("limites minimos")) return status("SE", "Exige comparar dose diaria com IN 28/2018 e ficha tecnica.");
  if (name.includes("declaracoes figuras")) return includesAny(text, ["cura", "tratamento", "prevencao", "prevenção", "dor"]) ? status("NA", "Texto de risco terapeutico localizado.") : status("SE", "Exige avaliacao de figuras e alegacoes.");
  if (name.includes("numero da notificacao")) return hasProcessNumber(raw) ? status("A", "Numero/processo localizado.") : status(ctx.regularization.status === "NA" ? "NA" : "SE", "Numero/processo de notificacao nao localizado.");
  if (name.includes("gluten")) return includesAny(text, ["gluten", "glúten"]) ? status("A", "Declaracao de gluten localizada.") : status("NA", "Declaracao de gluten nao localizada.");
  if (name.includes("alergenicos")) return includesAny(text, ["alergenico", "alergênico", "contem derivados", "contém derivados"]) ? status("A", "Declaracao de alergenicos localizada.") : status("SE", "Alergenicos exigem formula e fichas tecnicas.");
  if (name.includes("lactose")) return includesAny(text, ["lactose"]) ? status("A", "Declaracao de lactose localizada.") : status("SE", "Lactose nao localizada; depende da composicao.");
  if (name.includes("suplemento")) return includesAny(text, ["este produto nao e um medicamento", "não exceder", "manter fora do alcance"]) ? status("A", "Advertencias gerais de suplemento localizadas.") : status("NA", "Advertencias gerais de suplemento nao localizadas.");
  if (name.includes("edulcorantes")) return includesAny(text, ["edulcorante", "aspartame", "sucralose", "acesulfame"]) ? status("SE", "Edulcorante localizado; verificar advertencia aplicavel.") : status("NAP", "Edulcorante nao identificado.");
  if (name.includes("transgen") || name.includes("gene")) return includesAny(text, ["maltodextrina", "milho", "soja"]) ? status("SE", "Ingrediente com possivel origem transgenica exige declaracao do fornecedor.") : status("NAP", "Sem ingrediente de risco identificado no texto.");
  if (name.includes("tolerancia")) return status("SE", "Exige memorial de calculo ou laudo.");
  if (name.includes("alegacoes nutricionais")) return includesAny(text, ["nao contem acucar", "não contém açúcar", "fonte de", "alto teor"]) ? status("SE", "Alegacao nutricional localizada; exige criterio e memorial.") : status("NAP", "Alegacao nutricional nao localizada.");
  if (name.includes("tabela")) return includesAny(text, ["informacao nutricional", "informação nutricional"]) ? status("A", "Tabela nutricional localizada.") : status("SE", "Tabela nutricional nao localizada no texto.");
  if (name.includes("porcao")) return includesAny(text, ["porcao", "porção"]) ? status("A", "Porcao localizada.") : status("SE", "Porcao nao localizada.");
  if (name.includes("%vd") || name.includes("valor energetico")) return includesAny(text, ["%vd", "valor energetico", "valor energético"]) ? status("SE", "Valores localizados; calcular e comparar.") : status("SE", "Sem dados suficientes para calculo.");
  if (name.includes("formatacao") || name.includes("localizacao")) return status("SE", "Exige arte final em tamanho real.");
  if (name.includes("embalagem multipla")) return status("NAP", "Embalagem multipla nao identificada.");
  if (name.includes("carboidratos") || name.includes("proteinas") || name.includes("gorduras") || name.includes("fibras") || name.includes("sodio") || name.includes("acucares")) return status("SE", "Calculo exige valores completos da tabela.");

  return status("SE", "Item exige avaliacao documental.");
}

function status(result, evidence) {
  return { result, evidence };
}

function summarize(checklist) {
  return checklist.reduce(
    (acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1;
      return acc;
    },
    { A: 0, NA: 0, NAP: 0, SE: 0 }
  );
}

export function analyzeLabel({ productName, brand, category, labelText, packageInfo, reviewOcrText = true }, knowledge) {
  const rawText = labelText || "";
  const normalizedText = normalize(rawText);
  const regularization = classifyRegularization({ category, labelText: rawText });
  const ocrReview = reviewExtractedText(rawText, reviewOcrText);
  const colorConflict = includesAny(normalizedText, ["colorido artificialmente"]) && !includesAny(normalizedText, ["corante", "dioxido de titanio", "dióxido de titânio", "caramelo"]);
  const ctx = { rawText, normalizedText, regularization, colorConflict };

  const checklist = knowledge.nuvisa.map((item) => {
    const checked = resultForItem(item, ctx);
    return {
      ensaio: item.ensaio_nuvisa,
      item: item.item_nuvisa,
      legislation: item.legislacao_na_folha,
      requirement: item.evidencia_no_rotulo,
      evidence: checked.evidence,
      result: checked.result,
      action: item.regra_de_bloqueio,
    };
  });

  const counts = summarize(checklist);
  const blocks = checklist
    .filter((item) => item.result === "NA")
    .slice(0, 8)
    .map((item) => `${item.item}: ${item.evidence}`);

  let decision = "Liberar com restricoes";
  if (counts.NA > 0 || regularization.status === "NA") decision = "Nao liberar";
  if (counts.NA === 0 && counts.SE <= 3 && regularization.status === "A") decision = "Liberar com revisao final";

  return {
    productName,
    brand,
    category,
    packageInfo,
    ocrReview,
    decision,
    regularization,
    counts,
    blocks,
    checklist,
    generatedAt: new Date().toISOString(),
  };
}
