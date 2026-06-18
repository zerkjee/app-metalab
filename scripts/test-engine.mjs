import { checkCompliance } from "../lib/compliance-engine.js";

const ruleset = {
  constituents: [
    { name: "Vitamina C", aliases: "acido ascorbico", unit: "mg", max_adult: "1000", max_child: "500", status: "verified", norm: "IN 28/2018", source_url: "" },
    { name: "Cafeina", unit: "mg", max_adult: "300", forbidden_child: 1, forbidden_pregnant: 1, warning: "Contém cafeína.", status: "verified", norm: "RDC 243/2018" },
    { name: "Curcumina", unit: "mg", max_adult: "80", status: "draft", norm: "IN 28/2018" },
  ],
  claims: [
    { claim_text: "auxilia na manutenção da função articular", constituent: "colágeno tipo II", min_dose: "40", unit: "mg", status: "verified", norm: "IN 28/2018" },
  ],
  warnings: [
    { trigger_term: "cafeina", text: "Este produto contém cafeína. Não recomendado para crianças, gestantes e lactantes.", status: "verified", norm: "RDC 243/2018" },
  ],
};

const label = {
  audience: ["adulto", "crianca"],
  ingredients: [
    { name: "Vitamina C", dose: 14, unit: "mg" },
    { name: "Cafeína", dose: 200, unit: "mg" },
    { name: "Curcumina", dose: 80, unit: "mg" },
    { name: "Colágeno tipo II", dose: 1.6, unit: "mg" },
  ],
  claims: ["Auxilia na manutenção da função articular", "Combate as dores nas articulações"],
  warningsPresent: [],
};

const r = checkCompliance(label, ruleset);

const cases = [
  ["Vitamina C dentro do limite (adulto+criança)", r.ingredients[0].status === "conforme"],
  ["Cafeína proibida para criança => não conforme", r.ingredients[1].status === "nao_conforme"],
  ["Curcumina dose=max => conforme", r.ingredients[2].status === "conforme"],
  ["Curcumina é regra rascunho => precisa revisão", r.ingredients[2].needsHumanReview === true],
  ["Colágeno sem regra cadastrada => sem_regra", r.ingredients[3].status === "sem_regra"],
  ["Colágeno entra em missingConstituents", r.missingConstituents.includes("Colágeno tipo II")],
  ["Alegação articular: dose insuficiente (1.6 < 40)", r.claims[0].status === "dose_insuficiente"],
  ["Alegação 'combate dores' não consta (revisar)", r.claims[1].status === "nao_consta"],
  ["Advertência de cafeína ausente", r.warnings.some((w) => /cafeina/i.test(w.trigger) && w.status === "ausente")],
  ["Resumo tem não conformidades", r.summary.nao_conforme >= 2],
  ["Resumo tem itens para revisão", r.summary.revisao >= 1],
];

let ok = 0;
for (const [name, pass] of cases) {
  console.log(`${pass ? "PASS" : "FALHOU"}  ${name}`);
  if (pass) ok += 1;
}
console.log(`\n${ok}/${cases.length} asserções passaram`);
console.log("\nResumo:", JSON.stringify(r.summary));
process.exit(ok === cases.length ? 0 : 1);
