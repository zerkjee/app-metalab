import Anthropic from "@anthropic-ai/sdk";
import { loadAgentKnowledge } from "./knowledge";

const MODEL = "claude-opus-4-8";
// Cada continuacao serve para o caso de a busca web estourar o loop interno
// de ferramentas do servidor (stop_reason "pause_turn"). 6 e folga suficiente
// para um rotulo com muitos ingredientes e muitas alegacoes.
const MAX_CONTINUATIONS = 6;
const MAX_TOKENS = 32000;

// Bump quando as regras/ferramentas mudarem -> invalida o cache do banco.
export const PROMPT_VERSION = "2026-06-16.2";
export const AGENT_MODEL = MODEL;

// Acesso direto as fontes oficiais: busca e leitura travadas nestes dominios.
const OFFICIAL_DOMAINS = [
  "gov.br",
  "anvisa.gov.br",
  "consultas.anvisa.gov.br",
  "in.gov.br",
  "bvsms.saude.gov.br",
  "saude.gov.br",
  "planalto.gov.br",
];

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY nao configurada.");
    this.name = "MissingApiKeyError";
  }
}

// Regras fixas do agente. Vem antes da base do kit para que o prefixo grande
// (kit) possa ser cacheado pela API entre analises.
const SYSTEM_RULES = `Voce e o Agente METALAB de Pre-Auditoria de Rotulagem de Suplementos Alimentares.

Voce trabalha para Assuntos Regulatorios e Garantia da Qualidade da METALAB. Sua funcao e analisar a arte/rotulo de um suplemento alimentar ANTES da liberacao para impressao, fabricacao ou comercializacao, no padrao das folhas SRS Belo Horizonte / NUVISA.

PRINCIPIOS INEGOCIAVEIS
1. Nunca invente regra, norma, limite, dose ou interpretacao. Se nao tiver certeza, pesquise; se ainda assim nao confirmar, marque como "precisa de revisao humana" e diga exatamente o que falta.
2. Toda afirmacao regulatoria relevante deve ter fonte: norma (RDC/IN/Lei/Decreto com artigo) e, quando pesquisada na web, link + data da consulta.
3. Separe sempre FATO (o que esta no rotulo) de INTERPRETACAO (o que a norma exige) de RECOMENDACAO (o que a METALAB deve fazer).
4. Nunca escreva "aprovado". Use "sem achado critico aparente na pre-auditoria". A liberacao final e humana (Responsavel Tecnico).
5. Trabalhe em portugues do Brasil.

ACESSO DIRETO A ANVISA (ferramentas web_search e web_fetch)
Voce TEM acesso direto as fontes oficiais. A busca (web_search) e a leitura de paginas (web_fetch) estao TRAVADAS em dominios oficiais (gov.br, anvisa.gov.br, consultas.anvisa.gov.br, in.gov.br/DOU, planalto.gov.br, saude.gov.br). Use-as de verdade — nao responda de memoria sobre limites e normas.
- Fluxo: pesquise (web_search) o tema na ANVISA e, em seguida, ABRA a pagina/norma encontrada com web_fetch para ler o texto vigente e confirmar artigo, limite e condicao. Nao conclua sem ter aberto a fonte.
- Para regularizacao/notificacao, consulte o portal consultas.anvisa.gov.br (nome do produto, marca, CNPJ, numero declarado) e relate se encontrou, se confere ou se diverge.
- Como a leitura esta restrita a fontes oficiais, se precisar de um valor que so exista fora da ANVISA (ex.: UL internacional), nao invente: declare que a Anvisa nao fixa o numero e marque para revisao humana.
- Antes de pedir qualquer coisa para a fabrica, pesquise voce mesmo nessas fontes.
- Pesquise a VIGENCIA de cada norma citada no rotulo (ex.: confirmar se a RDC citada esta vigente ou foi revogada/substituida).
- Pesquise CADA alegacao de beneficio: se e permitida para suplemento, qual o texto autorizado, qual constituinte a sustenta e qual a dose/condicao exigida (IN 28/2018 e atualizacoes).
- Pesquise CADA ingrediente/constituinte ativo (ver bloco de ANALISE PROFUNDA POR INGREDIENTE).
- Pesquise funcao e limites de CADA aditivo declarado (INS).
- Para cada busca registre internamente: termo, fonte, link, data e conclusao. Consolide isso na secao "Fontes consultadas" do relatorio.

ANALISE PROFUNDA POR INGREDIENTE (parte mais importante deste laudo)
Para CADA ingrediente e constituinte ativo do rotulo (vitaminas, minerais, ervas/extratos vegetais, aminoacidos, colageno, probioticos, enzimas, etc.), pesquise e responda explicitamente:
- Se o constituinte e AUTORIZADO para uso em suplemento alimentar no Brasil (IN 28/2018 anexos, RDC 243/2018, e atualizacoes vigentes).
- LIMITE MAXIMO permitido por dia (dose maxima autorizada) e, quando houver, limite minimo para sustentar alegacao.
- A QUANTIDADE diaria que o rotulo entrega (calcule pela dose recomendada x quantidade por porcao) e compare com o limite. Diga se esta DENTRO, ACIMA ou ABAIXO do permitido, com o numero.
- Limite superior tolerado / nivel maximo de seguranca (UL) quando existir referencia (Anvisa, e como apoio: tabelas de ingestao/IOM/EFSA), deixando claro quando a fonte nao for a Anvisa.
- RESTRICOES POR POPULACAO: ate que quantidade (ou se e proibido/desaconselhado) para CRIANCAS, GESTANTES e LACTANTES. Indique se o ingrediente exige advertencia especifica para esses grupos e se a dose do rotulo respeita isso.
- Advertencias obrigatorias ligadas ao ingrediente (ex.: cafeina, vitamina A, ferro, fitoesteróis, etc.).
- Conclusao por ingrediente: Conforme | Atencao | Nao conforme | Precisa de revisao humana, com a fonte e a data.
Se faltar a quantidade real na formula, use a quantidade declarada no rotulo e marque "calculado com base no rotulo".

COBERTURA TOTAL DAS FOLHAS NUVISA
O relatorio deve percorrer TODOS os itens de TODAS as folhas SRS BH / NUVISA fornecidas na base (nenhum item pode ser omitido). Cada item recebe um resultado:
- A = atende | NA = nao atende | NAP = nao se aplica | SE = sem evidencia suficiente.
Nunca marque "A" sem evidencia no rotulo ou em documento. Se nao se aplica, explique por que. Se falta evidencia, diga qual documento/dado falta. Use exatamente a legislacao indicada na linha da folha — nao troque por analise generica.

CALCULOS
Faca os calculos de %VD e de valor energetico quando houver dados na tabela nutricional, comparando o valor calculado com o impresso e apontando divergencias.

BLOQUEIOS (sempre marcar para revisao humana / nao liberar)
Alegacao terapeutica ou de cura/tratamento/prevencao/analgesia; alegacao funcional sem dose/constituinte/texto autorizado confirmado; norma revogada citada no rotulo; ingrediente acima do limite; "nao contem" sem comprovacao; ausencia de advertencia obrigatoria; dose incompativel com a populacao (criancas/gestantes/lactantes); divergencia entre formula e rotulo.

FORMATO DE SAIDA
Responda APENAS com o relatorio final em Markdown valido (titulos, tabelas, listas). Sem preambulo, sem "aqui esta", sem comentarios fora do relatorio. Siga a estrutura do MODELO DE RELATORIO fornecido na base, mas ACRESCENTE, logo apos a "Classificacao regulatoria", uma secao chamada "## Analise profunda por ingrediente" com uma subsecao por ingrediente seguindo o bloco acima. Preencha as colunas das tabelas do checklist (Requisito normativo aplicavel, Evidencia no rotulo, Resultado, Acao). Termine sempre com a tabela "Fontes consultadas" preenchida com as buscas que voce realmente fez (fonte, link, data, uso).`;

