// Motor de conformidade DETERMINISTICO (sem IA).
// Recebe o rotulo ja estruturado + o conjunto de regras (banco) e devolve achados.
// Funcao pura: mesma entrada -> mesma saida. Auditavel: cada achado aponta a norma.

function norm(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const POP = {
  adulto: { max: "max_adult", forbidden: null, label: "adultos" },
  crianca: { max: "max_child", forbidden: "forbidden_child", label: "crianças" },
  gestante: { max: "max_pregnant", forbidden: "forbidden_pregnant", label: "gestantes" },
  lactante: { max: "max_lactating", forbidden: "forbidden_lactating", label: "lactantes" },
};

function aliasList(rule) {
  return String(rule.aliases || "")
    .split(/[;,|]/)
    .map(norm)
    .filter(Boolean);
}

function matchConstituent(name, constituents) {
  const n = norm(name);
  if (!n) return null;
  // 1) nome exato ou alias exato
  let hit = constituents.find((c) => norm(c.name) === n || aliasList(c).includes(n));
  if (hit) return hit;
  // 2) conter o nome da regra (ex.: "vitamina c (acido ascorbico)" contem "vitamina c")
  hit = constituents.find((c) => {
    const cn = norm(c.name);
    return (cn && (n.includes(cn) || cn.includes(n))) || aliasList(c).some((a) => n.includes(a) || a.includes(n));
  });
  return hit || null;
}

function isDraft(rule) {
  return (rule.status || "draft") !== "verified";
}

// Severidade para o resumo
const SEVERITY = {
  conforme: "ok",
  sem_limite: "ok",
  presente: "ok",
  acima: "nao_conforme",
  nao_conforme: "nao_conforme",
  dose_insuficiente: "nao_conforme",
  ausente: "nao_conforme",
  sem_constituinte: "nao_conforme",
  nao_consta: "atencao",
  sem_regra: "atencao",
};

function checkIngredient(ing, constituents, audience) {
  const rule = matchConstituent(ing.name, constituents);
  const dose = toNum(ing.dose);

  if (!rule) {
    return {
      name: ing.name,
      dose: ing.dose,
      unit: ing.unit || "",
      status: "sem_regra",
      needsHumanReview: true,
      message: "Sem regra cadastrada no banco — IA deve pesquisar a ANVISA e cadastrar; RT verifica.",
    };
  }

  const unitMismatch = ing.unit && rule.unit && norm(ing.unit) !== norm(rule.unit);
  const perPopulation = [];
  let worst = "conforme";

  for (const popKey of audience) {
    const pop = POP[popKey];
    if (!pop) continue;

    if (pop.forbidden && Number(rule[pop.forbidden]) === 1) {
      perPopulation.push({ population: pop.label, status: "nao_conforme", detail: `Proibido/desaconselhado para ${pop.label}.` });
      worst = "nao_conforme";
      continue;
    }
    const max = toNum(rule[pop.max]);
    if (max === null) {
      perPopulation.push({ population: pop.label, status: "sem_limite", detail: `Sem limite máximo cadastrado para ${pop.label}.` });
      continue;
    }
    if (dose !== null && dose > max) {
      perPopulation.push({
        population: pop.label,
        status: "acima",
        detail: `Dose do rótulo ${dose}${rule.unit || ""} acima do máximo ${max}${rule.unit || ""} para ${pop.label}.`,
      });
      if (worst !== "nao_conforme") worst = "acima";
    } else {
      perPopulation.push({
        population: pop.label,
        status: "conforme",
        detail: dose !== null ? `Dose ${dose}${rule.unit || ""} dentro do máximo ${max}${rule.unit || ""}.` : `Máximo ${max}${rule.unit || ""}; dose do rótulo não informada.`,
      });
    }
  }

  return {
    name: ing.name,
    dose: ing.dose,
    unit: ing.unit || rule.unit || "",
    status: worst,
    needsHumanReview: isDraft(rule) || unitMismatch || dose === null,
    rule: { name: rule.name, norm: rule.norm || "", sourceUrl: rule.source_url || "", status: rule.status || "draft" },
    warning: rule.warning || "",
    unitMismatch: Boolean(unitMismatch),
    perPopulation,
  };
}

function checkClaim(claimText, claims, ingredients) {
  const ct = norm(claimText);
  const matched = claims.find((r) => {
    const rt = norm(r.claim_text);
    return rt && (ct.includes(rt) || rt.includes(ct));
  });

  if (!matched) {
    return {
      claim: claimText,
      status: "nao_consta",
      needsHumanReview: true,
      message: "Não consta na lista de alegações autorizadas — revisar (possível alegação não permitida ou terapêutica).",
    };
  }

  const result = {
    claim: claimText,
    status: "conforme",
    needsHumanReview: isDraft(matched),
    rule: { claimText: matched.claim_text, norm: matched.norm || "", sourceUrl: matched.source_url || "", status: matched.status || "draft" },
  };

  if (matched.constituent) {
    const ing = ingredients.find((i) => {
      const inm = norm(i.name);
      const cn = norm(matched.constituent);
      return inm && cn && (inm.includes(cn) || cn.includes(inm));
    });
    const min = toNum(matched.min_dose);
    if (!ing) {
      result.status = "sem_constituinte";
      result.message = `A alegação exige ${matched.constituent}${min !== null ? ` (mín. ${min}${matched.unit || ""})` : ""}, que não aparece no rótulo.`;
    } else if (min !== null && toNum(ing.dose) !== null && toNum(ing.dose) < min) {
      result.status = "dose_insuficiente";
      result.message = `${matched.constituent} no rótulo (${ing.dose}${matched.unit || ""}) abaixo do mínimo ${min}${matched.unit || ""} para sustentar a alegação.`;
    } else {
      result.message = `Alegação autorizada e sustentada por ${matched.constituent}.`;
    }
  } else {
    result.message = "Alegação consta como autorizada.";
  }
  return result;
}

function checkWarnings(warnings, ingredients, audience, warningsPresent) {
  const ingredientsText = ingredients.map((i) => norm(i.name)).join(" | ");
  const audienceNorm = audience.map((a) => norm(POP[a]?.label || a));
  const findings = [];

  for (const rule of warnings) {
    const trigger = norm(rule.trigger_term);
    if (!trigger) continue;
    const triggered = ingredientsText.includes(trigger) || audienceNorm.some((a) => a.includes(trigger) || trigger.includes(a));
    if (!triggered) continue; // advertência não se aplica a este rótulo

    const present = (warningsPresent || []).some((w) => {
      const wt = norm(w);
      const tt = norm(rule.text);
      return tt && (wt.includes(tt) || tt.includes(wt));
    });

    findings.push({
      trigger: rule.trigger_term,
      text: rule.text,
      status: present ? "presente" : "ausente",
      needsHumanReview: isDraft(rule) && !present,
      rule: { norm: rule.norm || "", sourceUrl: rule.source_url || "", status: rule.status || "draft" },
    });
  }
  return findings;
}

export function checkCompliance(label, ruleset) {
  const audience = Array.isArray(label.audience) && label.audience.length ? label.audience : ["adulto"];
  const ingredients = Array.isArray(label.ingredients) ? label.ingredients : [];
  const constituents = ruleset.constituents || [];
  const claims = ruleset.claims || [];
  const warnings = ruleset.warnings || [];

  const ingredientFindings = ingredients.map((ing) => checkIngredient(ing, constituents, audience));
  const claimFindings = (label.claims || []).map((c) => checkClaim(c, claims, ingredients));
  const warningFindings = checkWarnings(warnings, ingredients, audience, label.warningsPresent || []);

  const all = [...ingredientFindings, ...claimFindings, ...warningFindings];
  const summary = { ok: 0, atencao: 0, nao_conforme: 0, revisao: 0 };
  for (const f of all) {
    const sev = SEVERITY[f.status] || "atencao";
    summary[sev] = (summary[sev] || 0) + 1;
    if (f.needsHumanReview) summary.revisao += 1;
  }

  return {
    audience,
    ingredients: ingredientFindings,
    claims: claimFindings,
    warnings: warningFindings,
    summary,
    // util para decidir a etapa de IA: ingredientes sem regra precisam de pesquisa
    missingConstituents: ingredientFindings.filter((f) => f.status === "sem_regra").map((f) => f.name),
  };
}
