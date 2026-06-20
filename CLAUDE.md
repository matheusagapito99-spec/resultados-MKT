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
npm run dev      # desenvolvimento (localhost:3000)
npm run build    # build de produção (rode antes de commitar mudanças grandes)
npm run lint     # eslint
```

## Convenções
- Design System: tokens em `src/app/globals.css`. Use utilitários semânticos
  (`bg-surface`, `text-fg`, `text-muted`, `border-border`, `bg-brand`, `*-soft`) — **não** hardcode hex.
- Números em tabelas/KPIs: classe `tnum` + `font-mono` (tabular-nums).
- Componentes: `brand/`, `shell/`, `ui/`, `patterns/`, `charts/`, `theme/`. Domínios futuros em `features/`.
- Segredos só em env (server-side). `MOSKIT_API_KEY` nunca vai ao cliente. Veja `.env.example`.

## Estado atual
Fase 0 (shell premium + Overview com dados mock em `src/lib/mock-data.ts`).
Próximo: Fase 1 — ingestão Moskit→Postgres (Drizzle), webhooks, tela de Sincronização.
