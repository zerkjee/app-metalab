// Semente base do banco de regras — fonte: IN 28/2018 Anexos III, IV, V e VI;
// RDC 243/2018; RDC 727/2022.
// Status 'verified': dados derivados diretamente da legislação vigente.
// O Responsável Técnico pode ajustar/complementar via Administração → Regras.

import crypto from "node:crypto";
import { dbAll, dbRun } from "./db.js";

function now() {
  return new Date().toISOString();
}

// ---------- Dados-semente ----------

export const SEED_CONSTITUENTS = [
  // ── Vitaminas ──────────────────────────────────────────────────────────────
  {
    name: "Vitamina A",
    aliases: "Retinol,Acetato de retinila,Palmitato de retinila,Beta-caroteno",
    unit: "µg RE",
    maxAdult: "600",
    maxChild: "200",
    maxPregnant: "600",
    maxLactating: "800",
    warning: "Em doses elevadas pode ser teratogênico. Gestantes: não exceder 600 µg RE/dia.",
    norm: "IN 28/2018 Anexo III",
    sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares",
    status: "verified",
  },
  {
    name: "Vitamina C",
    aliases: "Ácido ascórbico,Ácido L-ascórbico,Ascorbato de cálcio,Ascorbato de sódio",
    unit: "mg",
    maxAdult: "2000",
    maxChild: "400",
    maxPregnant: "2000",
    maxLactating: "2000",
    norm: "IN 28/2018 Anexo III",
    sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares",
    status: "verified",
  },
  {
    name: "Vitamina D",
    aliases: "Vitamina D3,Colecalciferol,Vitamina D2,Ergocalciferol",
    unit: "µg",
    maxAdult: "100",
    maxChild: "50",
    maxPregnant: "100",
    maxLactating: "100",
    norm: "IN 28/2018 Anexo III",
    sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares",
    status: "verified",
  },
  {
    name: "Vitamina E",
    aliases: "Alfa-tocoferol,Acetato de alfa-tocoferol,Succinato de tocoferol,Tocoferóis mistos",
    unit: "mg α-TE",
    maxAdult: "268",
    maxChild: "100",
    maxPregnant: "268",
    maxLactating: "268",
    norm: "IN 28/2018 Anexo III",
    sourceUrl: "https://www.gov.br/anvisa/pt-br/assuntos/alimentos/suplementos-alimentares",
    status: "verified",
  },
  {
    name: "Vitamina K",
    aliases: "Vitamina K1,Filoquinona,Vitamina K2,Menaquinona,MK-7",
    unit: "µg",
    maxAdult: "",
    note: "Sem UL estabelecido na IN 28/2018.",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B1",
    aliases: "Tiamina,Cloridrato de tiamina,Mononitrato de tiamina",
    unit: "mg",
    maxAdult: "50",
    maxChild: "15",
    maxPregnant: "50",
    maxLactating: "50",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B2",
    aliases: "Riboflavina,Riboflavina-5-fosfato",
    unit: "mg",
    maxAdult: "40",
    maxChild: "10",
    maxPregnant: "40",
    maxLactating: "40",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B3",
    aliases: "Niacina,Ácido nicotínico,Nicotinamida,Nicotinamida ribosídeo,NR,NMN",
    unit: "mg",
    maxAdult: "35",
    maxChild: "10",
    maxPregnant: "35",
    maxLactating: "35",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B5",
    aliases: "Ácido pantotênico,Pantotenato de cálcio,Pantotenato de sódio,Dexpantenol",
    unit: "mg",
    maxAdult: "200",
    maxChild: "50",
    maxPregnant: "200",
    maxLactating: "200",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B6",
    aliases: "Piridoxina,Cloridrato de piridoxina,Piridoxal-5-fosfato,P5P",
    unit: "mg",
    maxAdult: "25",
    maxChild: "5",
    maxPregnant: "25",
    maxLactating: "25",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Biotina",
    aliases: "Vitamina B7,Vitamina H,d-Biotina",
    unit: "µg",
    maxAdult: "600",
    maxChild: "200",
    maxPregnant: "600",
    maxLactating: "600",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Ácido Fólico",
    aliases: "Vitamina B9,Folato,Folacina,L-metilfolato,5-MTHF",
    unit: "µg",
    maxAdult: "1000",
    maxChild: "300",
    maxPregnant: "1000",
    maxLactating: "1000",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Vitamina B12",
    aliases: "Cobalamina,Cianocobalamina,Metilcobalamina,Adenosilcobalamina,Hidroxicobalamina",
    unit: "µg",
    maxAdult: "100",
    maxChild: "30",
    maxPregnant: "100",
    maxLactating: "100",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },

  // ── Minerais ───────────────────────────────────────────────────────────────
  {
    name: "Cálcio",
    aliases: "Carbonato de cálcio,Citrato de cálcio,Gluconato de cálcio,Malato de cálcio,Fosfato de cálcio",
    unit: "mg",
    maxAdult: "1000",
    maxChild: "500",
    maxPregnant: "1000",
    maxLactating: "1000",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Magnésio",
    aliases: "Óxido de magnésio,Citrato de magnésio,Cloreto de magnésio,Glicinato de magnésio,Bisglicinato de magnésio,Taurato de magnésio",
    unit: "mg",
    maxAdult: "250",
    maxChild: "65",
    maxPregnant: "250",
    maxLactating: "250",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Zinco",
    aliases: "Sulfato de zinco,Gluconato de zinco,Óxido de zinco,Bisglicinato de zinco,Picolinato de zinco",
    unit: "mg",
    maxAdult: "25",
    maxChild: "5",
    maxPregnant: "25",
    maxLactating: "25",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Ferro",
    aliases: "Sulfato ferroso,Gluconato ferroso,Fumarato ferroso,Bisglicinato ferroso,Ferro quelato",
    unit: "mg",
    maxAdult: "45",
    maxChild: "10",
    maxPregnant: "45",
    maxLactating: "45",
    warning: "Doses elevadas de ferro podem causar envenenamento em crianças. Manter fora do alcance de crianças.",
    norm: "IN 28/2018 Anexo III; Anexo VI",
    status: "verified",
  },
  {
    name: "Selênio",
    aliases: "Selenito de sódio,Selenato de sódio,Seleniometionina,L-seleniometionina",
    unit: "µg",
    maxAdult: "400",
    maxChild: "90",
    maxPregnant: "400",
    maxLactating: "400",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Iodo",
    aliases: "Iodeto de potássio,Iodato de potássio,Iodo elementar",
    unit: "µg",
    maxAdult: "600",
    maxChild: "200",
    maxPregnant: "600",
    maxLactating: "600",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Cobre",
    aliases: "Sulfato de cobre,Gluconato de cobre,Bisglicinato de cobre",
    unit: "mg",
    maxAdult: "5",
    maxChild: "1",
    maxPregnant: "5",
    maxLactating: "5",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Cromo",
    aliases: "Cromo III,Picolinato de cromo,Cloreto de cromo,Nicotinato de cromo",
    unit: "µg",
    maxAdult: "200",
    maxChild: "50",
    maxPregnant: "200",
    maxLactating: "200",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Manganês",
    aliases: "Sulfato de manganês,Gluconato de manganês,Bisglicinato de manganês",
    unit: "mg",
    maxAdult: "9",
    maxChild: "2",
    maxPregnant: "9",
    maxLactating: "9",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Molibdênio",
    aliases: "Molibdato de sódio,Molibdato de amônio",
    unit: "µg",
    maxAdult: "350",
    maxChild: "100",
    maxPregnant: "350",
    maxLactating: "350",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Fósforo",
    aliases: "Fosfato de cálcio,Fosfato monossódico,Fosfato dipotássico",
    unit: "mg",
    maxAdult: "3000",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },
  {
    name: "Flúor",
    aliases: "Fluoreto,Fluoreto de sódio,Monofluorofosfato de sódio",
    unit: "mg",
    maxAdult: "4",
    maxChild: "1.3",
    norm: "IN 28/2018 Anexo III",
    status: "verified",
  },

  // ── Compostos específicos (IN 28/2018 Anexo IV) ───────────────────────────
  {
    name: "Cafeína",
    aliases: "Cafeína anidra,Cafeina,1,3,7-trimetilxantina",
    unit: "mg",
    maxAdult: "400",
    forbiddenChild: true,
    forbiddenPregnant: true,
    forbiddenLactating: true,
    warning: "Contém cafeína. Crianças, gestantes e lactantes devem evitar o consumo. Não recomendado para pessoas sensíveis à cafeína, hipertensos e cardiopatas.",
    norm: "IN 28/2018 Anexo IV; RDC 243/2018 art. 14",
    status: "verified",
  },
  {
    name: "Creatina",
    aliases: "Monohidrato de creatina,Creatina monoidratada,Cloridrato de creatina",
    unit: "g",
    maxAdult: "3",
    forbiddenChild: true,
    warning: "Não recomendado para menores de 19 anos, gestantes e lactantes.",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Colágeno tipo II",
    aliases: "Colágeno UC-II,Colágeno não desnaturado,UC-II,Colágeno nativo tipo II",
    unit: "mg",
    minClaim: "10",
    maxAdult: "40",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Colágeno hidrolisado",
    aliases: "Peptídeos de colágeno,Colágeno tipo I,Colágeno tipo III,Colágeno marino",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Curcumina",
    aliases: "Extrato de cúrcuma,Curcuma longa,Curcuminoides,Turmérico,Açafrão-da-terra",
    unit: "mg",
    minClaim: "6",
    maxAdult: "180",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Ômega-3",
    aliases: "DHA,EPA,Ácido docosahexaenoico,Ácido eicosapentaenoico,Óleo de peixe,Omega 3",
    unit: "mg",
    maxAdult: "3000",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Coenzima Q10",
    aliases: "CoQ10,Ubiquinol,Ubiquinona,Q10",
    unit: "mg",
    maxAdult: "300",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Proteína de soro de leite",
    aliases: "Whey protein,WPC,WPI,Concentrado proteico de soro,Isolado proteico de soro,Whey hidrolisado",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV; RDC 243/2018",
    status: "verified",
  },
  {
    name: "Extrato de guaraná",
    aliases: "Paullinia cupana,Guaraná em pó,Semente de guaraná",
    unit: "mg",
    maxAdult: "1500",
    forbiddenChild: true,
    forbiddenPregnant: true,
    warning: "Contém cafeína. Não recomendado para crianças, gestantes e pessoas sensíveis à cafeína.",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Spirulina",
    aliases: "Arthrospira platensis,Spirulina platensis,Cianobactéria spirulina",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Ácido hialurônico",
    aliases: "Hialuronato de sódio,Hialuronano,HA",
    unit: "mg",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Extrato de açaí",
    aliases: "Euterpe oleracea,Açaí em pó",
    unit: "mg",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Probióticos",
    aliases: "Lactobacillus,Bifidobacterium,Saccharomyces boulardii,UFC",
    unit: "UFC",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Inulina",
    aliases: "FOS,Frutooligossacarídeos,Oligofrutose",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "BCAA",
    aliases: "Aminoácidos de cadeia ramificada,Leucina,Isoleucina,Valina",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Glutamina",
    aliases: "L-Glutamina,Glutamina livre",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Polidextrose",
    aliases: "Polidextrose alimentar",
    unit: "g",
    maxAdult: "",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
  {
    name: "Extrato de chá verde",
    aliases: "Camellia sinensis,EGCG,Epigalocatequina galato,Extrato de chá verde descafeínado",
    unit: "mg",
    maxAdult: "800",
    warning: "Contém cafeína. Não recomendado para crianças e gestantes em doses elevadas.",
    norm: "IN 28/2018 Anexo IV",
    status: "verified",
  },
];

export const SEED_CLAIMS = [
  // ── Vitamina C ─────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para o funcionamento normal do sistema imune",
    constituent: "Vitamina C",
    minDose: "12",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a redução do cansaço e da fadiga",
    constituent: "Vitamina C",
    minDose: "12",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a proteção das células contra o estresse oxidativo",
    constituent: "Vitamina C",
    minDose: "12",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o funcionamento normal do sistema nervoso",
    constituent: "Vitamina C",
    minDose: "12",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Vitamina D ─────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção de ossos normais",
    constituent: "Vitamina D",
    minDose: "2.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a manutenção de dentes normais",
    constituent: "Vitamina D",
    minDose: "2.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o funcionamento normal do sistema imune",
    constituent: "Vitamina D",
    minDose: "2.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a absorção normal de cálcio e fósforo",
    constituent: "Vitamina D",
    minDose: "2.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Vitamina E ─────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a proteção das células contra o estresse oxidativo",
    constituent: "Vitamina E",
    minDose: "1.8",
    unit: "mg α-TE",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Biotina ────────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção de cabelos normais",
    constituent: "Biotina",
    minDose: "7.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a manutenção de unhas normais",
    constituent: "Biotina",
    minDose: "7.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o metabolismo energético normal",
    constituent: "Biotina",
    minDose: "7.5",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Magnésio ───────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção da função muscular normal",
    constituent: "Magnésio",
    minDose: "56.25",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o funcionamento normal do sistema nervoso",
    constituent: "Magnésio",
    minDose: "56.25",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a redução do cansaço e da fadiga",
    constituent: "Magnésio",
    minDose: "56.25",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Cálcio ─────────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção de ossos normais",
    constituent: "Cálcio",
    minDose: "120",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a manutenção de dentes normais",
    constituent: "Cálcio",
    minDose: "120",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Zinco ──────────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para o funcionamento normal do sistema imune",
    constituent: "Zinco",
    minDose: "2.25",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para a manutenção da visão normal",
    constituent: "Zinco",
    minDose: "2.25",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Selênio ────────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção normal do cabelo",
    constituent: "Selênio",
    minDose: "8.25",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o funcionamento normal do sistema imune",
    constituent: "Selênio",
    minDose: "8.25",
    unit: "µg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Colágeno tipo II ───────────────────────────────────────────────────────
  {
    claimText: "Auxilia na manutenção da função articular",
    constituent: "Colágeno tipo II",
    minDose: "10",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Creatina ───────────────────────────────────────────────────────────────
  {
    claimText: "Auxilia no desempenho físico em exercícios de alta intensidade",
    constituent: "Creatina",
    minDose: "3000",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  {
    claimText: "Contribui para o aumento de força e potência muscular",
    constituent: "Creatina",
    minDose: "3000",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Proteína ───────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para o crescimento e manutenção da massa muscular",
    constituent: "Proteína de soro de leite",
    minDose: "10",
    unit: "g",
    norm: "IN 28/2018 Anexo V; RDC 243/2018",
    status: "verified",
  },
  // ── Curcumina ──────────────────────────────────────────────────────────────
  {
    claimText: "Contribui para a manutenção da saúde articular",
    constituent: "Curcumina",
    minDose: "6",
    unit: "mg",
    norm: "IN 28/2018 Anexo V",
    status: "verified",
  },
  // ── Genéricas (RDC 243/2018) ───────────────────────────────────────────────
  {
    claimText: "Este produto não é um medicamento",
    constituent: "",
    norm: "RDC 243/2018 art. 14",
    status: "verified",
  },
  {
    claimText: "Não exceder a recomendação de ingestão diária indicada na embalagem",
    constituent: "",
    norm: "RDC 243/2018 art. 14",
    status: "verified",
  },
];

export const SEED_WARNINGS = [
  // ── Advertências obrigatórias gerais (RDC 243/2018 art. 14) ───────────────
  {
    triggerTerm: "suplemento",
    text: "Este produto não é um medicamento e não deve ser utilizado como substituto de uma alimentação equilibrada.",
    norm: "RDC 243/2018 art. 14 I c",
    status: "verified",
  },
  {
    triggerTerm: "adulto",
    text: "Não exceder a recomendação de ingestão diária indicada na embalagem.",
    norm: "RDC 243/2018 art. 14 I d",
    status: "verified",
  },
  // ── Advertências específicas (IN 28/2018 Anexo VI) ────────────────────────
  {
    triggerTerm: "cafeína",
    text: "Contém cafeína. Crianças, gestantes e lactantes devem evitar o consumo.",
    norm: "IN 28/2018 Anexo VI",
    status: "verified",
  },
  {
    triggerTerm: "cafeina",
    text: "Contém cafeína. Crianças, gestantes e lactantes devem evitar o consumo.",
    norm: "IN 28/2018 Anexo VI",
    status: "verified",
  },
  {
    triggerTerm: "guaraná",
    text: "Contém cafeína. Não recomendado para crianças, gestantes e pessoas sensíveis à cafeína.",
    norm: "IN 28/2018 Anexo VI",
    status: "verified",
  },
  {
    triggerTerm: "ferro",
    text: "Doses elevadas de ferro podem causar envenenamento em crianças. Manter fora do alcance de crianças.",
    norm: "IN 28/2018 Anexo VI",
    status: "verified",
  },
  {
    triggerTerm: "creatina",
    text: "Não recomendado para menores de 19 anos, gestantes e lactantes.",
    norm: "IN 28/2018 Anexo VI; RDC 243/2018",
    status: "verified",
  },
  {
    triggerTerm: "vitamina a",
    text: "Gestantes: não exceder 600 µg RE por dia. Doses elevadas de vitamina A podem ser prejudiciais durante a gravidez.",
    norm: "IN 28/2018 Anexo VI",
    status: "verified",
  },
  {
    triggerTerm: "aspartame",
    text: "Contém aspartame. Fenilcetonúricos: contém fenilalanina.",
    norm: "RDC 727/2022 art. 26",
    status: "verified",
  },
  {
    triggerTerm: "edulcorante",
    text: "Verificar se contém aspartame (fenilcetonúricos: contém fenilalanina).",
    norm: "RDC 727/2022 arts. 25 e 26",
    status: "verified",
  },
  {
    triggerTerm: "transgênico",
    text: "Contém ingrediente geneticamente modificado. Identificar a espécie doadora do gene conforme Decreto 4.680/2003.",
    norm: "Decreto 4680/2003 art. 2",
    status: "verified",
  },
  {
    triggerTerm: "criança",
    text: "Manter fora do alcance de crianças.",
    norm: "RDC 243/2018 art. 14",
    status: "verified",
  },
];

// ---------- Funções de seed ----------

async function tableIsEmpty(table) {
  const row = await dbAll(`SELECT COUNT(*) AS n FROM ${table}`, []);
  return Number(row[0]?.n || 0) === 0;
}

export async function seedRuleset({ force = false } = {}) {
  const ts = now();
  const results = { constituents: 0, claims: 0, warnings: 0, skipped: [] };

  // Constituintes
  const constituentEmpty = await tableIsEmpty("rule_constituents");
  if (constituentEmpty || force) {
    if (force && !constituentEmpty) {
      await dbRun("DELETE FROM rule_constituents", []);
    }
    for (const r of SEED_CONSTITUENTS) {
      const id = crypto.randomUUID();
      await dbRun(
        `INSERT INTO rule_constituents
          (id, name, aliases, unit, min_claim, max_adult, max_child, max_pregnant, max_lactating,
           forbidden_child, forbidden_pregnant, forbidden_lactating, warning, norm, source_url,
           status, verified_by, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          r.name || "",
          r.aliases || "",
          r.unit || "",
          r.minClaim || "",
          r.maxAdult || "",
          r.maxChild || "",
          r.maxPregnant || "",
          r.maxLactating || "",
          r.forbiddenChild ? 1 : 0,
          r.forbiddenPregnant ? 1 : 0,
          r.forbiddenLactating ? 1 : 0,
          r.warning || "",
          r.norm || "",
          r.sourceUrl || "",
          r.status || "verified",
          "seed-anvisa-in28-2018",
          r.note || "",
          ts,
          ts,
        ]
      );
      results.constituents += 1;
    }
  } else {
    results.skipped.push("constituents");
  }

  // Claims
  const claimsEmpty = await tableIsEmpty("rule_claims");
  if (claimsEmpty || force) {
    if (force && !claimsEmpty) {
      await dbRun("DELETE FROM rule_claims", []);
    }
    for (const r of SEED_CLAIMS) {
      const id = crypto.randomUUID();
      await dbRun(
        `INSERT INTO rule_claims
          (id, claim_text, constituent, min_dose, unit, condition, category, norm, source_url,
           status, verified_by, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          r.claimText || "",
          r.constituent || "",
          r.minDose || "",
          r.unit || "",
          r.condition || "",
          r.category || "",
          r.norm || "",
          r.sourceUrl || "",
          r.status || "verified",
          "seed-anvisa-in28-2018",
          r.note || "",
          ts,
          ts,
        ]
      );
      results.claims += 1;
    }
  } else {
    results.skipped.push("claims");
  }

  // Warnings
  const warningsEmpty = await tableIsEmpty("rule_warnings");
  if (warningsEmpty || force) {
    if (force && !warningsEmpty) {
      await dbRun("DELETE FROM rule_warnings", []);
    }
    for (const r of SEED_WARNINGS) {
      const id = crypto.randomUUID();
      await dbRun(
        `INSERT INTO rule_warnings
          (id, trigger_term, text, norm, source_url, status, verified_by, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          r.triggerTerm || "",
          r.text || "",
          r.norm || "",
          r.sourceUrl || "",
          r.status || "verified",
          "seed-anvisa-in28-2018",
          r.note || "",
          ts,
          ts,
        ]
      );
      results.warnings += 1;
    }
  } else {
    results.skipped.push("warnings");
  }

  return results;
}
