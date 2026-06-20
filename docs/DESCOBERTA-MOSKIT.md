# Descoberta da conta Moskit (2026-06-20)

Resultado de `npm run moskit:introspect` contra a conta real. Base: `api.moskitcrm.com/v2`,
header `apikey`.

## Pipelines (3) → a jornada da imobiliária
1. **Prospecção de Imobiliárias** — `Novo lead → Discovery → Conexão → Qualificação → Reunião Agendada`
2. **Cadastros - OPPs** — `Apresentação Realizada` (…)
3. **Gestão de Propostas** — `Pendente de Alteração → Aprovadas → Pendente de Assinatura → Pendente de Ativação`

> Mapeamento p/ `funnel_step`: Novo lead→`lead`; Discovery/Conexão/Qualificação→`qualificacao`;
> Reunião Agendada→`reuniao`; Apresentação Realizada→`cadastro`; Aprovadas/Assinatura→`ativa` (proposta
> ganha = contrato/garantia); Pendente de Ativação→ativação. (Confirmar com o time comercial.)

## Papéis (campo `jobTitle`; `team` está vazio)
- **SDR** = jobTitle "Sales Development Representative" (Thiago Rocha, Karla Andrade, Myrella Ruas)
- **Gestor de Contas** = jobTitle "Account Manager"/"Account Maneger" (Flávia Barreto, Sergio Junior)
- Outros: Coordenador Comercial, Head de Marketing, COO.

## Entidades
- `deals`, `companies`, `contacts` têm: `id, dateCreated, name, source, origin, status, closeDate,
  stage, dealProducts, contacts, companies, activities, entityCustomFields`.
- **Imobiliária** = provável `company` (a empresa parceira); o `deal` é a oportunidade/proposta;
  `dealProducts` provavelmente carrega o produto (garantia). Garantias/contratos = deals ganhos na
  pipeline "Gestão de Propostas".

## `source` / `origin` nativos = PROCEDÊNCIA, não atribuição de marketing
Valores observados: source ∈ {MANUAL, AUTOMATION, MOSKIT_API_V2}; origin ∈ {Moskit, Automação, API V2}.
Indicam **como o registro entrou no Moskit**, não o canal de marketing nem a conversão inbound.

## ⚠️ Achado crítico: NÃO existem campos de UTM nem de Origem Inbound no Moskit
As 10 definições de custom field (`GET customFields`) são:
- ACTIVITY: "Reunião Aconteceu?", "Resultado da Ligação"
- CONTACT: "Nível de Influência", "Perfil de atuação comercial"
- COMPANY: "Quantidade de imóveis", "ID Plataforma Avalyst"
- DEAL: "Grau de Decisão…", "Quem será o ponto focal…", "Foco de atuação nas locações", "Tempo médio…"

**Nenhum** captura utm_source/medium/campaign/content/term, landing page, data de conversão ou tipo de
conversão (origem inbound). Ou seja: **a atribuição de marketing/inbound ainda não é coletada no CRM.**

### Implicação
- Análises de **origem (marketing/inbound), CAC, ROI, LTV por canal** dependem de **instrumentar o
  Moskit primeiro**: criar custom fields de UTM + Origem Inbound e fazer o fluxo de captação de leads
  (landing pages / automação de marketing) preencher esses campos ao criar o lead.
- O que **já dá** para construir com os dados atuais: funil por etapa/pipeline, reuniões (activities),
  performance por SDR/Gestor, velocidade (tempo em etapa via dateCreated/closeDate), contratos/garantias
  (deals ganhos em "Gestão de Propostas") — **sem segmentação por origem** até a instrumentação existir.

## Pendências técnicas
- **Paginação**: a listagem retornou ~10 itens e parou — o parâmetro de tamanho de página (`size`) não
  surtiu efeito. Descobrir o esquema correto (provável `limit`/`offset` ou `pageSize`) antes do sync full.
- **Opções de custom fields** (IDs como 643008) precisam ser decodificadas via endpoint de detalhe se
  formos usar algum SINGLE_OPTION.
