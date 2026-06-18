// Renderiza o resultado do motor deterministico em Markdown (vai no topo do laudo)
// e monta um contexto compacto para a IA focar nas lacunas (modo ao vivo).

import { evaluateChecklistItem } from "./checklist-eval.js";

const POP_LABEL = { adulto: "adultos", crianca: "crianças", gestante: "gestantes", lactante: "lactantes" };

const ING_STATUS = {
  conforme: "Conforme",
  acima: "Acima do limite",
  nao_conforme: "Não conforme",
  sem_limite: "Sem limite cadastrado",
  sem_regra: "Sem regra (cadastrar)",
};
const CLAIM_STATUS = {
  conforme: "Autorizada",
  dose_insuficiente: "Dose insuficiente",
  sem_constituinte: "Constituinte ausente",
  nao_consta: "Não consta (revisar)",
};
const WARN_STATUS = { presente: "Presente", ausente: "Ausente" };

function reviewTag(f) {
  return f.needsHumanReview ? " — *revisar*" : "";
}

function ingObs(f) {
  if (f.status === "sem_regra") return f.message || "";
  if (f.perPopulation?.length) {
    return f.perPopulation.map((p) => `${p.population}: ${p.detail}`).join(" ");
  }
  return f.rule?.norm ? `Norma: ${f.rule.norm}` : "";
}

const STATUS_LABEL = { A: "✅ A", NA: "❌ NA", NAP: "— NAP", SE: "SE (a verificar)" };

function renderChecklist(checklist, labelText, parsed, ingredientFindings) {
  if (!checklist?.length) return "";
  const out = [];
  let totalA = 0, totalNA = 0, totalNAP = 0, totalSE = 0;

  out.push("### Checklist NUVISA (itens das folhas e legislação aplicável)");
  out.push("");
  out.push("| Item | Legislação | Resultado | Evidência / Regra de bloqueio |");
  out.push("|---|---|---|---|");
  let ensaio = "";
  for (const c of checklist) {
    if (c.ensaio !== ensaio) {
      ensaio = c.ensaio;
      out.push(`| **${ensaio}** |  |  |  |`);
    }
    const ev = evaluateChecklistItem(c.item, c.ensaio, labelText, parsed, ingredientFindings);
    const statusLabel = STATUS_LABEL[ev.status] || ev.status;
    const evidencia = ev.evidence || c.regra_bloqueio || "—";
    out.push(`| ${c.item} | ${c.legislacao || "—"} | ${statusLabel} | ${evidencia} |`);
    if (ev.status === "A") totalA++;
    else if (ev.status === "NA") totalNA++;
    else if (ev.status === "NAP") totalNAP++;
    else totalSE++;
  }
  out.push("");
  out.push(
    `> **Resumo automático:** ✅ A: ${totalA} | ❌ NA: ${totalNA} | — NAP: ${totalNAP} | SE (a verificar): ${totalSE}. ` +
    "A = conforme/evidência presente; NA = não conforme; NAP = não aplicável; SE = sem evidência — requer análise IA ou RT."
  );
  out.push("");
  return out.join("\n");
}

