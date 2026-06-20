# Mira — Marketing Revenue Intelligence

Plataforma de análise de **resultados comerciais dos leads de Marketing**, com base de dados
integrada ao **Moskit CRM**. Mostra, de ponta a ponta, o que acontece com cada lead gerado
pelo Marketing — do primeiro toque ao negócio ganho/perdido.

> Repositório: `resultados-MKT` · Deploy: Vercel (projeto `resultados-mercado`).
> Documentação completa em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** + Design System próprio (tokens em `src/app/globals.css`)
- **lucide-react** (ícones) · charts em SVG (substituíveis por Recharts na Fase 2)
- **Postgres** (Neon/Vercel) + Drizzle — _a partir da Fase 1_
- Deploy serverless na **Vercel**

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

Veja [`.env.example`](.env.example). A `MOSKIT_API_KEY` já está configurada no Vercel.
Nunca exponha segredos no código ou no cliente — toda chamada ao Moskit é server-side.

## Estrutura

```
src/
├── app/
│   ├── (dashboard)/        # shell: sidebar + topbar + telas analíticas
│   ├── globals.css         # Design System (tokens)
│   └── layout.tsx          # fontes + tema (anti-flash)
├── components/             # brand, shell, ui, patterns, charts, theme
├── config/                 # navegação
└── lib/                    # utils + dados mock (→ camada de métricas na F1/F2)
```

## Roadmap (resumo)

F0 Fundações (este commit) · F1 Ingestão Moskit→Postgres · F2 Overview+Funil ·
F3 ROI+Vendedores · F4 Velocidade/SLA+Explorador · F5 Polimento.
Detalhes em `docs/ARCHITECTURE.md`.
