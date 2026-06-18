import fs from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";

const KIT_DIR = path.join(process.cwd(), "outputs", "kit_agente_rotulagem_suplementos");

export async function loadKnowledge() {
  const [nuvisaText, regularizationText] = await Promise.all([
    fs.readFile(path.join(KIT_DIR, "matriz_nuvisa_para_agente.csv"), "utf8"),
    fs.readFile(path.join(KIT_DIR, "matriz_regularizacao_anvisa_in281.csv"), "utf8"),
  ]);

  return {
    nuvisa: parseCsv(nuvisaText),
    regularization: parseCsv(regularizationText),
  };
}

// Arquivos do kit que viram o contexto regulatorio do agente de IA.
// Ler aqui (e nao embutir no codigo) deixa a base editavel sem mexer no app.
const AGENT_KNOWLEDGE_FILES = [
  ["promptMestre", "prompt_mestre_agente_v2_metalab.md"],
  ["protocoloPesquisa", "protocolo_pesquisa_automatica_anvisa.md"],
  ["matrizNuvisaCsv", "matriz_nuvisa_para_agente.csv"],
  ["matrizRegularizacaoCsv", "matriz_regularizacao_anvisa_in281.csv"],
  ["modeloRelatorio", "modelo_relatorio_completo_nuvisa.md"],
];

let agentKnowledgeCache = null;

export async function loadAgentKnowledge() {
  if (agentKnowledgeCache) return agentKnowledgeCache;

  const entries = await Promise.all(
    AGENT_KNOWLEDGE_FILES.map(async ([key, file]) => {
      try {
        const text = await fs.readFile(path.join(KIT_DIR, file), "utf8");
        return [key, text.trim()];
      } catch {
        return [key, ""];
      }
    })
  );

  agentKnowledgeCache = Object.fromEntries(entries);
  return agentKnowledgeCache;
}
