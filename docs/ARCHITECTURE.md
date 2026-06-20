# Mira — Documento de Produto, Design & Arquitetura (v1.0)

Plataforma de análise de resultados comerciais dos leads de Marketing, com base de dados no
**Moskit CRM**. Objetivo: parecer e operar como produto enterprise (Linear/Stripe/Vercel).

---

## 1. Visão geral
Cockpit comercial vivo que transforma dados do Moskit em **inteligência de receita**: do primeiro
toque do lead ao negócio ganho/perdido. Mantém um **data warehouse próprio** (Postgres) alimentado
pelo Moskit via sync + webhooks, destravando histórico, snapshots de funil e métricas que a API ao
vivo não entrega — com performance instantânea.

## 2. Objetivos de negócio
| # | Objetivo | KPI |
|---|---|---|
| O1 | Provar ROI do Marketing | receita ganha por origem/campanha |
| O2 | Acelerar o ciclo comercial | redução do sales cycle e tempo em etapas |
| O3 | Aumentar conversão do funil | conversão por etapa |
| O4 | Garantir SLA de atendimento | % leads com 1º contato no SLA |
| O5 | Visibilidade por vendedor | win rate, valor fechado |
| O6 | Forecast | pipeline ponderado vs. meta |

## 3. Personas
- **Head de Marketing** — ROI por canal, tendência executiva.
- **Analista/Ops** — gargalos, coortes, qualidade por origem (uso diário, filtros profundos).
- **Gestor Comercial** — performance de vendedores, aging, SLA.
- **Diretoria** — Overview escaneável em 10s.

## 4. Funcionalidades (MVP)
Overview executivo · Funil de conversão · ROI por origem/campanha · Performance de vendedores ·
Velocidade & SLA · Explorador de Leads/Negócios + drawer · Motor de sincronização.
Transversais: filtros globais na URL, comparação de período, export CSV/PNG, command palette (⌘K),
dark/light.

## 5. Arquitetura da informação
```
/ Overview · /funil · /origens · /vendedores[/:id] · /velocidade · /leads[/:id] · /ajustes
```
Filtro global no topo, propagado via URL (`?period=&pipeline=&source=`) → links compartilháveis.

## 6. Jornadas (resumo)
Cada número "suspeito" no Overview é clicável e leva ao nível seguinte de detalhe **carregando o
contexto na URL** (sem reconfigurar filtros). Ex.: queda de conversão → Funil → etapa-gargalo →
origem → lista de negócios parados → export.

