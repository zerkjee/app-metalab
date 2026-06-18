# Guia de deploy — Agente METALAB de rotulagem

## Variáveis de ambiente

| Variável | Para quê | Local | Produção |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | IA + pesquisa ANVISA ao vivo | obrigatória p/ análise real (sem ela, modo simulação) | obrigatória |
| `DATABASE_URL` | Banco (leads + análises) | **vazia → usa SQLite** automático | **Postgres/Neon** (persiste de verdade) |
| `SESSION_SECRET` | Assina o cookie de sessão | qualquer string (dev) | **string longa e aleatória** |
| `OWNER_EMAIL` | E-mail do dono/admin (criado no 1º login) | seu e-mail | seu e-mail |
| `OWNER_PASSWORD` | Senha inicial do dono/admin | defina | **defina uma forte** |

O app escolhe o banco sozinho: **se `DATABASE_URL` existe, usa Postgres; senão, SQLite local.** As tabelas (`analyses`, `waitlist`, `users`, `rule_*`) são criadas automaticamente na primeira consulta — sem migration manual.

Acesso é por **contas individuais** (e-mail+senha). O dono é criado automaticamente no primeiro login com `OWNER_EMAIL`/`OWNER_PASSWORD`; depois ele cadastra os demais usuários no painel `/app/admin` (link "Administração" aparece só para admin).

## Rodar localmente (zero config de banco)
```bash
cd "estou-precisando-criar-um-agente-de"
npm install
npm run dev
```
- `/` = landing pública (lista de espera).
- `/app` = ferramenta (login com `ACCESS_PASSWORD`).
- Banco local em `./data/agent.db` (ignorado no git).

## Publicar no Vercel (com banco persistente)

1. **Provisionar o Postgres (Neon) pelo Vercel** — é o passo que torna tudo confiável:
   - No projeto da Vercel → aba **Storage** → **Create Database** → **Neon (Postgres)**.
   - A Vercel injeta a `DATABASE_URL` (e variantes) automaticamente no projeto. Não precisa copiar à mão.
2. **Definir as outras variáveis** em Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` = sua chave da Anthropic.
   - `ACCESS_PASSWORD` = senha forte do painel.
   - `ACCESS_TOKEN` = um valor secreto qualquer (string longa).
3. **Deploy** (push na branch conectada ou `vercel --prod`).
4. Na primeira requisição, as tabelas são criadas no Neon. Pronto — leads e análises ficam salvos de verdade.

> SSL do Neon já é tratado no código. Conexões usam pool (máx. 5).

## Onde ver os leads da lista de espera
- Faça login em `/login` e acesse `GET /api/waitlist` (retorna JSON dos cadastros). Só funciona logado.
- (Próxima evolução sugerida: uma telinha `/app/leads` que lista isso bonitinho.)

## Notas
- Dados **não migram** automaticamente do SQLite local para o Neon — produção começa limpa (é o esperado).
- A análise real custa por uso (API Anthropic + web search). O **cache do banco** reaproveita rótulos idênticos sem novo custo.
- O app é apoio à decisão; a liberação final do rótulo é do Responsável Técnico.