function buildSystem(kb) {
  const bundle = [
    "===== PROMPT MESTRE (regras detalhadas de auditoria) =====",
    kb.promptMestre,
    "",
    "===== PROTOCOLO DE PESQUISA AUTOMATICA ANVISA =====",
    kb.protocoloPesquisa,
    "",
    "===== MATRIZ NUVISA (CSV: todos os itens das folhas, com legislacao e regra de bloqueio) =====",
    kb.matrizNuvisaCsv,
    "",
    "===== MATRIZ DE REGULARIZACAO (CSV: RDC 843/2024 + IN 281/2024, ritos) =====",
    kb.matrizRegularizacaoCsv,
    "",
    "===== MODELO DE RELATORIO (estrutura e formato exatos da saida) =====",
    kb.modeloRelatorio,
  ].join("\n");

  return [
    { type: "text", text: SYSTEM_RULES },
    // Bloco grande e estavel -> cacheado para baratear analises repetidas.
    { type: "text", text: bundle, cache_control: { type: "ephemeral" } },
  ];
}

function buildUserPrompt({ productName, brand, category, version, labelText, packageInfo, engineContext }) {
  const today = new Date().toISOString().slice(0, 10);
  const meta = [
    `Produto: ${productName || "(nao informado)"}`,
    `Marca: ${brand || "(nao informada)"}`,
    `Categoria declarada: ${category || "(nao informada)"}`,
    `Versao do rotulo: ${version || "(nao informada)"}`,
    `Data da pre-auditoria: ${today}`,
    packageInfo?.name ? `Arquivo de embalagem anexado: ${packageInfo.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Analise o rotulo abaixo e gere o relatorio completo de pre-auditoria no padrao SRS BH / NUVISA.

DADOS DO PRODUTO
${meta}

TEXTO DO ROTULO (extraido da arte/embalagem; pode conter ruido de OCR — sinalize trechos ilegiveis):
"""
${labelText || "(nenhum texto de rotulo foi fornecido)"}
"""
${engineContext ? `\nCONFERENCIA AUTOMATICA JA EXECUTADA (motor deterministico + banco de regras). Use como base, confirme e APROFUNDE as lacunas — nao contradiga sem justificar:\n${engineContext}\n` : ""}
Lembre-se: pesquise na web a vigencia das normas, cada alegacao e CADA ingrediente (limite maximo, dose entregue pelo rotulo, restricoes para criancas/gestantes/lactantes), e cubra TODOS os itens das folhas NUVISA. Cite fonte e data.`;
}

/**
 * Roda o agente e devolve o relatorio em pedacos (streaming).
 * Lanca MissingApiKeyError se a chave nao estiver configurada.
 */
export async function* streamReport(input) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const client = new Anthropic({ apiKey });
  const kb = await loadAgentKnowledge();
  const system = buildSystem(kb);

  const messages = [{ role: "user", content: buildUserPrompt(input) }];

  for (let attempt = 0; attempt < MAX_CONTINUATIONS; attempt += 1) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: [
        { type: "web_search_20260209", name: "web_search", allowed_domains: OFFICIAL_DOMAINS, max_uses: 15 },
        { type: "web_fetch_20260209", name: "web_fetch", allowed_domains: OFFICIAL_DOMAINS, max_uses: 12 },
      ],
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();

    // O loop de ferramentas do servidor pausou (muitas buscas). Reenvia para continuar.
    if (final.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: final.content });
      continue;
    }

    break;
  }
}

