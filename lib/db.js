import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Backend único: Postgres (Neon) quando DATABASE_URL existe (producao/Vercel),
// senao SQLite local (zero config). Mesma API para os dois.
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const USE_PG = Boolean(PG_URL);
const DB_PATH = process.env.AGENT_DB_PATH || path.join(process.cwd(), "data", "agent.db");

let sqlite = null;
let pgPool = null;
let initPromise = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    hash TEXT NOT NULL,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    version TEXT,
    model TEXT,
    prompt_version TEXT,
    source TEXT NOT NULL,
    report_md TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analyses_hash ON analyses(hash)`,
  `CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at)`,
  `CREATE TABLE IF NOT EXISTS waitlist (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL,
    company TEXT,
    role TEXT,
    note TEXT,
    source TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at)`,

  // Banco de REGRAS (a IA popula como 'draft'; o RT marca 'verified'). O motor
  // deterministico confere o rotulo contra estas tabelas, sem IA.
  `CREATE TABLE IF NOT EXISTS rule_constituents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases TEXT,
    unit TEXT,
    min_claim TEXT,
    max_adult TEXT,
    max_child TEXT,
    max_pregnant TEXT,
    max_lactating TEXT,
    forbidden_child INTEGER DEFAULT 0,
    forbidden_pregnant INTEGER DEFAULT 0,
    forbidden_lactating INTEGER DEFAULT 0,
    warning TEXT,
    norm TEXT,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    verified_by TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rc_name ON rule_constituents(name)`,
  `CREATE TABLE IF NOT EXISTS rule_claims (
    id TEXT PRIMARY KEY,
    claim_text TEXT NOT NULL,
    constituent TEXT,
    min_dose TEXT,
    unit TEXT,
    condition TEXT,
    category TEXT,
    norm TEXT,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    verified_by TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rule_warnings (
    id TEXT PRIMARY KEY,
    trigger_term TEXT NOT NULL,
    text TEXT NOT NULL,
    norm TEXT,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    verified_by TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // Checklist NUVISA: cada item das folhas com a legislacao e a regra de bloqueio.
  `CREATE TABLE IF NOT EXISTS rule_checklist (
    id TEXT PRIMARY KEY,
    ord INTEGER DEFAULT 0,
    origem_folha TEXT,
    ensaio TEXT NOT NULL,
    item TEXT NOT NULL,
    legislacao TEXT,
    regra_bloqueio TEXT,
    status TEXT NOT NULL DEFAULT 'verified',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_checklist_ord ON rule_checklist(ord)`,

  // Usuarios do produto comercial (acesso fechado). is_admin=1 => dono/painel.
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    plan TEXT DEFAULT 'free',
    ai_credits INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
];

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (USE_PG) {
      const mod = await import("pg");
      const { Pool } = mod.default ?? mod;
      const isLocal = /localhost|127\.0\.0\.1/.test(PG_URL);
      pgPool = new Pool({
        connectionString: PG_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 5,
      });
      for (const stmt of SCHEMA) await pgPool.query(stmt);
    } else {
      const { default: Database } = await import("better-sqlite3");
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      sqlite = new Database(DB_PATH);
      sqlite.pragma("journal_mode = WAL");
      sqlite.exec(SCHEMA.join(";\n"));
    }
    await migrate();
  })();
  return initPromise;
}

// Migracao idempotente: adiciona colunas novas em bancos ja criados (ex.: Neon em producao).
async function migrate() {
  const addColumns = [
    ["users", "plan", "TEXT DEFAULT 'free'"],
    ["users", "ai_credits", "INTEGER DEFAULT 0"],
    ["analyses", "user_id", "TEXT"],
  ];
  if (USE_PG) {
    for (const [t, c, def] of addColumns) {
      await pgPool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ${c} ${def}`);
    }
  } else {
    for (const [t, c, def] of addColumns) {
      const cols = sqlite.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name);
      if (!cols.includes(c)) sqlite.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`);
    }
  }
}

