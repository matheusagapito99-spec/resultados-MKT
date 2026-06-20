# Descoberta da conta Moskit (2026-06-20)

Resultado de `npm run moskit:introspect` + sondagens, contra a conta real.
Base: `api.moskitcrm.com/v2`, header `apikey`.

## Modelo confirmado
- **Imobiliária = `project`** (módulo "Projetos"). Cada projeto lista seus `deals[]` e `contacts[]`.
- **A origem (UTM + Origem Inbound) vive nos `deals` (negócios)**, como custom fields. O deal NÃO
  aponta de volta para o projeto → a junção é **projeto → deals[]**.
- **Funil** = pipelines/stages dos deals. **Garantias/contratos** = deals ganhos na pipeline
  "Gestão de Propostas" (+ `dealProducts`).
- A atribuição passou a ser capturada em deals **recentes** (≈2026, via integração API/landing page).
  Deals antigos eram tratados como inbound (sem UTM).

## Pipelines (3) → jornada da imobiliária
1. **Prospecção de Imobiliárias** — Novo lead → Discovery → Conexão → Qualificação → Reunião Agendada
2. **Cadastros - OPPs** — Apresentação Realizada (…)
3. **Gestão de Propostas** — Pendente de Alteração → Aprovadas → Pendente de Assinatura → Pendente de Ativação

## Papéis (campo `jobTitle`; `team` vazio)
- **SDR** = "Sales Development Representative" · **Gestor de Contas** = "Account Manager"/"Maneger".

## Custom fields de origem (módulo DEAL) — confirmados por ID
| Campo | CF id | Tipo |
|---|---|---|
| utm_source | `CF_3LvDvEi4CLR67m6a` | TEXT |
| utm_medium | `CF_wPVm2Vi2CP64GmK6` | TEXT |
| utm_campaign | `CF_42AmaJiZCvEp0Djl` | TEXT |
| utm_content | `CF_Pj3qYeieCWJGZqQe` | TEXT |
| utm_term | `CF_Lo1qjyi1C46Y6Der` | TEXT |
| Cidade | `CF_A4wMWNigCBLO3qB8` | TEXT |
| Estado | `CF_6rRmweivCyoOnq4X` | TEXT |
| **Origem Lead** (origem inbound) | `CF_oJZmP1i9iQAvKDgv` | SINGLE_OPTION |
| Etapa do cadastro | `CF_oJZmP1i9iQpa5Dgv` | SINGLE_OPTION |

> O endpoint `GET customFields` (lista) trava em **10 definições** e ignora filtros/paginação; porém
> `GET customFields/{id}` retorna a definição individual (foi assim que mapeamos os campos acima).
> Não há campo de "landing page" próprio (usar utm_content se necessário). Rótulos das opções de
> SINGLE_OPTION (ex.: "Origem Lead") precisam ser resolvidos por dados/endpoint de opções.

Exemplo (deal 47549495 "Glück Imóveis", 18/06/2026): utm_source=google, utm_medium=cpc,
utm_campaign=`01_avalyst_google_search_seguro-fianca_...`, Cidade=Blumenau, Estado=SC.

## `source`/`origin` nativos ≠ atribuição
Valores {MANUAL, AUTOMATION, MOSKIT_API_V2} / {Moskit, Automação, API V2} = **procedência** do
registro no CRM, não canal de marketing.

## Paginação & limites (importante para o sync)
- **Cursor por header**: resposta traz `x-moskit-listing-total` (ex.: **deals = 24.976**) e
  `x-moskit-listing-next-page-token`. Avança-se com **`?nextPageToken=<token>`**.
- `?page` é **ignorado**; página **fixa em 10** (não foi possível aumentar via query/header).
- **Rate limit**: ~6/seg e 240/min (headers `ratelimit-*`). O cliente respeita ~3,5/seg + retry/backoff.
- Implicação: backfill completo de deals ≈ 2.500 requisições (~12 min). Sync incremental (por data de
  atualização) é pequeno. Implementado em `src/lib/moskit/client.ts`.

## Próximo
Adicionar tabela `deals` (negócios) ao schema, ligada a `imobiliarias` (project); escrever o sync
projeto→deals com extração da origem de entrada (deal mais antigo com UTM/Origem Lead). Mapa em
`src/lib/moskit/field-map.ts`.
