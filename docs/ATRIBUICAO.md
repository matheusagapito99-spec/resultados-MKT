# Atribuição de Marketing & Origem dos Leads

> A imobiliária é a entidade central. Sua origem é capturada na **entrada** e
> **nunca sobrescrita**; mudanças viram histórico append-only para auditoria.

## Dois conceitos de origem (independentes e coexistentes)

| | Origem de **Marketing** | Origem **Inbound** |
|---|---|---|
| O que é | Canal de aquisição (via UTM) | Tipo de conversão / ponto de entrada |
| Base | `utm_*` + landing page + data | A conversão realizada (não-UTM) |
| Exemplos | Google Ads, Meta Ads, LinkedIn Ads, E-mail Mkt, Parceiros, Afiliados | Solicitação de demo, Contato comercial, Download, Webinar, Evento, Form institucional, Orgânica, Direta |
| Campo no schema | `entry_marketing_channel_id` + `entry_utm_*` + `entry_landing_page` + `entry_conversion_date` | `entry_inbound_origin_id` |

São **campos distintos**. Combinações válidas, ex.: Marketing = `Google Ads` **e** Inbound =
`Solicitação de Demonstração`; ou Marketing = `Não identificado` **e** Inbound = `Contato Comercial`.

## Preservação histórica (imutabilidade)
- Na entrada do lead, gravamos a atribuição em `imobiliarias.entry_*` **e** uma linha em
  `lead_origin_history` com `is_entry = true`, `source = 'entry'`.
- Os campos `entry_*` **nunca** são atualizados pelo sync.
- Qualquer origem observada depois (sync/webhook/manual) gera **novo INSERT** em
  `lead_origin_history` (nunca UPDATE/DELETE) → trilha completa para auditoria.

## Dimensões de cruzamento
`marketing_channel × inbound_origin × sdr (users.role='sdr') × gestor (role='gestor') ×
imobiliária × receita (revenue_events) × contratos (contracts) × garantias (garantias)`.

## Catálogo de indicadores → como é calculado

| Indicador | Fonte / cálculo |
|---|---|
| Leads por origem de marketing | `count(imobiliarias)` group by `entry_marketing_channel_id` |
| Leads por origem inbound | `count(imobiliarias)` group by `entry_inbound_origin_id` |
| Reuniões realizadas por origem | `meetings` (done) ⋈ imobiliária, group by origem |
| Cadastros concluídos por origem | imobiliárias com `funnel_step >= cadastro`, group by origem |
| Imobiliárias ativas por origem | `status = 'ativa'`, group by origem |
| Tempo até ativação por origem | `avg(activated_at − entered_at)`, group by origem |
| Tempo até 1ª venda por origem | `avg(first_sale_at − entered_at)`, group by origem |
| Receita por origem (mkt / inbound) | `sum(revenue_events.amount)` ⋈ imobiliária, group by origem |
| Receita por **combinação** mkt×inbound | group by (`entry_marketing_channel_id`, `entry_inbound_origin_id`) |
| CAC por origem de marketing | `sum(marketing_costs) / nº de imobiliárias ativadas` por canal/período |
| ROI por origem de marketing | `(receita − custo) / custo` por canal/período |
| LTV | `sum(revenue_events)` por imobiliária → média por origem |
| CAC/ROI por origem inbound | requer **regra de rateio** do custo (spend é por canal de mídia, não por inbound) — ver nota |

### Notas
- **CAC/ROI por marketing** exige `marketing_costs` (investimento por canal/campanha). Fonte: entrada
  manual/admin no MVP; integração com APIs de mídia (Google/Meta) é evolução (`cost_source='ads_api'`).
- **CAC/ROI por inbound** não tem custo direto (origem inbound não é canal pago). Será calculado por
  uma **regra de rateio** explícita (a definir com Marketing), nunca como número "mágico".
- `funnel_step` normaliza o nome da etapa do Moskit (`moskit_stage_name`) via `field-map.ts`.

## De onde vêm os dados (a confirmar na descoberta)
UTMs e origem inbound normalmente chegam ao Moskit como **custom fields** (da landing page/automação).
O script `npm run moskit:introspect` lista os campos reais para preencher
`src/lib/moskit/field-map.ts`. Itens em aberto: se a imobiliária é `company` ou `deal` no Moskit, e se
**contratos/garantias** e **custo de mídia** vivem no Moskit ou em outra fonte.