// Converte placeholders posicionais "?" (sintaxe SQLite) para "$1, $2..." (Postgres).
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${(i += 1)}`);
}

async function all(sql, params = []) {
  await init();
  if (USE_PG) {
    const result = await pgPool.query(toPgSql(sql), params);
    return result.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  await init();
  if (USE_PG) {
    await pgPool.query(toPgSql(sql), params);
    return;
  }
  sqlite.prepare(sql).run(...params);
}

// Expostos para lib/rules.js (mesma conexao/backend, placeholders "?").
export { all as dbAll, get as dbGet, run as dbRun };

function normalizeLabel(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Hash de conteudo: rotulos identicos (mesmo produto/versao/modelo/prompt)
// reaproveitam o relatorio ja verificado.
export function computeHash({ productName, brand, category, version, labelText, model, promptVersion }) {
  const payload = JSON.stringify({
    productName: String(productName || "").trim().toLowerCase(),
    brand: String(brand || "").trim().toLowerCase(),
    category: String(category || "").trim().toLowerCase(),
    version: String(version || "").trim().toLowerCase(),
    label: normalizeLabel(labelText),
    model: model || "",
    promptVersion: promptVersion || "",
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// requireLive: quando a requisicao e "ao vivo", nao reaproveita relatorio de simulacao.
export async function getCached(hash, { requireLive = false } = {}) {
  const sql = requireLive
    ? "SELECT * FROM analyses WHERE hash = ? AND source = 'agent' ORDER BY created_at DESC LIMIT 1"
    : "SELECT * FROM analyses WHERE hash = ? ORDER BY created_at DESC LIMIT 1";
  return get(sql, [hash]);
}

export async function saveAnalysis(record) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO analyses
      (id, user_id, hash, product_name, brand, category, version, model, prompt_version, source, report_md, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      record.userId || null,
      record.hash,
      record.productName || "",
      record.brand || "",
      record.category || "",
      record.version || "",
      record.model || "",
      record.promptVersion || "",
      record.source || "agent",
      record.reportMd || "",
      createdAt,
    ]
  );
  return { id, createdAt };
}

export async function listAnalyses(limit = 50) {
  return all(
    `SELECT id, product_name, brand, version, source, created_at, length(report_md) AS size
     FROM analyses ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getAnalysis(id) {
  return get("SELECT * FROM analyses WHERE id = ?", [id]);
}

export async function addWaitlist(entry) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO waitlist (id, name, email, company, role, note, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      (entry.name || "").slice(0, 200),
      (entry.email || "").slice(0, 200),
      (entry.company || "").slice(0, 200),
      (entry.role || "").slice(0, 120),
      (entry.note || "").slice(0, 2000),
      (entry.source || "landing").slice(0, 80),
      createdAt,
    ]
  );
  return { id, createdAt };
}

export async function listWaitlist(limit = 500) {
  return all("SELECT * FROM waitlist ORDER BY created_at DESC LIMIT ?", [limit]);
}

// ---------- Usuarios ----------
export async function createUser({ email, name, passwordHash, isAdmin = 0 }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO users (id, email, name, password_hash, is_admin, active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, String(email).toLowerCase().trim(), name || "", passwordHash, isAdmin ? 1 : 0, createdAt]
  );
  return { id, createdAt };
}

export async function getUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [String(email).toLowerCase().trim()]);
}

export async function getUserById(id) {
  return get("SELECT * FROM users WHERE id = ?", [id]);
}

export async function listUsers(limit = 500) {
  return all(
    "SELECT id, email, name, is_admin, active, plan, ai_credits, created_at FROM users ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
}

export async function countUsers() {
  const row = await get("SELECT COUNT(*) AS n FROM users");
  return Number(row?.n || 0);
}

export async function setUserActive(id, active) {
  await run("UPDATE users SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

export async function setUserPlan(id, plan, aiCredits) {
  if (aiCredits === undefined || aiCredits === null || aiCredits === "") {
    await run("UPDATE users SET plan = ? WHERE id = ?", [plan, id]);
  } else {
    await run("UPDATE users SET plan = ?, ai_credits = ? WHERE id = ?", [plan, Number(aiCredits), id]);
  }
}

function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function countAnalysesThisMonth(userId) {
  const row = await get("SELECT COUNT(*) AS n FROM analyses WHERE user_id = ? AND created_at >= ?", [userId, monthStartISO()]);
  return Number(row?.n || 0);
}

export async function countAiThisMonth(userId) {
  const row = await get(
    "SELECT COUNT(*) AS n FROM analyses WHERE user_id = ? AND source = 'agent' AND created_at >= ?",
    [userId, monthStartISO()]
  );
  return Number(row?.n || 0);
}

export async function decrementCredit(userId) {
  await run("UPDATE users SET ai_credits = ai_credits - 1 WHERE id = ? AND ai_credits > 0", [userId]);
}

// ---------- Checklist NUVISA ----------
export async function addChecklistItem(row) {
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await run(
    `INSERT INTO rule_checklist (id, ord, origem_folha, ensaio, item, legislacao, regra_bloqueio, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      Number(row.ord || 0),
      row.origemFolha || "",
      row.ensaio || "",
      row.item || "",
      row.legislacao || "",
      row.regraBloqueio || "",
      row.status || "verified",
      ts,
      ts,
    ]
  );
  return { id };
}

export async function listChecklist() {
  return all("SELECT * FROM rule_checklist ORDER BY ord");
}

export async function countChecklist() {
  const row = await get("SELECT COUNT(*) AS n FROM rule_checklist");
  return Number(row?.n || 0);
}

export async function clearChecklist() {
  await run("DELETE FROM rule_checklist", []);
}
