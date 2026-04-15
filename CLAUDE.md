# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository. Keep it up to date.

---

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run clean    # Clean Next.js build cache
```

No test runner is configured.

---

## Produto & Contexto Estratégico

**CM Pro** — SaaS B2G multi-tenant de inteligência comercial e CRM para empresas que vendem para prefeituras brasileiras. Integra dados do PNCP com perfis de empresa para gerar oportunidades qualificadas.

- Deploy: Vercel + Supabase (PostgreSQL + RLS)
- Roles: `platform_admin`, `company_admin`, `user`
- Planos: Essencial, Profissional, Elite
- Produto sem clientes pagantes — comercialização não iniciada

### Prioridade atual

- **Primeiro cliente pago antes de novas features**
- A-HA moment: usuário ver licitações abertas para seu segmento nos primeiros 5 minutos
- Landing page é pré-requisito para comercialização (ainda não existe)

### Workflow com Claude Code

- Projeto: `C:\Projetos\inteligencia\inteligencia`
- CLAUDE.md é lido a cada sessão — mantê-lo atualizado é obrigação
- Usar `/compact` em sessões longas; iniciar nova sessão após marcos importantes
- Limite Pro: ~44k tokens por janela de 5h — sessões devem ter escopo fechado

---

## Architecture

**Next.js 15 full-stack** — multi-tenant SaaS B2G com role-based access.

### Route Structure

- `app/(dashboard)/` — Área autenticada (CRM, email marketing, inteligência, settings)
- `app/(admin)/admin/` — Admin da plataforma (empresas, prefeituras, usuários, saúde do sistema)
- `app/api/` — API routes; `/api/pncp/sync` é o único endpoint público — todos os outros exigem auth
- `app/login/` — Entrada de autenticação

### Data Layer: Dados Globais vs Dados Operacionais

**DECISÃO ARQUITETURAL CRÍTICA — nunca regredir.**

#### 1. Dados Globais (compartilhados entre todos os tenants)

| Tabela | Descrição |
|--------|-----------|
| `municipalities` | Prefeituras brasileiras — base institucional central |
| `opportunities` | Licitações PNCP — `company_id` é nullable, dados são globais |

Regras:
- Não duplicar por empresa; não pertencem a nenhum tenant
- `external_id` é o identificador canônico para deduplicação
- `ON CONFLICT` deve usar `external_id` isolado, nunca `(company_id, external_id)`

#### 2. Dados Operacionais (por empresa / tenant)

| Tabela | Descrição |
|--------|-----------|
| `contacts`, `deals`, `proposals`, `contracts`, `tasks` | CRM por empresa |
| `email_campaigns`, `email_job_queue` | Campanhas e fila de disparo |

Regras: sempre isolados por `company_id`; RLS obrigatório; nunca vazam entre empresas.

**Supabase clients:**
- `lib/supabase/client.ts` — browser-side
- `lib/supabase/server.ts` — server-side (API routes e Server Components)

### Service Layer Pattern

`lib/services/` — toda a lógica de negócio como funções async puras. Mappers em `lib/mappers/` convertem entre rows do banco e tipos da UI.

### Intelligence Engine / PNCP Sync

- `lib/intelligence/` — motor de scoring de match
- `lib/intel/` — tipos e service layer para oportunidades/perfis
- `lib/pncp/` — client PNCP, mapper e sync (legado/demo — não escreve no banco)
- `app/api/pncp/sync/route.ts` — **rota real de sync** (escreve em `opportunities`)

Sync: `GET /api/pncp/sync` (auth via `Authorization: Bearer <CRON_SECRET>`). Scores: `POST /api/intel/recalculate-scores`.

#### Comportamento do sync (`app/api/pncp/sync/route.ts`)

- **Endpoint PNCP**: `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`
- **Modalidades**: 6 (Pregão Eletrônico), 8 (Dispensa), 1 (Concorrência)
- **Paginação**: loop até 50 páginas × `tamanhoPagina=500` por modalidade
- **Deduplicação**: `external_id = numeroControlePNCP`; `ON CONFLICT (external_id)`
- **Janela**: controlada por `sync_control.last_sync`; fallback: ontem
- **Upsert global**: sem `company_id` no objeto inserido
- **Scores**: recalculados por empresa após upsert; notificações para scores ≥ 90
- **Ciclo de vida**: expiradas → `internal_status='expired'`; deletadas após 30 dias
- **Cron**: Vercel cron job em `vercel.json`

#### Parâmetros obrigatórios da API PNCP

- `dataInicial`, `dataFinal` (formato `yyyyMMdd`), `codigoModalidadeContratacao`
- `lib/pncp/sync.ts` usa in-memory (legado/demo) — não persiste no banco

### AI Integration

Gemini (`@google/genai`) — requer `GOOGLE_API_KEY`:
- Geração de proposta: `/api/intel/generate-proposal`
- Consolidação de perfil: `/api/intel/consolidate-profile`
- Templates de email (Gemini 2.5 Flash Lite, 4 tipos, cache por perfil): `/api/email/templates/generate`

### Admin Module

- `opportunity_sources` — CRUD via `/api/admin/opportunity-sources`
- Import de emails de prefeituras: `/api/admin/municipality-emails-import` e `/api/admin/municipality-emails-process`
- Todas as rotas `/api/admin/*` protegidas no middleware (401/403 JSON) **e** dentro do handler
- **Editar/excluir prefeituras restrito a `platform_admin`**

### Municipality emails (`municipality_emails`)

Ao salvar email institucional em uma prefeitura, sempre fazer upsert em `municipality_emails` com:
- `source = 'manual'`, `department_label = 'institucional'`, `is_strategic = true`

**Campo `email` em `municipalities`**: coluna `TEXT` direta na tabela. Salvo via `accountService.update()`. Não confundir com `municipality_emails` (tabela separada para múltiplos emails). A rota `sync-email` (`app/api/crm/accounts/[id]/sync-email/route.ts`) sincroniza o email principal para `municipality_emails` — fluxos distintos.

---

## Padrões de Desenvolvimento

### Regra de Ouro: Prefeitura é Entidade

**Prefeitura NÃO é texto. Prefeitura é entidade.**

- Sempre usar `municipality_id` (FK → `municipalities`)
- Nunca salvar nome de prefeitura como texto livre para vínculo operacional
- Sempre usar dropdown conectado à tabela `municipalities`
- `department`, `secretariat`, `unit` são complementares — nunca substituem `municipality_id`

### Padrão Operacional dos Módulos CRM

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| `municipality_id` | FK → municipalities | Obrigatório |
| `company_id` | FK → companies | Obrigatório |
| `department` | TEXT | Complementar |
| `secretariat` | TEXT | Complementar |
| `unit` | TEXT | Complementar |

### Padrão de Loading nas Páginas CRM

`loading=true` inicial + `if (!companyId) return` sem `setLoading(false)` causa spinner infinito.

**Padrão correto:**

```typescript
useEffect(() => {
  if (companyId) {
    loadXxx();
  } else {
    setLoading(false); // encerra spinner mesmo quando companyId é null
  }
}, [companyId, loadXxx]);
```

### CompanyProvider: Evitar Lock Collision

`GoTrueClient` múltiplas instâncias causam `"Lock broken by another request with the 'steal' option"`.

**Regra** (`components/providers/CompanyProvider.tsx`):
- `createClient()` chamado **UMA ÚNICA VEZ** via `useRef`
- Mesma instância reutilizada em `init()`, `onAuthStateChange()` e `loadUserData()`

### Checklist de Qualidade por Alteração

1. DTO — reflete exatamente o que a UI usa
2. Service — reflete o que o banco e a UI precisam
3. UI — nunca assume campo inexistente
4. Banco — constraints e índices coerentes com upserts
5. Mappers — coerentes com entity, DTO e uso real em tela
6. Enums — consistentes entre banco, DTO e UI
7. Persistência real — testar que o dado persiste
8. Build — `npm run build` passa sem erros
9. Impacto colateral — módulos já estabilizados não regridem

**Entrega inválida se:** quebra o build, não persiste no banco, quebra tipagem, resolve sintoma mas preserva causa raiz, ou introduz risco de regressão desnecessário.

---

## Problemas Conhecidos e Soluções Validadas

### 1. ON CONFLICT quebrando

**Causa**: ausência de constraint UNIQUE compatível com o upsert.
**Solução**: criar constraint/índice único coerente com a chave de deduplicação **antes** de usar `upsert`. Verificar `pg_indexes` antes de assumir.

### 2. CSV com números inválidos

**Causa**: `"1.948"` interpretado incorretamente (milhar vs. decimal).
**Solução**: normalizar no backend antes da persistência.

### 3. Tipagem quebrando o build

DTO → Service → Mapper → UI devem ser coerentes. Campo novo na UI: ajustar DTO, mapper e service juntos.

### 4. Assinatura errada de service

```typescript
// ERRADO:
accountService.getAll({ pageSize: 1000 })
// CORRETO:
accountService.getAll(undefined, 1, 1000)
```

Revisar assinatura real do service antes de editar páginas.

### 5. Campo inexistente no DTO

A UI nunca deve assumir campo inexistente. Quando precisa de campo novo, ajustar DTO, mapper e service.

### 6. Toast disparando sozinho

Toast só em ação explícita do usuário. Erros de carga inicial → estado de erro na UI, não toast automático.

### 7. Relações quebrando queries PostgREST

Priorizar `select` simples sem join até estabilizar a estrutura.

### 8. Limpeza de base global bloqueada por FKs

Antes de limpar bases globais, mapear FKs e avaliar impacto. Em produção, preferir substituição controlada à deleção cega.

---

## Email Marketing Module

### Campaign wizard flow

4 passos em `/email/campaigns/[id]`:
1. **Editor** — subject (obrigatório), preheader, tabs HTML/preview/plain-text, hints de variáveis
2. **Audience** — 7 filtros (estado, município, população, departamento, estratégico, score mínimo, busca de email); contagem ao vivo via `GET /api/email/audiences/preview`
3. **Summary** — validation gate; continuar desabilitado se não pronto
4. **Send** — seletor de conta, aviso de truncamento, checkbox de confirmação, `POST /api/email/campaigns/[id]/send`

Colunas obrigatórias em `email_campaigns`:
```sql
subject TEXT, preheader TEXT, html_content TEXT, text_content TEXT,
audience_filters JSONB, sending_account_id UUID, sent_at TIMESTAMPTZ,
sent_count INT DEFAULT 0, failed_count INT DEFAULT 0
```

### Campaign send API (`POST /api/email/campaigns/[id]/send`)

- Reconstrói query de audiência a partir de `audience_filters JSONB`
- **Não envia imediatamente** — insere todos os destinatários em `email_job_queue`
- Após inserir jobs, dispara fire-and-forget para `/api/email/queue/process` com `Authorization: Bearer CRON_SECRET`
- Atualiza campanha: `status='Agendada'`, `sending_account_id`
- Retorna `{ queued, total }`
- 402 se `emails_used >= emails_limit && extra_credits <= 0` → `{ error: 'limit_reached' }`

### Email job queue (`email_job_queue`)

Processamento em lotes — 100 emails/hora via cron.

```sql
id uuid, campaign_id uuid, company_id uuid, sending_account_id uuid,
recipient_email text, recipient_name text, municipality text, state text,
status text DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
created_at timestamptz, sent_at timestamptz NULL
```

- **Queue processor** — `GET /api/email/queue/process` — busca até 100 rows `pending`, envia via nodemailer com tracking injection, marca `sent`/`failed`, incrementa contadores via RPC `increment_campaign_counts`, flip para `status='Ativa'` quando sem jobs pendentes
- **Auth**: `Authorization: Bearer <CRON_SECRET>`
- `export const runtime = 'nodejs'` e `export const dynamic = 'force-dynamic'` obrigatórios nesta rota (nodemailer não roda como Edge Function)
- **Edge Function** — `supabase/functions/process-email-queue/index.ts` — chama o processor; deployed no projeto `iqadumkswzemlvzuetsq`
- **Cron**: `pg_cron` no Supabase, schedule `0 * * * *`

### Email tracking

Schema da tabela `email_events`:
```sql
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('open', 'click')),
  link_url text NULL,
  tracked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text NULL,
  user_agent text NULL
);
CREATE INDEX ON email_events(campaign_id);
CREATE INDEX ON email_events(recipient_email);
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
```

- **Open pixel** — `GET /api/email/track/open?campaign_id=&email=` — GIF 1×1, registra evento `open`. Sem auth. Falha silenciosa.
- **Click redirect** — `GET /api/email/track/click?campaign_id=&email=&url=` — registra `click`, redirect 302. Valida `http/https` para evitar open-redirect.
- **Tracking stats** — `GET /api/email/tracking-stats` — autenticado; agrega opens/clicks únicos por campanha. Usa `createAdminClient` para leitura (sem SELECT RLS policy em `email_events`).
- Base URL: `process.env.NEXT_PUBLIC_APP_URL`

### SMTP account storage (`email_sending_accounts`)

- Isoladas por empresa via RLS em `company_id`
- Senha nunca em plain text — `smtp_password_encrypted` armazena ciphertext; coluna `smtp_password` não existe
- PATCH: só re-criptografar senha se nova senha for fornecida

Endpoints:
- `GET    /api/email/sending-accounts`
- `POST   /api/email/sending-accounts` — limite 5 por empresa via RPC atômica
- `PATCH  /api/email/sending-accounts`
- `DELETE /api/email/sending-accounts`
- `POST   /api/email/test-connection` — testa SMTP; salva `last_tested_at`, `last_test_status`, `last_test_error`

### Encryption (`lib/security/email-settings-crypto.ts`)

- Algorithm: AES-256-GCM
- Key: `EMAIL_SETTINGS_ENCRYPTION_KEY` — hex string, 64 chars (256 bits)
- Formato: `"iv:authTag:encryptedData"` (hex, 3 partes separadas por ":")
- Funções: `encryptEmailSettingSecret(plainText)` / `decryptEmailSettingSecret(payload)`

### SMTP ports

- **465** — SSL/TLS (`smtp_secure: true`)
- **587** — STARTTLS (`smtp_secure: false`, `requireTLS: true`)
- **993** é IMAP — **nunca usar para envio SMTP**

---

## Fluxo de Signup e Pagamento

- Fluxo: `/signup` → `/signup/plan` → `/signup/payment` → webhook Asaas confirma → acesso ao dashboard
- **Trial removido** — status inicial é `'pending'`; acesso liberado apenas após `plan_id` preenchido via webhook `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`
- **Google OAuth removido do MVP** — apenas cadastro manual
- Dashboard redireciona para `/signup/plan?error=plan_required` se `plan_id === null`
- `trial_ends_at` permanece no banco mas não é usada pelo código

---

## Billing & Plans Module

### Plans (tabela `plans`)

| Plan | Emails/mês | Usuários | Mensal | Semestral | Anual |
|------|-----------|----------|--------|-----------|-------|
| Essencial | 10.000 | 1 | R$297 | R$1.600 | R$2.800 |
| Profissional | 25.000 | 3 | R$497 | R$2.600 | R$4.800 |
| Elite | 50.000 | ilimitado | R$797 | R$4.200 | R$7.800 |

Pacote extra: 5.000 emails por R$80.

### Tabelas de billing

- `plans`, `subscriptions` (status: pending/active/past_due/cancelled/expired), `email_credits`, `billing_events`

### Colunas em `companies`

- `plan_id` (FK → plans), `emails_used_this_month`, `extra_credits_available`, `trial_ends_at`, `additional_users_count`

### Gateway de pagamento: Asaas

- Env vars: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (header `asaas-access-token`)
- `NEXT_PUBLIC_ASAAS_SANDBOX=true` → sandbox; vazio/false → produção
- Client: `lib/asaas.ts` — `createAsaasCustomer`, `createAsaasSubscription`, `cancelAsaasSubscription`, `getAsaasSubscriptionPayments`, `getAsaasPaymentPixQrCode`
- Troca de plano: cancela assinatura anterior; reutiliza `asaas_customer_id`

### Comportamento de `/api/billing/subscribe`

- `.maybeSingle()` na busca de subscription (evita PGRST116 para novos usuários)
- `createAsaasCustomer` e `createAsaasSubscription` em `try/catch` individuais retornando JSON
- `existingSub` existe → UPDATE; não existe → INSERT
- PIX: busca QR Code via `getAsaasSubscriptionPayments` + `getAsaasPaymentPixQrCode`
- Boleto: retorna `bankSlipUrl` do primeiro pagamento

### Rotas de billing

- `POST /api/billing/subscribe` — cria cliente + assinatura; suporta CREDIT_CARD, PIX, BOLETO
- `POST /api/billing/webhook` — eventos Asaas; após PAYMENT_CONFIRMED/RECEIVED gera PDF do contrato e envia por email
- `POST /api/billing/cancel` — cancela no Asaas + `subscriptions.status='cancelled'`
- `POST /api/billing/extra-credits` — compra pacote extra
- `GET  /api/billing/subscription` — dados reais de assinatura

### Controle de limite

- Bloqueado em `POST /api/email/campaigns/[id]/send` se `emails_used >= emails_limit && extra_credits <= 0` → 402 `{ error: 'limit_reached' }`
- Frontend: `LimitReachedModal` (`components/email/LimitReachedModal.tsx`)
- Pós-envio: RPC `increment_emails_used(company_id)`
- Reset mensal: pg_cron `0 0 1 * *` via `reset_monthly_email_usage()` RPC

### RPCs

- `increment_emails_used(company_id_param)` — incrementa `emails_used_this_month`
- `reset_monthly_email_usage()` — zera em todas as empresas
- `claim_email_jobs(p_limit)` — SELECT FOR UPDATE SKIP LOCKED
- `finalize_campaign_if_complete(p_campaign_id)` — atomic NOT EXISTS + UPDATE
- `insert_sending_account_if_under_limit(...)` — atomic COUNT + INSERT (limite de 5)
- `increment_campaign_counts(p_campaign_id, p_sent, p_failed)` — atomic counter

---

## Sistema de Contrato

- `lib/contract/contractText.ts` — texto completo com placeholders `[RAZAO SOCIAL]`, `[CNPJ/CPF]` etc.; exporta `CONTRACT_TEXT`, `CONTRACT_VERSION = 'v1.0'`, `hashContract(text)` (SHA-256 hex)
- `lib/contract/generatePdf.ts` — PDF com `pdf-lib`; paginação automática; `generateContractPdf(data: ContractData): Promise<Uint8Array>`
- `lib/contract/sendContractEmail.ts` — envia via Resend; anexo `Contrato_CM_Pro.pdf`; `sendContractEmail(toEmail, toName, pdfBytes)`

Aceitação no signup/payment: `hashContract` + `CONTRACT_VERSION` salvos em `contract_acceptances` com `user_id`, `company_id`, `plan_id`, `ip_address`.

Envio pós-pagamento: webhook gera PDF e envia por email (best-effort, `try/catch` não bloqueia webhook).

---

## Security Rules

### Critical: Supabase client choice

**NUNCA usar `createAdminClient()` em rotas autenticadas.** Bypassa cookies → `auth.getUser()` retorna null → sempre 401.

**SEMPRE usar `createClient()` de `lib/supabase/server.ts`** em qualquer rota que exija sessão de usuário.

`createAdminClient()` só é válido para:
- Endpoints server-to-server públicos (`/api/pncp/sync`)
- Escrita de tracking de emails de callers não autenticados (`/api/email/track/*`)
- Leitura sem SELECT RLS policy em handler **já autenticado** via `createClient()` primeiro

### Auth pattern — rotas autenticadas

```typescript
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
if (!profile?.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

if (profile.company_id !== body.company_id) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
```

### Auth pattern — rotas platform_admin

```typescript
const authClient = await createClient();
const { data: { user } } = await authClient.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
if (!profile || profile.role !== 'platform_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const supabase = await createAdminClient(); // seguro aqui — auth já verificado
```

### Middleware protection (`middleware.ts`)

- `/api/pncp/sync` — bypassed (auth via `Authorization: Bearer` no handler)
- `/admin/*` — requer `platform_admin`; redireciona para `/login` ou `/dashboard`
- `/api/admin/*` — requer `platform_admin`; retorna JSON 401/403
- Rotas de cron públicas: `/api/email/queue/process`, `/api/cron/trial-expiring`, `/api/pncp/scrape`, `/api/pncp/scores`

### RLS policies (aplicadas)

Todas as tabelas usam `USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))`:
- `contacts`, `contracts`, `deals`, `tasks`, `proposals`, `timeline_events`, `municipality_documents`
- `email_job_queue`, `email_campaigns`, `email_sending_accounts`
- `email_events` — FOR SELECT via `campaign_id IN (SELECT id FROM email_campaigns WHERE company_id = ...)`
- `company_profiles`, `company_catalogs`, `company_documents`, `ai_proposals`, `notifications`, `pipeline_stages`
- Somente leitura autenticada: `municipalities`, `municipality_emails`, `sync_control`, `pncp_contratacoes`

### `profiles` table — colunas existentes

`id, email, company_id, role, created_at` — **sem** `status`, **sem** `last_access`.

---

## Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_API_KEY
EMAIL_SETTINGS_ENCRYPTION_KEY   # 64-char hex, AES-256-GCM
NEXT_PUBLIC_APP_URL              # e.g. https://inteligencia-sooty.vercel.app
CRON_SECRET                      # Authorization: Bearer — /api/pncp/sync e /api/email/queue/process
ASAAS_API_KEY
ASAAS_WEBHOOK_TOKEN
NEXT_PUBLIC_ASAAS_SANDBOX        # 'true' em desenvolvimento
RESEND_API_KEY                   # e-mails transacionais via Resend
```

## Path Alias

`@/*` → raiz do projeto (configurado em `tsconfig.json`).

---

## Public Routes

- `/app` — landing page CM Pro
- `/login` — autenticação
- `/api/email/track/*` — tracking (sem auth)
- `/api/pncp/sync` — sync PNCP (auth via Bearer)

---

## Build Rules

- **NUNCA incluir `supabase/functions/` no build Next.js.** Excluído via `tsconfig.json` `exclude: ["supabase"]`. Deploy de Edge Functions apenas via `supabase functions deploy`.

### Regras Obrigatórias

- **Antes de qualquer commit: `npm run build` deve passar sem erros.**
- **Nunca criar importações para arquivos inexistentes** — verificar antes; se não existe, criar no mesmo commit.
- **Nunca remover importações sem investigar** — padrão correto é criar o arquivo ausente.
- **Busca sistêmica**: ao corrigir um padrão, buscar em todos os arquivos e corrigir tudo no mesmo commit.

---

## Git Commits

- Never add "Co-Authored-By" tags. Commits must have only one author.
- Do not include any Anthropic or Claude references in git commits.
- Never trigger `git push` or deploy directly — only make code changes and commit locally.
