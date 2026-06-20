# CLAUDE.md — resultados-MKT (Mira)

Plataforma de análise de resultados comerciais dos leads de Marketing, integrada ao **Moskit CRM**.
Leia `docs/ARCHITECTURE.md` para o desenho completo (produto, design system, dados, segurança, roadmap).

## ⚠️ Versões (importante)
- **Next.js 16** + **React 19** + **Tailwind v4**. Esta versão do Next tem breaking changes vs. o Next 15.
  Antes de escrever código de framework, confira `node_modules/next/dist/docs/` (e veja `AGENTS.md`).
- `params` e `searchParams` em páginas são **Promises** — use `await`.
- Dark mode é por **classe `.dark`** no `<html>` (variante custom em `globals.css`), não pelo OS.

## Comandos
```bash
npm run dev               # desenvolvimento (localhost:3000)
npm run build             # build de produção (rode antes de commitar mudanças grandes)
npm run lint              # eslint
npm run moskit:introspect # descobre a estrutura real do Moskit (precisa MOSKIT_API_KEY no .env.local)
npm run db:generate       # gera migrations SQL a partir de src/lib/db/schema.ts
npm run db:migrate        # aplica migrations (precisa DATABASE_URL)
npm run db:studio         # UI do Drizzle
```

## Convenções
- Design System: tokens em `src/app/globals.css`. Use utilitários semânticos
  (`bg-surface`, `text-fg`, `text-muted`, `border-border`, `bg-brand`, `*-soft`) — **não** hardcode hex.
- Números em tabelas/KPIs: classe `tnum` + `font-mono` (tabular-nums).
- Componentes: `brand/`, `shell/`, `ui/`, `patterns/`, `charts/`, `theme/`. Domínios futuros em `features/`.
- Segredos só em env (server-side). `MOSKIT_API_KEY` nunca vai ao cliente. Veja `.env.example`.

## Modelo de dados / atribuição
Ver `docs/ATRIBUICAO.md`. A **imobiliária** é a entidade central; **duas origens distintas e
imutáveis na entrada** (Marketing/UTM e Inbound), com histórico append-only em `lead_origin_history`.
Schema em `src/lib/db/schema.ts` (13 tabelas). Mapa Moskit→schema em `src/lib/moskit/field-map.ts`
(preencher após a descoberta).

## Estado atual
Fase 0 (shell premium + Overview mock) **commitada**. Fase 1 em andamento: schema Drizzle +
MoskitClient + script de descoberta prontos (build/migrations validados, **sem banco aplicado ainda**).
Pendências para avançar: rodar `moskit:introspect` (precisa `MOSKIT_API_KEY` no `.env.local`),
provisionar Postgres (Neon → `DATABASE_URL`), confirmar fontes de contratos/garantias/custo de mídia.
Depois: ajustar field-map/schema → sync incremental + webhooks + tela de Sincronização.
