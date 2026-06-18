import fs from "node:fs";

// DB temporario isolado; sem DATABASE_URL => backend SQLite.
const TMP = "/tmp/metalab_rules_test.db";
process.env.AGENT_DB_PATH = TMP;
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
for (const f of [TMP, `${TMP}-wal`, `${TMP}-shm`]) fs.rmSync(f, { force: true });

const rules = await import("../lib/rules.js");

const checks = [];
const expect = (name, cond) => checks.push([name, Boolean(cond)]);

const c = await rules.addConstituent({ name: "Cafeina", unit: "mg", maxAdult: "300", forbiddenChild: true, status: "draft", norm: "RDC 243/2018" });
let list = await rules.listConstituents();
expect("inseriu 1 constituinte", list.length === 1);
expect("nasce como draft", list[0].status === "draft");
expect("flag forbidden_child gravada", Number(list[0].forbidden_child) === 1);

await rules.verifyConstituent(c.id, "RT Teste");
list = await rules.listConstituents("verified");
expect("verificado vira 'verified'", list.length === 1 && list[0].verified_by === "RT Teste");

await rules.addClaim({ claimText: "auxilia na função articular", constituent: "colágeno tipo II", minDose: "40", unit: "mg" });
await rules.addWarning({ triggerTerm: "cafeina", text: "Contém cafeína." });

const rs = await rules.loadRuleset();
expect("loadRuleset traz constituinte", rs.constituents.length === 1);
expect("loadRuleset traz alegação", rs.claims.length === 1);
expect("loadRuleset traz advertência", rs.warnings.length === 1);

let ok = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FALHOU"}  ${name}`);
  if (pass) ok += 1;
}
for (const f of [TMP, `${TMP}-wal`, `${TMP}-shm`]) fs.rmSync(f, { force: true });
console.log(`\n${ok}/${checks.length} asserções passaram`);
process.exit(ok === checks.length ? 0 : 1);