export function renderComplianceMarkdown(parsed, result, checklist = [], labelText = "") {
  const audience = (result.audience || ["adulto"]).map((a) => POP_LABEL[a] || a).join(", ");
  const out = [];
  out.push("## Conferência automática (banco de regras)");
  out.push("");
  out.push(`Público considerado: ${audience}.`);
  out.push("");

  const totalRules =
    (result.ingredients?.length || 0) + (result.claims?.length || 0) + (result.warnings?.length || 0);
  const anyRule =
    result.ingredients?.some((f) => f.status !== "sem_regra") ||
    result.claims?.some((f) => f.status !== "nao_consta") ||
    (result.warnings?.length || 0) > 0;

  if (!anyRule) {
    out.push(
      "> Banco de regras ainda **vazio/incompleto**: cadastre constituintes, alegações e advertências em **Administração → Regras** (ou deixe a IA sugerir e o RT verificar). A conferência abaixo já roda determinística sobre o que existir."
    );
    out.push("");
  }

  // Ingredientes
  out.push("### Ingredientes");
  out.push("");
  if (result.ingredients?.length) {
    out.push("| Ingrediente | Dose | Resultado | Observação |");
    out.push("|---|---|---|---|");
    for (const f of result.ingredients) {
      const dose = f.dose ? `${f.dose} ${f.unit || ""}`.trim() : "—";
      out.push(`| ${f.name} | ${dose} | ${ING_STATUS[f.status] || f.status}${reviewTag(f)} | ${ingObs(f)} |`);
    }
  } else {
    out.push("Nenhum ingrediente identificado no texto.");
  }
  out.push("");

  // Alegacoes
  out.push("### Alegações");
  out.push("");
  if (result.claims?.length) {
    out.push("| Alegação | Resultado | Observação |");
    out.push("|---|---|---|");
    for (const f of result.claims) {
      out.push(`| ${f.claim} | ${CLAIM_STATUS[f.status] || f.status}${reviewTag(f)} | ${f.message || ""} |`);
    }
  } else {
    out.push("Nenhuma alegação detectada no texto.");
  }
  out.push("");

  // Advertencias
  out.push("### Advertências aplicáveis");
  out.push("");
  if (result.warnings?.length) {
    out.push("| Gatilho | Resultado | Texto exigido |");
    out.push("|---|---|---|");
    for (const f of result.warnings) {
      out.push(`| ${f.trigger} | ${WARN_STATUS[f.status] || f.status}${reviewTag(f)} | ${f.text || ""} |`);
    }
  } else {
    out.push("Nenhuma advertência do banco se aplica a este rótulo (ou banco vazio).");
  }
  out.push("");
  out.push(renderChecklist(checklist, labelText, parsed, result.ingredients));
  out.push(
    "> Esta seção é **determinística** (sem IA), baseada no banco de regras verificadas; cada conclusão aponta a norma. O Responsável Técnico valida. Itens *revisar* / “sem regra” / “não consta” precisam de cadastro no banco ou análise humana."
  );
  out.push("");
  out.push(`_Regras avaliadas: ${totalRules}._`);
  out.push("");
  return out.join("\n");
}

// Contexto compacto para o agente IA (modo ao vivo): foca a pesquisa nas lacunas.
export function buildEngineContext(parsed, result, checklist = [], labelText = "") {
  const lines = [];
  lines.push("EXTRACAO ESTRUTURADA (deterministica) DO ROTULO:");
  lines.push(`- Publico: ${(result.audience || []).join(", ") || "adulto"}`);
  lines.push(
    `- Ingredientes: ${
      parsed.ingredients.map((i) => `${i.name}${i.dose ? ` ${i.dose}${i.unit}` : ""}`).join("; ") || "(nenhum)"
    }`
  );
  lines.push(`- Alegacoes detectadas: ${parsed.claims.map((c) => `"${c}"`).join("; ") || "(nenhuma)"}`);
  lines.push(`- Advertencias presentes: ${parsed.warningsPresent.map((w) => `"${w}"`).join("; ") || "(nenhuma)"}`);
  lines.push("");
  lines.push("JA CONFERIDO PELO MOTOR (banco de regras) — nao repita, apenas complemente:");
  for (const f of result.ingredients || []) {
    lines.push(`- ${f.name}: ${ING_STATUS[f.status] || f.status}`);
  }
  const missing = result.missingConstituents || [];
  if (missing.length) {
    lines.push("");
    lines.push(`INGREDIENTES SEM REGRA NO BANCO (PESQUISE NA ANVISA e detalhe limite/populacoes): ${missing.join(", ")}`);
  }
  const unmatchedClaims = (result.claims || []).filter((c) => c.status === "nao_consta").map((c) => c.claim);
  if (unmatchedClaims.length) {
    lines.push("");
    lines.push(`ALEGACOES NAO ENCONTRADAS NA BASE (avalie se permitidas ou terapeuticas/proibidas): ${unmatchedClaims.map((c) => `"${c}"`).join("; ")}`);
  }
  if (checklist?.length) {
    lines.push("");
    lines.push("CHECKLIST NUVISA — revise os itens SE abaixo (ja determinados pelo motor nao precisam ser repetidos):");
    for (const c of checklist) {
      const ev = evaluateChecklistItem(c.item, c.ensaio, labelText, parsed, result.ingredients);
      if (ev.status === "SE") {
        lines.push(`- [${c.ensaio}] ${c.item} -> ${c.legislacao}`);
      }
    }
  }
  lines.push("");
  lines.push("Confie nas conformidades ja apuradas; foque sua pesquisa nas lacunas acima.");
  return lines.join("\n");
}
