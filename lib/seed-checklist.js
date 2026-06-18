import fs from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv.js";
import { countChecklist, addChecklistItem, clearChecklist } from "./db.js";

const CSV_PATH = path.join(
  process.cwd(),
  "outputs",
  "kit_agente_rotulagem_suplementos",
  "matriz_nuvisa_para_agente.csv"
);

// Semeia o checklist NUVISA (item + legislacao + regra de bloqueio por ensaio)
// a partir da matriz transcrita das folhas. Idempotente: so semeia se vazio,
// a menos que force=true (recria do zero).
export async function seedChecklistFromKit({ force = false } = {}) {
  const existing = await countChecklist();
  if (existing > 0 && !force) return { seeded: 0, existing, skipped: true };
  if (force) await clearChecklist();

  const csv = await fs.readFile(CSV_PATH, "utf8");
  const rows = parseCsv(csv);
  let seeded = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r.item_nuvisa) continue;
    await addChecklistItem({
      ord: i + 1,
      origemFolha: r.origem_folha,
      ensaio: r.ensaio_nuvisa,
      item: r.item_nuvisa,
      legislacao: r.legislacao_na_folha,
      regraBloqueio: r.regra_de_bloqueio,
      status: "verified",
    });
    seeded += 1;
  }
  return { seeded, existing, skipped: false };
}