## 7–9. Design System
- **Cores**: neutros frios (slate) + acento **iris/índigo** (`--brand` #6366F1); semânticos
  success/warning/danger/info; paleta de dados categórica de 8 cores (daltônico-segura).
  Tudo via CSS variables que flipam entre light/dark. Ver `src/app/globals.css`.
- **Tipografia**: Geist Sans (UI) + Geist Mono (números, com `tabular-nums`).
- **Espaçamento**: base 4px. **Grid**: 12 col, container `max-w-[1400px]`, gutter 24.
- **Raio**: cards `xl`(16) / `lg`(12); inputs/botões `lg`. **Sombra**: sutil (sm/md/lg).
- **Componentes**: Button, Input/Select, Table, Card, KPI Card, Modal, Drawer, Dropdown, Tabs,
  Tooltip, Toast, Command Palette. Estados obrigatórios: Empty, Loading (skeleton), Error, Stale.
- **Ícones**: lucide-react (stroke 1.5). **Motion**: 120/200/320ms, `cubic-bezier(.2,.8,.2,1)`,
  respeita `prefers-reduced-motion`. **Dark/Light**: classe `.dark`, persistida + anti-flash.

## 10. Frontend
Next.js 16 (App Router/RSC) · React 19 · TS strict · Tailwind v4 · shadcn/ui (a adotar) ·
Recharts/Tremor (F2) · Framer Motion · TanStack Query · `nuqs` (filtros na URL) · Zod.
Estado: servidor = dados (RSC + Query); URL = filtros; Zustand = só UI efêmera.
```
src/app/(dashboard)/...   shell + telas
src/app/api/...           webhooks, sync, metrics
src/components/{brand,shell,ui,patterns,charts,theme}
src/features/<domínio>/   queries + metrics + components
src/lib/{moskit,db,metrics,utils}
src/config/
```

## 11. Backend
**Monólito modular serverless** (Next Route Handlers no Vercel). Módulos:
- **MoskitClient** — API V2 (`https://api.moskitcrm.com/v2/`, header `apikey`), paginação, retry
  com backoff, tipagem Zod.
- **Sync** — incremental por cursor (cron 15min) + reconciliação diária; grava `sync_runs`.
- **Webhooks** — `/api/webhooks/moskit` idempotente (valida segredo, grava evento bruto, upsert,
  registra transições em `deal_stage_history`).
- **Analytics** — queries agregadas por filtro, cacheadas.
- **Snapshotter** — cron diário grava `funnel_snapshots`.
Fila (se volume): Upstash QStash. Cache: Upstash Redis. Logs: pino estruturado → Vercel Log Drains.

## 12. Banco de dados (Postgres/Neon + Drizzle)
Tabelas núcleo: `users`, `pipelines`, `stages(is_won,is_lost)`, `companies`, `contacts(source,
campaign,utm_*)`, `deals(value_cents,status,owner,contact,source,campaign,created/won/lost_at,
custom JSONB)`, `deal_stage_history(entered/exited_at,duration)`, `activities(type,done,done_at)`,
`funnel_snapshots`, `sync_runs`, `webhook_events`.
Tudo `moskit_id UNIQUE` → upsert idempotente (`ON CONFLICT`). Índices: status, owner, stage,
source, campaign, created_at/won_at, composto (status,won_at) e (pipeline_id,stage_id).
`deal_stage_history` é a chave para velocidade e funil-no-tempo.

## 13. Infraestrutura
Vercel (Preview por PR + Production na main) + Neon + Upstash. CI: GitHub Actions
(lint+typecheck+test+`drizzle migrate`) como gate. Observabilidade: Vercel Analytics + Sentry +
logs. Alertas: sync falho 2× ou `last_sync > 1h`. DR: Neon PITR + Moskit como fonte da verdade
(full-resync reconstrói). RPO ~15min.

## 14. Segurança
**Decisão atual: dashboard sem login de aplicação.** Baseline obrigatória:
- **Vercel Deployment Protection** (senha/Vercel Auth) — há PII de leads + receita (LGPD).
- Segredos só em env; nada de chave Moskit no cliente.
- `/api/sync` exige `CRON_SECRET`; webhook valida assinatura/segredo; rate-limit; headers de
  segurança (já em `next.config.ts`); validação Zod; queries parametrizadas; idempotência anti-replay.
- LGPD: tratar e-mail/telefone/nome como PII; mascarar por padrão; não logar PII; retenção/expurgo.
- Evolução: Auth.js + Google Workspace + RBAC (`admin/gestor/vendedor`) + RLS. Tabela `users` já existe.

## 15. Performance
RSC entrega agregações prontas (sem waterfalls) + streaming/Suspense. Cache em camadas:
materialized views → Redis → Next Data Cache → CDN. Agregação no banco (window functions),
`funnel_snapshots` evita recomputo. Lazy: charts `next/dynamic`, tabela virtualizada, code-split,
prefetch no hover. Metas: LCP <1,8s, INP <200ms, TTFB agregado <400ms (cache quente), bundle <180KB gz.

## 16. Roadmap
| Fase | Entrega |
|---|---|
| **F0** | Scaffold + Design System + shell premium + Overview (mock) + headers de segurança ✅ |
| **F1** | MoskitClient + sync incremental + webhooks + `deal_stage_history` + tela Sincronização |
| **F2** | Overview + Funil reais, filtros na URL, snapshots/tendência |
| **F3** | ROI por origem/campanha + Vendedores (drill-down) + export |
| **F4** | Velocidade & SLA + Explorador + drawer |
| **F5** | Motion, estados finos, a11y, performance budget, command palette |
| **F2+** | Forecast, CAC com custo de mídia, atribuição multi-touch, alertas e-mail/Slack, login+RBAC |

## 17. Sprints (quinzenais)
S1 fundações (este commit) · S2 ingestão · S3 Overview/Funil · S4 ROI/Vendedores ·
S5 Velocidade/SLA+Explorador · S6 polimento. DoD por sprint em cada fase.

## 18. Qualidade
TS strict, ESLint+Prettier, sem `any` injustificado. Testes: Vitest nos módulos de `lib/metrics`
(≥90%), contrato do MoskitClient, idempotência do webhook, E2E Playwright nos fluxos críticos.
A11y WCAG 2.1 AA (foco visível, teclado, contraste ≥4.5:1, reduced-motion). Reconciliação diária
com o Moskit. Todo número exibido rastreável a uma query versionada.

## 19. Riscos
| Risco | Mitigação |
|---|---|
| API sem histórico de etapa | reconstruir via webhooks + diffs (`deal_stage_history`) desde já |
| Rate limit / paginação | backoff, sync por cursor, QStash se preciso |
| Origem/campanha "suja" | tela de normalização de origens em Ajustes |
| "ROI" sem custo de mídia | deixar claro (receita ≠ ROAS); integrar custo na F2+ |
| Dashboard aberto → PII | Deployment Protection + mascarar PII + LGPD |
| Webhook duplicado/fora de ordem | idempotência por `moskit_event_id` + ordenação por timestamp |
| Discrepância vs. Moskit | reconciliação + testes + proveniência visível |

## 20. Recomendações futuras
Atribuição multi-touch · CAC/ROAS com custo de mídia · forecast com ML leve · alertas proativos
(Resend/Slack) · login + RBAC · conector read-only para BI (Metabase) · metas por período fiscal.
