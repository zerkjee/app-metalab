# Estado do projeto — Agente METALAB de rotulagem ANVISA

_Última atualização: 2026-06-16._

## O que é
SaaS de **pré-auditoria de rotulagem de suplementos alimentares** com IA, no padrão das folhas SRS BH / NUVISA da ANVISA. Um agente Claude lê o rótulo, **pesquisa as normas da ANVISA ao vivo** e devolve um laudo (ingrediente por ingrediente, alegações, regularização, advertências, checklist NUVISA), com fonte e data.

Estratégia: globalmente o conceito já existe (Truli, Reglyr, Sieve, ClearanceLab — FDA/EFSA). **No Brasil/ANVISA não há player de IA — só consultorias manuais.** Whitespace real → ser o primeiro. Decisão atual: **validar antes de escalar** (landing + lista de espera + análise gratuita como isca).

## Stack
Next.js 16 (App Router, Turbopack) · React · Node runtime · better-sqlite3 (local) / pg+Neon (prod) · @anthropic-ai/sdk (Claude Opus 4.8 + web_search/web_fetch) · tesseract.js (OCR no navegador) · marked.
Atenção: este Next tem mudanças de breaking — o middleware é `proxy.js` exportando `proxy` (ver `AGENTS.md`).

## Arquitetura
- `app/page.jsx` — **landing pública** em `/` (marketing + formulário de lista de espera).
- `app/app/page.jsx` — **a ferramenta** em `/app` (protegida por login): entrada do rótulo, OCR, streaming do laudo em markdown, download .md, histórico, selo de origem (ao vivo/cache/simulação), checkbox "reanalisar do zero".
- `app/login/page.jsx` + `app/api/login|logout` — login por senha (cookie `metalab_access`).
- `proxy.js` — público: `/`, `/login`, `/api/login`, `/api/logout`, `/api/waitlist`; resto exige cookie.
- `app/api/analyze/route.js` — **núcleo**: checa cache no banco → se não houver, gera (ao vivo com chave, ou simulação sem chave) em streaming → salva. Header `X-Report-Source: cache|agent|mock`.
- `app/api/history/route.js` — GET lista análises; `?id=` abre uma (só logado).
- `app/api/waitlist/route.js` — POST público grava lead; GET (logado) lista.
- `app/api/extract-label/route.js` — OCR/extração de PDF no servidor.
- `lib/anthropic-agent.js` — system prompt montado do kit; tools `web_search_20260209` + `web_fetch_20260209` **travadas em domínios gov.br/anvisa**; `streamReport` (ao vivo, com continuação em pause_turn) e `streamMock` (simulação). `PROMPT_VERSION` invalida cache.
- `lib/db.js` — **camada única async, 2 backends**: SQLite se não houver `DATABASE_URL`, Postgres se houver. Tabelas `analyses` e `waitlist` criadas on-demand. `computeHash` reaproveita rótulos idênticos.
- `lib/knowledge.js` — carrega o kit (`outputs/kit_agente_rotulagem_suplementos/`: prompt mestre v2, protocolo de pesquisa, matriz NUVISA, matriz IN281, modelo de relatório).

## O que está PRONTO e TESTADO
- Agente com pesquisa ANVISA ao vivo (estrutura) + modo simulação sem chave.
- Banco dual: **SQLite e Postgres validados ao vivo** (waitlist grava/lista, analyze mock→cache sem duplicar, history). Postgres testado em container Docker.
- Landing pública + captura de leads. Login/proxy. Cache de relatórios. Download .md. Histórico.
- `npm run build` verde.

## O que FALTA / próximos passos
1. **Análise REAL ainda não rodada** — falta `ANTHROPIC_API_KEY`. Sem ela é só simulação.
2. **Deploy** Vercel + Neon (ver `GUIA_DEPLOY.md`). Env: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `ACCESS_PASSWORD`, `ACCESS_TOKEN`.
3. **Tela `/app/leads`** para ver os cadastros sem mexer em API.
4. Export do laudo em PDF; melhorar OCR; multi-empresa (contas/orgs) quando validar.

## Como rodar local
```bash
cd "estou-precisando-criar-um-agente-de"
npm install
npm run dev            # / = landing ; /app = ferramenta (senha do .env.local: metalab-teste)
```
Banco vazio em `DATABASE_URL` → SQLite automático em `./data/agent.db`.
Para testar Postgres local: `docker run -d --name metalab-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=metalab -p 5433:5432 postgres:17` e `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/metalab npm run dev`.

## Variáveis de ambiente
`ANTHROPIC_API_KEY` (análise real) · `DATABASE_URL` (vazio=SQLite; preenchido=Postgres) · `ACCESS_PASSWORD` · `ACCESS_TOKEN`.

---

## PROMPT PRONTO PARA COLAR NO TERMINAL
Abra o terminal na pasta do projeto, rode `claude` e cole:

> Você vai continuar o desenvolvimento de um app que já existe. Antes de qualquer coisa, leia `ESTADO_DO_PROJETO.md`, `AGENTS.md` e `GUIA_DEPLOY.md` na raiz, e os arquivos em `lib/` e `app/`. Em seguida, me diga em português: (1) um resumo do que o app faz e da arquitetura atual; (2) o que está pronto e testado vs. o que falta; (3) rode `npm run build` e confirme se está verde; (4) liste os próximos passos recomendados em ordem de prioridade. NÃO altere nada ainda — primeiro me dê o diagnóstico do estado atual. Importante: este Next tem breaking changes (o middleware é `proxy.js`), o banco é dual (SQLite local / Postgres via `DATABASE_URL`), e a análise real exige `ANTHROPIC_API_KEY` (sem ela roda em modo simulação).
