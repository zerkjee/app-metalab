// Extrator DETERMINISTICO do rotulo (sem IA). Transforma o texto bruto do rotulo
// em dados estruturados para o motor de conformidade. Heuristico: a IA refina no modo ao vivo.

const UNIT_RE = "mg|mcg|µg|mcg|g|kg|ui|u\\.?i\\.?|kcal|kj|ml|%vd|%";
const DOSE_LINE_RE = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_RE})\\b`, "i");

// Termos que indicam linhas que NAO sao ingredientes (tabela/porcao/cabecalhos).
const SKIP_TERMS = [
  "porcao",
  "porção",
  "porcoes",
  "valor energetico",
  "valor energético",
  "informacao nutricional",
  "informação nutricional",
  "quantidade por",
  "medida caseira",
];

const CLAIM_VERBS = [
  "auxilia",
  "contribui",
  "ajuda",
  "atua",
  "favorece",
  "mantem",
  "mantém",
  "manutencao",
  "manutenção",
  "fortalece",
  "melhora",
  "combate",
  "previne",
  "trata",
  "cura",
  "reduz",
  "aumenta",
  "estimula",
  "funcao",
  "função",
];

const WARNING_HINTS = [
  "nao contem",
  "não contém",
  "contem",
  "contém",
  "manter fora do alcance",
  "nao deve ser consumido",
  "não deve ser consumido",
  "nao e um medicamento",
  "não é um medicamento",
  "nao exceder",
  "não exceder",
  "alergic",
  "alérgic",
  "fenilcetonurico",
  "fenilcetonúrico",
  "fenilalanina",
  "gluten",
  "glúten",
  "lactose",
  "cafeina",
  "cafeína",
  "diabetic",
  "conservar",
];

function norm(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function cleanName(raw) {
  return String(raw || "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(ins\s*\d+\w*)\b/gi, "")
    .replace(/[•·\-–:]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseLabel(text) {
  const raw = String(text || "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const ingredients = [];
  const seen = new Set();

  // 1) Linhas com dose explicita: "Curcumina 80 mg", "Vitamina C 14 mg 30%VD"
  for (const line of lines) {
    const n = norm(line);
    if (SKIP_TERMS.some((t) => n.includes(norm(t)))) continue;
    const m = line.match(DOSE_LINE_RE);
    if (m) {
      const name = cleanName(m[1]);
      const unit = m[3].toLowerCase().replace(/\./g, "");
      if (name && unit !== "%vd" && unit !== "%" && unit !== "kcal" && unit !== "kj") {
        const key = norm(name);
        if (!seen.has(key)) {
          seen.add(key);
          ingredients.push({ name, dose: m[2].replace(",", "."), unit });
        }
      }
    }
  }

  // 2) Lista "Ingredientes: a, b, c" — capta nomes sem dose (ativos/aditivos)
  const ingLine = raw.match(/ingredientes?:?\s*(.+)/i);
  if (ingLine) {
    for (const part of ingLine[1].split(/[,.;]|\be\b/i)) {
      const name = cleanName(part);
      if (name.length > 2) {
        const key = norm(name);
        if (!seen.has(key)) {
          seen.add(key);
          ingredients.push({ name, dose: "", unit: "" });
        }
      }
    }
  }

  // 3) Alegacoes candidatas (linhas com verbos de beneficio)
  const claims = [];
  for (const line of lines) {
    const n = norm(line);
    if (n.length < 8) continue;
    if (CLAIM_VERBS.some((v) => n.includes(norm(v)))) {
      // evita capturar a recomendacao de uso / advertencias
      if (n.includes("recomenda") || n.includes("ingerir") || n.includes("nao exceder") || n.includes("não exceder")) continue;
      if (!claims.includes(line)) claims.push(line);
    }
  }

  // 4) Publico
  const all = norm(raw);
  const audience = ["adulto"];
  if (all.includes("infantil") || all.includes("para criancas") || all.includes("para crianças")) {
    audience.push("crianca");
  }

  // 5) Advertencias presentes (linhas-candidatas)
  const warningsPresent = [];
  for (const line of lines) {
    const n = norm(line);
    if (WARNING_HINTS.some((h) => n.includes(norm(h)))) {
      if (!warningsPresent.includes(line)) warningsPresent.push(line);
    }
  }

  return { audience, ingredients, claims, warningsPresent };
}
