import crypto from "node:crypto";
import { dbAll, dbGet, dbRun } from "./db.js";

// Banco de regras: a IA insere como 'draft'; o RT chama verify* para marcar 'verified'.
// O motor deterministico consome loadRuleset().

function now() {
  return new Date().toISOString();
}

// ---------- Constituintes (limites por populacao) ----------
export async function addConstituent(rule) {
  const id = crypto.randomUUID();
  const ts = now();
  await dbRun(
    `INSERT INTO rule_constituents
      (id, name, aliases, unit, min_claim, max_adult, max_child, max_pregnant, max_lactating,
       forbidden_child, forbidden_pregnant, forbidden_lactating, warning, norm, source_url,
       status, verified_by, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rule.name || "",
      rule.aliases || "",
      rule.unit || "",
      rule.minClaim || "",
      rule.maxAdult || "",
      rule.maxChild || "",
      rule.maxPregnant || "",
      rule.maxLactating || "",
      rule.forbiddenChild ? 1 : 0,
      rule.forbiddenPregnant ? 1 : 0,
      rule.forbiddenLactating ? 1 : 0,
      rule.warning || "",
      rule.norm || "",
      rule.sourceUrl || "",
      rule.status || "draft",
      rule.verifiedBy || "",
      rule.note || "",
      ts,
      ts,
    ]
  );
  return { id };
}

export async function listConstituents(status) {
  return status
    ? dbAll("SELECT * FROM rule_constituents WHERE status = ? ORDER BY name", [status])
    : dbAll("SELECT * FROM rule_constituents ORDER BY name");
}

export async function verifyConstituent(id, verifiedBy = "RT") {
  await dbRun(
    "UPDATE rule_constituents SET status = 'verified', verified_by = ?, updated_at = ? WHERE id = ?",
    [verifiedBy, now(), id]
  );
}

// ---------- Alegacoes autorizadas ----------
export async function addClaim(rule) {
  const id = crypto.randomUUID();
  const ts = now();
  await dbRun(
    `INSERT INTO rule_claims
      (id, claim_text, constituent, min_dose, unit, condition, category, norm, source_url,
       status, verified_by, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rule.claimText || "",
      rule.constituent || "",
      rule.minDose || "",
      rule.unit || "",
      rule.condition || "",
      rule.category || "",
      rule.norm || "",
      rule.sourceUrl || "",
      rule.status || "draft",
      rule.verifiedBy || "",
      rule.note || "",
      ts,
      ts,
    ]
  );
  return { id };
}

export async function listClaims(status) {
  return status
    ? dbAll("SELECT * FROM rule_claims WHERE status = ? ORDER BY claim_text", [status])
    : dbAll("SELECT * FROM rule_claims ORDER BY claim_text");
}

export async function verifyClaim(id, verifiedBy = "RT") {
  await dbRun(
    "UPDATE rule_claims SET status = 'verified', verified_by = ?, updated_at = ? WHERE id = ?",
    [verifiedBy, now(), id]
  );
}

// ---------- Advertencias obrigatorias ----------
export async function addWarning(rule) {
  const id = crypto.randomUUID();
  const ts = now();
  await dbRun(
    `INSERT INTO rule_warnings
      (id, trigger_term, text, norm, source_url, status, verified_by, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rule.triggerTerm || "",
      rule.text || "",
      rule.norm || "",
      rule.sourceUrl || "",
      rule.status || "draft",
      rule.verifiedBy || "",
      rule.note || "",
      ts,
      ts,
    ]
  );
  return { id };
}

export async function listWarnings(status) {
  return status
    ? dbAll("SELECT * FROM rule_warnings WHERE status = ? ORDER BY trigger_term", [status])
    : dbAll("SELECT * FROM rule_warnings ORDER BY trigger_term");
}

export async function verifyWarning(id, verifiedBy = "RT") {
  await dbRun(
    "UPDATE rule_warnings SET status = 'verified', verified_by = ?, updated_at = ? WHERE id = ?",
    [verifiedBy, now(), id]
  );
}

// Carrega o conjunto de regras para o motor deterministico.
export async function loadRuleset() {
  const [constituents, claims, warnings] = await Promise.all([
    listConstituents(),
    listClaims(),
    listWarnings(),
  ]);
  return { constituents, claims, warnings };
}
