import { parseLabel } from "../lib/label-parser.js";

const text = `SUPLEMENTO ALIMENTAR EM COMPRIMIDOS
CONDROLESS COMPLEX
Auxilia na manutencao da funcao articular
Curcumina 80 mg
Vitamina C 14 mg 30%VD
Colageno tipo II 1,6 mg
Recomendacao de uso: Adultos acima de 19 anos, ingerir 1 comprimido ao dia.
Este produto nao deve ser consumido por gestantes, lactantes e criancas.
Ingredientes: Curcumina, Vitamina C, Colageno tipo II, Estearato de Magnesio (INS 470iii).
NAO CONTEM GLUTEN. NAO CONTEM LACTOSE.`;

const r = parseLabel(text);
const names = r.ingredients.map((i) => i.name.toLowerCase());
const checks = [
  ["Curcumina 80 mg", r.ingredients.some((i) => /curcumina/i.test(i.name) && i.dose === "80" && i.unit === "mg")],
  ["Vitamina C 14 mg (ignora 30%VD)", r.ingredients.some((i) => /vitamina c/i.test(i.name) && i.dose === "14" && i.unit === "mg")],
  ["Colageno tipo II 1.6 mg (virgula->ponto)", r.ingredients.some((i) => /colageno/i.test(i.name) && i.dose === "1.6")],
  ["Captou alegacao articular", r.claims.some((c) => /articular/i.test(c))],
  ["NAO captou a recomendacao de uso como alegacao", !r.claims.some((c) => /recomendacao de uso/i.test(c))],
  ["Advertencia 'nao contem gluten' presente", r.warningsPresent.some((w) => /gluten/i.test(w))],
  ["Advertencia gestantes/lactantes presente", r.warningsPresent.some((w) => /gestantes/i.test(w))],
  ["Publico adulto", r.audience.includes("adulto")],
];

let ok = 0;
for (const [n, p] of checks) { console.log(`${p ? "PASS" : "FALHOU"}  ${n}`); if (p) ok += 1; }
console.log(`\n${ok}/${checks.length} ok`);
console.log("ingredientes:", names.join(" | "));
process.exit(ok === checks.length ? 0 : 1);