function parseIngredients(labelText) {
  const match = String(labelText || "").match(/ingredientes?:?\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,.;]|\be\b/i)
    .map((part) => part.replace(/\(.*?\)/g, "").trim())
    .filter((part) => part.length > 1)
    .slice(0, 8);
}

/**
 * Modo simulacao: gera um relatorio representativo SEM chamar a API.
 * Serve para testar o fluxo completo (UI, banco, download) localmente sem chave.
 * O conteudo e claramente marcado como simulacao e NAO e uma analise real.
 */
export async function* streamMock(input) {
  const today = new Date().toISOString().slice(0, 10);
  const ingredients = parseIngredients(input.labelText);
  const ingredientBlocks = (ingredients.length ? ingredients : ["(ingredientes nao identificados no texto)"])
    .map(
      (ing) => `### ${ing}

| Item | Resultado (SIMULADO) |
|---|---|
| Autorizado para suplemento | A confirmar na IN 28/2018 e atualizacoes (pesquisa ao vivo no modo real) |
| Limite maximo / dia | A confirmar na fonte oficial |
| Quantidade entregue pelo rotulo | Calcular pela dose x porcao |
| Restricao criancas/gestantes/lactantes | A confirmar |
| Conclusao | Precisa de revisao humana |
`
    )
    .join("\n");

  const chunks = [
    `> ⚠️ **RELATORIO SIMULADO (sem chave de API).** Este texto NAO e uma analise real e NAO consulta a ANVISA. Configure \`ANTHROPIC_API_KEY\` para a analise de verdade. Serve apenas para testar a interface, o banco de dados e o download.

# Relatorio de pre-auditoria de rotulagem (SIMULACAO)

Produto: ${input.productName || "(nao informado)"}

Marca: ${input.brand || "(nao informada)"}

Categoria declarada: ${input.category || "(nao informada)"}

Versao do rotulo: ${input.version || "(nao informada)"}

Data da pre-auditoria: ${today}

`,
    `## Classificacao regulatoria

Categoria presumida: Suplemento alimentar (presumido)

Rito definido: Notificacao Anvisa (presumido — confirmar no modo real)

Base normativa: RDC 843/2024 e IN 281/2024

## Analise profunda por ingrediente (SIMULADA)

${ingredientBlocks}
`,
    `## Checklist SRS BH / NUVISA (amostra)

| Item da folha | Resultado | Acao |
|---|---|---|
| Denominacao do Produto | SE | Confirmar no modo real |
| Lista de ingredientes/aditivos | SE | Confirmar no modo real |
| Advertencia - Suplemento | SE | Confirmar no modo real |

## Fontes consultadas

| Fonte | Link | Data | Uso |
|---|---|---|---|
| (nenhuma — modo simulacao) | — | ${today} | — |

---
**Conclusao:** simulacao apenas. Para o laudo real, configure a chave e analise novamente.
`,
  ];

  for (const chunk of chunks) {
    yield chunk;
    // pequeno atraso para exercitar o streaming na interface
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}
