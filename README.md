# Site — Gestão Educacional (KIDEV Tec)

Frontend web do sistema de gestão educacional.

## Stack

- **React 19 + TypeScript 5.8** — Vite 6
- **`@erp/tokens`** (`packages/tokens`) — design tokens CSS compartilhados
- **Testes**: Vitest — unit. CI exige build + testes verdes.

## Rodar

```bash
npm install
npm run dev        # apps/web
npm run build      # build de produção
npm test
```

## Estrutura

```
apps/web/            # aplicação React (views, components, hooks, api-client)
packages/tokens/     # design tokens CSS
```

## CI

`.github/workflows/gates.yml` — build (tsc + vite) → testes.

## Fluxo de branches

`feat/**` → PR → `staging` → PR → `main`

## Ecossistema

| Repo | Papel |
|------|-------|
| `api-GestaoEducacional` | API (Fastify 5 + Postgres, monorepo core/education/infra) |
| `site-GestaoEducacional` | Este frontend web |
| `app-GestaoEducacional` | Desktop (Electron, empacota este web via build:web) |
