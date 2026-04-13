# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository. It is the master reference document for the CM Pro project — keep it up to date.

---

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run clean    # Clean Next.js build cache
```

No test runner is configured in this project.

---

## Produto & Contexto Estratégico

**CM Pro** é um SaaS B2G multi-tenant de inteligência comercial e CRM voltado para empresas que vendem para prefeituras brasileiras. Integra dados públicos do PNCP com perfis estratégicos de empresa para gerar oportunidades qualificadas.

- Produto renomeado de 'CM Intelligence' para 'CM Pro' em março 2026
- Planos renomeados: Iniciante→Essencial, Conversão→Elite
- Deploy no Vercel + Supabase (PostgreSQL + RLS)
- Roles: `platform_admin`, `company_admin`, `user`
- Produto ainda sem clientes pagantes — comercialização não iniciada

### Prioridade atual

- **Primeiro cliente pago antes de novas features**
- A-HA moment: usuário ver licitações abertas para seu segmento nos primeiros 5 minutos
- Landing page é pré-requisito para comercialização (ainda não existe)
- Após primeiro cliente: inverter proporção para 90% marketing / 10% produto

### Workflow com Claude Code

- Projeto instalado em: `C:\Projetos\inteligencia\inteligencia`
- CLAUDE.md é lido automaticamente a cada sessão — mantê-lo atualizado é obrigação
- Usar `/compact` em sessões longas para economizar tokens
- Iniciar novas sessões após marcos importantes
- Sessões devem ter escopo fechado e definido antes de iniciar
- Limite Pro: ~44k tokens por janela de 5h — sessões abertas e vagas são desperdício

---

## Architecture

**Next.js 15 full-stack CM Pro — Plataforma B2G** for Brazilian public procurement intelligence (PNCP). Multi-tenant SaaS with role-based access: `platform_admin`, `company_admin`, `user`.

### Route Structure

- `app/(dashboard)/` — Authenticated user area (CRM, email marketing, intelligence, settings)
- `app/(admin)/admin/` — Platform admin area (companies, municipalities, users, system health)
- `app/api/` — API routes; `/api/pncp/sync` is the only public endpoint — all others require auth
- `app/login/` — Auth entry point

### Data Layer: Dados Globais vs Dados Operacionais

**DECISÃO ARQUITETURAL CRÍTICA — nunca regredir.**

O sistema possui dois tipos de dados com naturezas completamente distintas:

#### 1. Dados Globais (compartilhados entre todos os tenants)

| Tabela | Descrição |
|--------|-----------|
| `municipalities` | Prefeituras brasileiras — base institucional central |
| `opportunities` | Licitações públicas do PNCP — `company_id` é nullable, dados são globais |
| Futuras bases públicas enriquecidas | PNCP, dados administrativos, enriquecimentos públicos |

Regras:
- São únicos — não duplicar por empresa
- Não pertencem a nenhum tenant específico
- `external_id` é o identificador canônico para deduplicação (sem `company_id` no sufixo)
- ON CONFLICT deve usar `external_id` isolado, não `(company_id, external_id)`

#### 2. Dados Operacionais (por empresa / tenant)

| Tabela | Descrição |
|--------|-----------|
| `contacts` | Contatos comerciais da empresa |
| `deals` | Negociações e funil |
| `proposals` | Propostas enviadas |
| `contracts` | Contratos fechados |
| `tasks` | Tarefas operacionais |
| `email_campaigns`, `email_job_queue` | Campanhas e fila de disparo |
| Futuros registros operacionais privados | Por tenant |

Regras:
- Sempre isolados por `company_id`
- RLS obrigatório
- Nunca vazam entre empresas

**Supabase** (PostgreSQL + RLS) via dois modos de client:
- `lib/supabase/client.ts` — Browser-side client
- `lib/supabase/server.ts` — Server-side client (for Server Components and API routes)

Always use the server client in API routes and Server Components. RLS policies enforce tenant isolation automatically.

### Service Layer Pattern

`lib/services/` contains all business logic as plain async functions. Pages and API routes call these functions — there is no shared state or class instances. Mappers in `lib/mappers/` convert between database rows and UI types.

### Intelligence Engine / PNCP Sync

The core feature: matches government procurement opportunities against company profiles.
- `lib/intelligence/` — Match scoring engine
- `lib/intel/` — Types and service layer for opportunity/profile management
- `lib/pncp/` — PNCP API client, data mapper, and sync logic (legado/demo — não escreve no banco)
- `app/api/pncp/sync/route.ts` — **Rota real de sync** (escreve na tabela `opportunities`)

Sync é disparado via `GET /api/pncp/sync` (cron-friendly; auth via `Authorization: Bearer <CRON_SECRET>`). Scores são recalculados via `POST /api/intel/recalculate-scores`.

#### Comportamento atual do sync (`app/api/pncp/sync/route.ts`)

- **Endpoint PNCP**: `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`
- **Modalidades**: 6 (Pregão Eletrônico), 8 (Dispensa), 1 (Concorrência) — uma requisição por modalidade
- **Paginação**: loop até 50 páginas × `tamanhoPagina=500` por modalidade
- **Deduplicação**: `external_id = numeroControlePNCP` (sem `company_id`); `ON CONFLICT (external_id)`
- **Janela**: controlada por `sync_control.last_sync`; fallback: ontem
- **Upsert global**: sem `company_id` no objeto inserido — `opportunities.company_id` é nullable
- **Scores**: recalculados por empresa após upsert global; notificações para scores ≥ 90
- **Ciclo de vida**: expiradas → `internal_status='expired'`; deletadas após 30 dias
- **Cron**: Vercel cron job configurado em `vercel.json`

#### Aprendizados reais da integração PNCP

- Parâmetros obrigatórios: `dataInicial`, `dataFinal` (formato `yyyyMMdd`), `codigoModalidadeContratacao`
- Erros já corrigidos: 400 por falta de parâmetros, 422 por formato de data inválido, upsert sem unique constraint em `external_id`
- `lib/pncp/sync.ts` usa armazenamento in-memory (legado/demo) — não persiste no banco

#### Migration aplicada (2026-03-31)

```sql
-- opportunities são globais — company_id nullable
ALTER TABLE public.opportunities ALTER COLUMN company_id DROP NOT NULL;
DROP INDEX IF EXISTS idx_opportunities_company_external_id;
UPDATE public.opportunities SET company_id = NULL;
```

### AI Integration

Uses Gemini (`@google/genai`) for:
- Proposal generation (`/api/intel/generate-proposal`)
- Profile consolidation (`/api/intel/consolidate-profile`)
- Email template generation via Gemini 2.5 Flash Lite — 4 tipos com cache por perfil (`/api/email/templates/generate`)

Requires `GOOGLE_API_KEY` environment variable.

### Admin Module

Platform admin (`platform_admin` role) features:
- `opportunity_sources` table — CRUD via `/api/admin/opportunity-sources`, status verification via `/api/admin/opportunity-sources/verify`
- Municipality email import — `/api/admin/municipality-emails-import` and `/api/admin/municipality-emails-process`
- All `/api/admin/*` routes are protected at the middleware level (returns 401/403 JSON) **and** inside each handler
- **Edit/delete municipalities restricted to `platform_admin`** — UI and API enforce role check before allowing mutations

### Municipality emails (`municipality_emails`)

When saving an institutional email on a municipality record, always perform an upsert into `municipality_emails` with:
- `source = 'manual'`
- `department_label = 'institucional'`
- `is_strategic = true`

**Campo `email` em `municipalities`**: coluna `TEXT` que existe diretamente na tabela. É salvo via `accountService.update()` e exposto no modal de Editar/Adicionar Prefeitura. Não confundir com `municipality_emails` (tabela separada para múltiplos e-mails por prefeitura). A rota `sync-email` (`app/api/crm/accounts/[id]/sync-email/route.ts`) sincroniza o e-mail principal para `municipality_emails` como entrada adicional — são fluxos distintos.

---

## Padrões de Desenvolvimento

### Regra de Ouro: Prefeitura é Entidade

**Prefeitura NÃO é texto. Prefeitura é entidade.**

- Sempre usar `municipality_id` (FK → `municipalities`)
- Nunca salvar nome de prefeitura como texto livre quando representa vínculo operacional
- Sempre usar dropdown conectado à tabela `municipalities`
- `municipality_id` é a referência canônica para associação com prefeitura
- `department`, `secretariat`, `unit` são complementares — nunca substituem `municipality_id`

### Padrão Operacional dos Módulos CRM

Todos os módulos do CRM devem ter:

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| `municipality_id` | FK → municipalities | Obrigatório |
| `company_id` | FK → companies | Obrigatório |
| `department` | TEXT | Complementar |
| `secretariat` | TEXT | Complementar |
| `unit` | TEXT | Complementar |

### Padrão de Loading nas Páginas CRM

**Problema**: `loading=true` inicial + `if (!companyId) return` sem `setLoading(false)` causava spinner infinito quando o `CompanyProvider` demorava a inicializar.

**Padrão correto** (já aplicado em proposals, tasks, contracts):

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

**Problema**: múltiplas instâncias do `GoTrueClient` criadas em paralelo causavam `"Lock broken by another request with the 'steal' option"` e spinner infinito.

**Correção validada** (`components/providers/CompanyProvider.tsx`):
- `createClient()` chamado **UMA ÚNICA VEZ** via `useRef`
- Mesma instância reutilizada em `init()`, `onAuthStateChange()` e `loadUserData()`
- **Nunca** chamar `createClient()` múltiplas vezes dentro do mesmo provider

### Checklist de Qualidade por Alteração

Sempre que fizer qualquer alteração, validar:

1. DTO — reflete exatamente o que a UI usa
2. Service — reflete o que o banco e a UI precisam
3. UI — nunca assume campo inexistente
4. Banco — constraints e índices coerentes com upserts
5. Mappers — coerentes com entity, DTO e uso real em tela
6. Enums — consistentes entre banco, DTO e UI
7. Persistência real — testar que o dado persiste
8. Build — `npm run build` passa sem erros
9. Impacto colateral — módulos já estabilizados não regridem

**Nenhuma entrega é válida se:**
- Quebra o build
- Não persiste no banco
- Usa dados inconsistentes
- Quebra tipagem
- Gera comportamento imprevisível
- Exige correções manuais em cadeia
- Resolve sintoma mas preserva causa raiz
- Introduz risco de regressão sem necessidade

---

## Problemas Conhecidos e Soluções Validadas

### 1. ON CONFLICT quebrando

**Causa**: ausência de constraint UNIQUE compatível com o upsert.

**Solução**: criar constraint ou índice único coerente com a chave de deduplicação **antes** de usar `upsert` com `onConflict`. Nunca assumir que o campo existe como unique sem verificar `pg_indexes`.

Exemplos já corrigidos:
- `municipalities` → deduplicação por `city + state`
- `opportunities` → unique index em `external_id` para upsert global

### 2. CSV com números inválidos

**Causa**: valores como `"1.948"` interpretados incorretamente (separador de milhar vs. decimal).

**Solução**: normalizar antes de inserir; tratar no backend antes da persistência; nunca confiar que planilha virá tipada corretamente.

### 3. Tipagem quebrando o build

**Causas comuns**: DTO divergente da UI, campos inexistentes, enums inconsistentes, mappers retornando campos não declarados.

**Regra**: DTO → Service → Mapper → UI devem ser coerentes entre si. Quando a UI precisa de um campo novo, ajustar DTO, mapper e service juntos.

### 4. Assinatura errada de service

```typescript
// ERRADO:
accountService.getAll({ pageSize: 1000 })

// CORRETO:
accountService.getAll(undefined, 1, 1000)
```

**Regra**: revisar a assinatura real do service antes de editar páginas. Nunca inventar formato de chamada.

### 5. Campo inexistente no DTO

**Exemplos reais**: `task.title`, `contact.location`, `contract.notes` quando o DTO não tinha esses campos.

**Regra**: a UI nunca deve assumir campo inexistente. Quando a UI precisa de um campo, o DTO, mapper e service devem ser ajustados corretamente.

### 6. Toast disparando sozinho

**Causa**: uso incorreto em `useEffect` — carga inicial disparando feedback indevido.

**Regra**: toast só em ação explícita do usuário. Erros de carga inicial devem ser tratados com estado de erro na UI, não com toast automático.

### 7. Relações quebrando queries PostgREST

**Causa**: `select` com relacionamento (ex.: `municipalities(name)`) quando o relacionamento não estava corretamente exposto pelo PostgREST.

**Solução**: priorizar `select` simples sem join até estabilizar a estrutura. Desacoplar o frontend do relacionamento em caso de instabilidade.

### 8. Limpeza de base global bloqueada por foreign keys

**Causa**: `TRUNCATE`/`DELETE` em `municipalities` falha porque `contacts`, `proposals` e outras tabelas referenciam a tabela.

**Regra**: antes de limpar bases globais, mapear FKs e avaliar impacto. Em produção, preferir substituição controlada à deleção cega.

---

## Email Marketing Module (complete, validated in production)

### Campaign wizard flow

4-step wizard at `/email/campaigns/[id]`:
1. **Editor** — subject (required), preheader, HTML/preview/plain-text tabs, variable hints
2. **Audience** — 7 filters (state, municipality, population range, department, strategic, min score, email search); live count via `GET /api/email/audiences/preview`
3. **Summary** — validation gate; continue disabled if not ready
4. **Send** — account selector, truncation warning, confirmation checkbox, `POST /api/email/campaigns/[id]/send`

Required `email_campaigns` columns:
```sql
subject TEXT, preheader TEXT, html_content TEXT, text_content TEXT,
audience_filters JSONB, sending_account_id UUID, sent_at TIMESTAMPTZ,
sent_count INT DEFAULT 0, failed_count INT DEFAULT 0
```

### Campaign send API (`POST /api/email/campaigns/[id]/send`)

- Rebuilds audience query from `audience_filters JSONB` (mirrors `/api/email/audiences/preview` logic)
- **Does NOT send immediately** — inserts all recipients into `email_job_queue` (no row limit)
- Updates campaign: `status='Agendada'`, `sending_account_id`
- Returns `{ queued, total }`
- Bloqueado se `emails_used >= emails_limit && extra_credits <= 0` → 402 com `{ error: 'limit_reached' }`

### Email job queue (`email_job_queue`)

Batched sending system — processes 100 emails/hour via cron.

```sql
-- Key columns
id uuid, campaign_id uuid, company_id uuid, sending_account_id uuid,
recipient_email text, recipient_name text, municipality text, state text,
status text DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
created_at timestamptz, sent_at timestamptz NULL
```

- **Queue processor** — `GET /api/email/queue/process` — fetches up to 100 `pending` rows, sends via nodemailer with tracking injection, marks `sent`/`failed`, increments `sent_count`/`failed_count` via `increment_campaign_counts` RPC, flips campaign to `status='Ativa'` when no pending jobs remain
- **Auth**: `Authorization: Bearer <CRON_SECRET>` header required
- **Supabase Edge Function** — `supabase/functions/process-email-queue/index.ts` — calls the queue processor endpoint; deployed to project `iqadumkswzemlvzuetsq`
- **Cron**: configured via `pg_cron` in Supabase at schedule `0 * * * *`

### Email tracking

Requires `email_events` table (run once in Supabase):
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

- **Open pixel** — `GET /api/email/track/open?campaign_id=&email=` — returns 1×1 transparent GIF, records `open` event. No auth. Fails silently.
- **Click redirect** — `GET /api/email/track/click?campaign_id=&email=&url=` — records `click` event, redirects 302 to destination. Validates `http/https` only to prevent open-redirect.
- **Tracking stats** — `GET /api/email/tracking-stats` — authenticated; aggregates unique opens/clicks per campaign in JS from `email_events`. Uses `createAdminClient` for the DB read (no SELECT RLS policy on `email_events` yet).
- Base URL for tracking links: `process.env.NEXT_PUBLIC_APP_URL` (fallback: `https://inteligencia-sooty.vercel.app`)

### SMTP account storage (`email_sending_accounts`)

- Isolated per company via RLS on `company_id`
- Password never stored in plain text — always encrypted before insert/update
- `smtp_password_encrypted` column stores the ciphertext; the column `smtp_password` does not exist
- PATCH (update) must only re-encrypt the password if a new one is provided; omit the field otherwise

Endpoints validados:
- `GET    /api/email/sending-accounts` → lista contas da empresa
- `POST   /api/email/sending-accounts` → cria conta (limite: 5 por empresa, via RPC atômica)
- `PATCH  /api/email/sending-accounts` → edita conta (senha: só recriptografa se informada)
- `DELETE /api/email/sending-accounts` → exclui conta
- `POST   /api/email/test-connection`  → testa SMTP via nodemailer; salva `last_tested_at` / `last_test_status` / `last_test_error`

### Encryption (`lib/security/email-settings-crypto.ts`)

- Algorithm: AES-256-GCM
- Key: env var `EMAIL_SETTINGS_ENCRYPTION_KEY` — hex string, exactly 64 chars (256 bits)
- Ciphertext format: `"iv:authTag:encryptedData"` (all hex-encoded, 3 partes separadas por ":")
- Functions: `encryptEmailSettingSecret(plainText)` / `decryptEmailSettingSecret(payload)`

### SMTP ports for Brazilian providers (email-ssl.com.br and similar)

- Port **465** — SSL/TLS (`smtp_secure: true`)
- Port **587** — STARTTLS (`smtp_secure: false`, `requireTLS: true`)
- Port **993** is IMAP — **never use it for SMTP sending**

---

## Fluxo de Signup e Pagamento

- Fluxo completo: `/signup` → `/signup/plan` → `/signup/payment` → webhook Asaas confirma → acesso liberado ao dashboard
- **Trial foi removido completamente** — status inicial da empresa ao cadastrar é `'pending'`, não `'active'`
- **Google OAuth removido do MVP** — apenas cadastro manual via formulário
- Acesso ao `/dashboard` só é liberado após `plan_id` ser preenchido na empresa (ocorre via webhook `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`)
- Dashboard layout redireciona para `/signup/plan?error=plan_required` se `plan_id === null`
- A coluna `trial_ends_at` permanece no banco mas não é mais usada pelo código

---

## Billing & Plans Module

### Plans (tabela `plans`)
3 planos ativos:
- Essencial: 10.000 emails/mês, 1 usuário, R$297/mês
- Profissional: 25.000 emails/mês, 3 usuários, R$497/mês
- Elite: 50.000 emails/mês, usuários ilimitados, R$797/mês

Pacote extra: 5.000 emails por R$80 (compra avulsa)

### Tabelas criadas
- `plans` — planos com preços e limites
- `subscriptions` — assinatura por empresa (status: pending/active/past_due/cancelled/expired)
- `email_credits` — pacotes extras comprados
- `billing_events` — log de webhooks Asaas

### Colunas adicionadas em `companies`
- `plan_id` (FK → plans)
- `emails_used_this_month` (resetado dia 1 de cada mês via pg_cron)
- `extra_credits_available`
- `trial_ends_at`
- `additional_users_count`

### Gateway de pagamento: Asaas

- Env vars obrigatórias: `ASAAS_API_KEY` (chave secreta) e `ASAAS_WEBHOOK_TOKEN` (validação do header `asaas-access-token`)
- `NEXT_PUBLIC_ASAAS_SANDBOX=true` → usa `https://sandbox.asaas.com/api/v3`
- `NEXT_PUBLIC_ASAAS_SANDBOX` vazio/false → usa `https://api.asaas.com/api/v3`
- Client: `lib/asaas.ts` — funções: `createAsaasCustomer`, `createAsaasSubscription`, `cancelAsaasSubscription`, `getAsaasSubscriptionPayments`, `getAsaasPaymentPixQrCode`
- Troca de plano: cancela assinatura anterior antes de criar nova; reutiliza `asaas_customer_id` existente
- Novos usuários não têm subscription → `POST /api/billing/subscribe` faz INSERT em vez de UPDATE

### Comportamento de `/api/billing/subscribe`

- Usa `.maybeSingle()` na busca de subscription existente (evita erro PGRST116 para novos usuários)
- `createAsaasCustomer` e `createAsaasSubscription` envolvidos em `try/catch` individuais — erros retornam JSON `{ error }` em vez de HTML 500
- Se `existingSub` existe: UPDATE; se não existe: INSERT com todos os campos
- Retorna `{ success, subscription_id, customer_id, status, pix?, boletoUrl? }`
- Para PIX: busca QR Code do primeiro pagamento via `getAsaasSubscriptionPayments` + `getAsaasPaymentPixQrCode`
- Para Boleto: retorna `bankSlipUrl` do primeiro pagamento

### Rotas de billing
- `POST /api/billing/subscribe` — cria cliente + assinatura no Asaas; suporta CREDIT_CARD, PIX e BOLETO
- `POST /api/billing/webhook` — recebe eventos Asaas (auth via `asaas-access-token` header); após `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` gera PDF do contrato e envia por email
- `POST /api/billing/cancel` — cancela assinatura no Asaas + atualiza `subscriptions.status='cancelled'`
- `POST /api/billing/extra-credits` — compra pacote extra
- `GET  /api/billing/subscription` — dados reais de assinatura da empresa
- `GET  /api/billing/reset-monthly` — rota de reset (não usada — reset via pg_cron)

### Controle de limite
- Disparo bloqueado em `POST /api/email/campaigns/[id]/send` se `emails_used >= emails_limit && extra_credits <= 0` → retorna 402 com `{ error: 'limit_reached', emails_used, emails_limit }`
- Frontend exibe `LimitReachedModal` (components/email/LimitReachedModal.tsx) com upsell
- Após cada envio bem-sucedido: RPC `increment_emails_used(company_id)` incrementa `emails_used_this_month`
- Reset mensal: pg_cron job 'reset-monthly-email-usage' roda `0 0 1 * *` via `reset_monthly_email_usage()` RPC

### RPCs adicionais
- `increment_emails_used(company_id_param)` — incrementa emails_used_this_month + 1
- `reset_monthly_email_usage()` — zera emails_used_this_month em todas as empresas

### Página de assinatura
- Settings → aba Assinatura: dados reais via GET /api/billing/subscription
- Exibe plano atual, barra de progresso, 3 cards de planos, pacote extra, botão Cancelar assinatura

---

## Sistema de Contrato

### Arquivos

- `lib/contract/contractText.ts` — texto completo do contrato CM Pro com placeholders `[RAZAO SOCIAL]`, `[CNPJ/CPF]`, etc.; exporta `CONTRACT_TEXT` (string), `CONTRACT_VERSION = 'v1.0'`, e `hashContract(text)` via `crypto.subtle` (SHA-256, retorna hex)
- `lib/contract/generatePdf.ts` — gera PDF com `pdf-lib`; substitui todos os placeholders com dados reais; paginação automática com footer em cada página; exporta `generateContractPdf(data: ContractData): Promise<Uint8Array>`
- `lib/contract/sendContractEmail.ts` — envia PDF via Resend (`RESEND_API_KEY`); assunto "Seu contrato CM Pro está disponível"; anexo `Contrato_CM_Pro.pdf`; exporta `sendContractEmail(toEmail, toName, pdfBytes)`

### Fluxo de aceitação (signup/payment)

- Usuário aceita o contrato no modal antes de finalizar o pagamento
- Ao aceitar: `hashContract(CONTRACT_TEXT)` + `CONTRACT_VERSION` salvos em `contract_acceptances` com `user_id`, `company_id`, `plan_id`, `ip_address`

### Fluxo de envio pós-pagamento (webhook)

- Após `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`: webhook gera PDF com dados reais da empresa/plano e envia por email via `sendContractEmail`
- Bloco é best-effort (`try/catch` não bloqueia o webhook)

---

## Security Rules (audited and enforced)

### Critical: Supabase client choice

**NEVER use `createAdminClient()` in authenticated routes.** It bypasses cookies/session so `auth.getUser()` returns null → always 401. Afeta qualquer rota que precise de `company_id` — se usar admin client, o RLS não filtra por empresa.

**ALWAYS use `createClient()` from `lib/supabase/server.ts`** in any route that requires a user session.

`createAdminClient()` is only valid for:
- Public server-to-server endpoints (`/api/pncp/sync`)
- Writing tracking events from unauthenticated callers (`/api/email/track/*`)
- Reading data that has no SELECT RLS policy when called from an **already-authenticated** API handler (auth via `createClient()` must happen first)

### Auth pattern for every authenticated route

```typescript
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
if (!profile?.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// Always validate the company_id from the profile against the resource being accessed:
if (profile.company_id !== body.company_id) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
```

### Auth pattern for platform_admin routes

```typescript
const authClient = await createClient();
const { data: { user } } = await authClient.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
if (!profile || profile.role !== 'platform_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const supabase = await createAdminClient(); // safe here — auth already verified
```

### Middleware protection (`middleware.ts`)

- `/api/pncp/sync` — bypassed (auth handled in handler via `Authorization: Bearer`)
- `/admin/*` — requires `platform_admin`; redirects to `/login` or `/dashboard`
- `/api/admin/*` — requires `platform_admin`; returns JSON 401/403 (no redirect for API routes)
- All other routes — `NextResponse.next()` (route handlers self-authenticate)

---

## Security Audit — March 2026

Full audit completed 2026-03-26. All critical and medium issues resolved.

### RLS policies (applied via migrations)

All tables use `USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))`:
- `contacts`, `contracts`, `deals`, `tasks`, `proposals`, `timeline_events`, `municipality_documents` — replaced unsafe `USING (true)` policies
- `email_job_queue` — policy added (table had RLS enabled but no policy)
- `email_campaigns`, `email_sending_accounts` — already correct (confirmed via Supabase)
- `email_events` — `FOR SELECT` scoped via `campaign_id IN (SELECT id FROM email_campaigns WHERE company_id = ...)`

### Atomic RPCs (all `SECURITY DEFINER`)

| Function | Purpose |
|----------|---------|
| `claim_email_jobs(p_limit)` | SELECT FOR UPDATE SKIP LOCKED — prevents two workers processing the same job |
| `finalize_campaign_if_complete(p_campaign_id)` | Atomic NOT EXISTS check + UPDATE — prevents premature `'Ativa'` status |
| `insert_sending_account_if_under_limit(...)` | Atomic COUNT + INSERT — enforces 5-account limit without race condition |
| `increment_campaign_counts(p_campaign_id, p_sent, p_failed)` | Atomic counter increment |

### Other fixes applied

- `track/click` and `track/open`: validate `campaign_id` exists before inserting `email_events`
- `send/route.ts`: explicit 403 if `sending_account_id.company_id ≠ session company_id`
- `sender-settings/route.ts`: `createAdminClient()` instantiated only after `auth.getUser()` succeeds
- `sending-accounts POST`: replaced non-atomic COUNT+INSERT with `insert_sending_account_if_under_limit` RPC

### Pending migrations (run in Supabase SQL Editor or `npx supabase db push`)

```
supabase/migrations/20260326_email_job_queue.sql
supabase/migrations/20260326_fix_rls_policies.sql
supabase/migrations/20260326_email_job_queue_claimed_at.sql
supabase/migrations/20260326_finalize_campaign_if_complete.sql
supabase/migrations/20260326_email_events_rls.sql
supabase/migrations/20260326_insert_sending_account_if_under_limit.sql
```

---

## Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_API_KEY
EMAIL_SETTINGS_ENCRYPTION_KEY   # 64-char hex, AES-256-GCM
NEXT_PUBLIC_APP_URL              # e.g. https://inteligencia-sooty.vercel.app
CRON_SECRET                      # Authorization: Bearer header — /api/pncp/sync e /api/email/queue/process
ASAAS_API_KEY
ASAAS_WEBHOOK_TOKEN
NEXT_PUBLIC_ASAAS_SANDBOX        # 'true' em desenvolvimento
RESEND_API_KEY                   # e-mails transacionais via Resend
```

## Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`). Use this for all imports.

---

## Pricing Plans

| Plan | Emails/mês | Usuários | Mensal | Semestral | Anual |
|------|-----------|----------|--------|-----------|-------|
| Essencial | 10.000 | 1 | R$297 | R$1.600 | R$2.800 |
| Profissional | 25.000 | 3 | R$497 | R$2.600 | R$4.800 |
| Elite | 50.000 | ilimitado | R$797 | R$4.200 | R$7.800 |

---

## Public Routes
- `/app` — página pública de apresentação do CM Pro (dark premium, estilo Starforge)
- `/login` — autenticação (dark premium, grid background, card glassmorphism)
- `/api/email/track/*` — tracking de emails (sem auth)
- `/api/pncp/sync` — sync PNCP (auth via Bearer)

---

## Build Rules

- **NEVER include `supabase/functions/` in the Next.js build.** The folder is excluded via `tsconfig.json` `exclude: ["supabase"]`. Edge Functions use Deno and are incompatible with the Next.js TypeScript compiler.
- Deploy Edge Functions only via `supabase functions deploy`, never via Next.js build pipeline.

### Regras Obrigatórias para Claude Code

- **Antes de qualquer commit: rodar `npm run build` localmente e confirmar que passou sem erros de tipo ou compilação.**
- **Nunca criar importações para arquivos que ainda não existem** — verificar se o arquivo existe antes de importar; se não existe, criar o arquivo no mesmo PR/commit.
- **Nunca remover importações sem investigar se a funcionalidade é intencional** — o padrão correto é criar o arquivo ausente, não remover o import.
- **Busca sistêmica**: ao corrigir um padrão (ex.: import quebrado, lógica inconsistente), buscar o mesmo padrão em todos os arquivos e corrigir tudo no mesmo commit.

---

## Database Fixes (março 2026)

- TRIM aplicado em `municipalities.state` — eliminados espaços extras que quebravam filtros de audiência
- Ordenação de municípios no dropdown corrigida para `.order('city')`
- `opportunities.company_id` tornado nullable (2026-03-31) — oportunidades são globais
- Índice composto `(company_id, external_id)` em `opportunities` removido (2026-03-31)

---

## Changelog

### Sessão 2026-04-13

- **Remoção do sistema de trial** — `status` inicial da empresa mudou para `'pending'`; `trial_ends_at` não é mais definido no signup; `dashboard/layout.tsx` redireciona para `/signup/plan` apenas com base em `plan_id === null`; `billing-guard.ts` bloqueia por `no_plan` em vez de `trial_expired`
- **Google OAuth removido do MVP** — botão "Continuar com Google" e separador removidos de `/signup`
- **Módulo de contrato PDF criado** — `lib/contract/contractText.ts`, `lib/contract/generatePdf.ts`, `lib/contract/sendContractEmail.ts`; contrato aceito no signup/payment salva hash+versão no banco; webhook Asaas gera e envia PDF após pagamento confirmado
- **Correções em `/api/billing/subscribe`** — `createAsaasCustomer` e `createAsaasSubscription` em `try/catch` individuais retornando JSON; `.single()` → `.maybeSingle()` na busca de subscription; INSERT para novos usuários sem subscription em vez de UPDATE silencioso
- **Logs de diagnóstico em `/api/auth/signup`** — quando email duplicado, loga presença em `auth.users` e `profiles`
- **Erro real exibido no frontend de `/signup/payment`** — `catch` do fetch mostra mensagem real do erro em vez de texto genérico
- **Deleção de usuário de teste** — `gaelmartinsdamico@gmail.com` removido de `auth.users`, `profiles`, `company_profiles` e `companies`
- **Campos de empresa consolidados na tela de pagamento** — Razão Social, CPF/CNPJ (com máscara), Endereço e Telefone tornados obrigatórios em `/signup/payment/page.tsx`; pré-preenchidos ao carregar via `companies`; `UPDATE companies` executado antes de chamar `/api/billing/subscribe`; botão "Finalizar assinatura" só habilitado com os 4 campos preenchidos + contrato aceito; campos removidos da tela `/signup/onboarding` (eram opcionais lá)

### Sessão 2026-04-10

- **Rastreamento de abertura e cliques por contato** — painel de detalhes em Estatísticas (`app/(dashboard)/email/estatisticas/page.tsx`): botão "Ver detalhes" abre tabela com todos os eventos `open`/`click` por e-mail, link clicado e data/hora; API `GET /api/email/tracking-stats?campaign_id=` retorna eventos individuais da `email_events`
- **Filtro de Região em Audiências e Campanhas** — `app/(dashboard)/email/audiences/page.tsx` e `app/(dashboard)/email/campaigns/[id]/page.tsx`: select com Norte, Nordeste, Centro-Oeste, Sudeste, Sul antes do filtro de Estado; limpa Estado ao trocar região; backend aplica `.in('state_source', states)` quando `region` é passado sem `state`
- **Filtro de Departamento sincronizado** — `DEPARTMENT_OPTIONS` atualizado nas duas telas com opções completas: Saúde, Educação, Compras / Licitação, Administração, Financeiro, Obras, Prefeito, Institucional
- **Melhoria no prompt de geração de proposta** (`app/api/intel/generate-proposal/route.ts`): `maxOutputTokens` 4096; linguagem formal Lei 14.133/2021; seção 4 de qualificação técnica argumentativa; seção 5 com valor unitário/total, prazo e condições de pagamento; fetch do edital via `official_url` (strip HTML, 3000 chars, `AbortSignal.timeout(10000)`, falha silenciosa)
- **Fix: rotas de cron adicionadas à lista pública do middleware** — `middleware.ts`: `/api/email/queue/process`, `/api/cron/trial-expiring`, `/api/pncp/scrape`, `/api/pncp/scores` adicionados ao bypass de autenticação
- **Fix: disparo imediato de emails** (`app/api/email/campaigns/[id]/send/route.ts`): após inserir jobs na fila, dispara `fetch` fire-and-forget para `/api/email/queue/process` com `Authorization: Bearer CRON_SECRET`; cron ajustado para plano Hobby (`0 6 * * *` em `vercel.json`)
- **Fix: runtime nodejs no processador de fila** (`app/api/email/queue/process/route.ts`): adicionados `export const runtime = 'nodejs'` e `export const dynamic = 'force-dynamic'` — sem isso o Vercel executava como Edge Function e nodemailer falhava
- **Fix: filtros de região e departamento na rota de disparo** (`app/api/email/campaigns/[id]/send/route.ts`): query de disparo alinhada com preview — filtros diretos, ordenação consistente
- **Fix: constraint `internal_status` atualizado** — migration `supabase/migrations/20260410_add_expired_to_internal_status_check.sql`: `'expired'` adicionado ao CHECK; resolvia PATCH 400 no `archiveExpiredOpportunities` do sync PNCP
- **Validação SPF/DKIM nas contas de envio** — novo endpoint `GET /api/email/check-dns`; coluna "Saúde" na listagem de contas (`app/(dashboard)/email/accounts/page.tsx`) com badges SPF/DKIM; alerta no passo de disparo de campanha; fix no SELECT das rotas GET e PATCH de `sending-accounts` para incluir `spf_status`, `dkim_status`, `dkim_selector`
- **Melhorias na listagem de campanhas** — exibe status, contagem de contatos, data de envio, ações e filtro por status
- **Campo Anotações em contatos** — migration `supabase/migrations/20260410_add_notes_to_contacts.sql`: `ADD COLUMN notes text NULL`; campo adicionado nos modais de criar e editar em `contacts/page.tsx` e `accounts/[id]/page.tsx`; exibido nos cards de contato com `line-clamp-2`
- **Fix: mapper de contatos** (`lib/mappers/contacts.ts`): campo `notes` adicionado ao mapper — sem isso era descartado silenciosamente antes de chegar à UI
- **Fix: `.limit(6000)` nas queries de prefeituras** — aplicado em `lib/services/municipalities.ts` (`getAllForSelect`) e diretamente em `email/audiences/page.tsx` e `email/campaigns/[id]/page.tsx`; ordenação padronizada para `.order('city', { ascending: true })`
- **Fix: `max_rows` do Supabase ajustado para 10000** via SQL no dashboard (`ALTER ROLE authenticator SET pgrst.db_max_rows = '10000'` + `NOTIFY pgrst, 'reload config'`)
- **Gmail cadastrado como conta de envio SMTP** — `smtp.gmail.com` porta 587 (STARTTLS); requer senha de app do Google
- **Webhook GitHub/Vercel recriado manualmente** — deploy automático restaurado via Settings → Git → Deploy Hooks no painel Vercel

### Sessão 2026-04-09

- **Rastreamento de abertura e cliques por contato** — painel de detalhes em Estatísticas (`app/(dashboard)/email/estatisticas/page.tsx`): botão "Ver detalhes" abre tabela com todos os eventos `open`/`click` por e-mail, link clicado e data/hora; API `GET /api/email/tracking-stats?campaign_id=` retorna eventos individuais da `email_events`
- **Filtro de Região em Audiências** — `app/(dashboard)/email/audiences/page.tsx` e `app/api/email/audiences/preview/route.ts`: select com Norte, Nordeste, Centro-Oeste, Sudeste, Sul antes do filtro de Estado; limpa Estado ao trocar região; backend aplica `.in('state_source', states)` quando `region` é passado sem `state`
- **Filtro de Região no fluxo de Campanhas** — `app/(dashboard)/email/campaigns/[id]/page.tsx`: mesmo comportamento da página de Audiências; `AudienceFilters` e `DEFAULT_AUDIENCE` atualizados com campo `region`; `filteredMunicipalities` e params da API atualizados
- **Filtro de Departamento sincronizado** — `DEPARTMENT_OPTIONS` em `app/(dashboard)/email/campaigns/[id]/page.tsx` atualizado com as opções completas: Saúde, Educação, Compras / Licitação, Administração, Financeiro, Obras, Prefeito, Institucional
- **Melhoria no prompt de geração de proposta** (`app/api/intel/generate-proposal/route.ts`): `maxOutputTokens` 4096; linguagem formal Lei 14.133/2021; seção 4 de qualificação técnica argumentativa com base no perfil consolidado; seção 5 com valor unitário/total, prazo e condições de pagamento; fetch do edital via `official_url` (strip HTML, 3000 chars, `AbortSignal.timeout(10000)`, falha silenciosa)
- **Fix: disparo imediato de emails** (`app/api/email/campaigns/[id]/send/route.ts`): após inserir jobs na fila, dispara `fetch` fire-and-forget para `/api/email/queue/process` com `Authorization: Bearer CRON_SECRET`; não bloqueia a resposta ao usuário
- **Fix: cron de fila de email** (`vercel.json`): `/api/email/queue/process` agendado a cada 5 minutos (`*/5 * * * *`)
- **Fix: runtime nodejs no processador de fila** (`app/api/email/queue/process/route.ts`): adicionados `export const runtime = 'nodejs'` e `export const dynamic = 'force-dynamic'` — sem isso o Vercel executava como Edge Function e nodemailer falhava
- **Sync PNCP via GitHub Actions** — `.github/workflows/sync.yml`: matrix com modalidades [6, 8, 1]; loop de paginação até 20 páginas; fetch direto da API PNCP no runner; POST para `/api/pncp/ingest`; job `recalcular-scores` encadeado
- **Rota `/api/pncp/ingest`** — POST autenticado via Bearer; aceita array de itens PNCP; batch upsert com `ON CONFLICT (external_id)`
- **Rotas `/api/pncp/sync`, `/api/pncp/scrape`, `/api/pncp/scores`** separadas com `maxDuration=60` cada; sync suporta `?modalidade=`, `?data_inicial=`, `?data_final=`

### Sessão 2026-04-01

- **Auditoria RLS — 12 tabelas protegidas**: `supabase/migrations/20260401_rls_missing_tables.sql` aplicado no Supabase
  - Isolamento por `company_id`: `company_profiles`, `company_catalogs`, `company_documents`, `ai_proposals`, `notifications`, `pipeline_stages`
  - Somente leitura autenticada: `municipalities`, `municipality_emails`, `municipality_emails_import`, `municipalities_import_log`, `sync_control`, `pncp_contratacoes`
- **Admin — Excluir Usuário**: `DELETE /api/admin/users/[id]/delete` + modal de confirmação na página de usuários
- **Admin — Excluir Empresa**: `DELETE /api/admin/companies/[id]/delete` + modal de confirmação na página de empresas

### Sessão 2026-03-31

- **PNCP sync — paginação completa**: loop até 50 páginas × 500 itens por modalidade (`app/api/pncp/sync/route.ts`)
- **PNCP sync — múltiplas modalidades**: modalidades 6 (Pregão), 8 (Dispensa), 1 (Concorrência)
- **PNCP sync — deduplicação global**: `external_id = pncpId` sem `company_id`; `ON CONFLICT (external_id)`; `opportunities.company_id` tornado nullable via migration
- **Fix `fallbackPlans`**: referência undefined removida em `settings/page.tsx` (substituída por `[]`)

### Sessão 2026-03-28

- **Login dark premium** — redesign com Sora + Outfit, grid background, halos radiais, card glassmorphism (`app/login/page.tsx`)
- **Esqueceu a senha** — modal no login + página `app/reset-password/page.tsx`; usa `supabase.auth.resetPasswordForEmail` + `updateUser`
- **Ciclo de vida de licitações vencidas** — `archiveExpiredOpportunities` (→ `expired`) + `deleteOldExpiredOpportunities` (30 dias) chamados no início de cada sync; pg_cron diário às 06h UTC
- **Templates de email por IA** — Gemini 2.5 Flash Lite gera 4 tipos (Prospecção, Relacionamento, Apresentação Comercial, Follow-up) com cache por perfil (`/api/email/templates/generate`)
- **Fix campanha nova** — não busca UUID `'new'` no banco; suporte a query params de template para popular `html_content` e `text_content`
- **Gerenciamento de usuários no admin** — convite real (`/api/admin/invite`), criação manual (`/api/admin/users/create`), resetar senha (`/api/admin/users/reset-password`), editar permissões (`/api/admin/users/update-role`), filtros por role
- **`profiles` table** — colunas confirmadas: `id, email, company_id, role, created_at` — sem `status`, sem `last_access`; todas as features dependentes dessas colunas removidas
- **Oportunidades PNCP globais** — removido `.eq('company_id', companyId)` de `getAll()` e `getStats()` em `lib/services/opportunities.ts`; licitações visíveis para todos os usuários
- **Sync PNCP ao criar empresa** — `createCompanyAction` dispara `GET /api/pncp/sync?company_id=` fire-and-forget; sync suporta `?company_id=` opcional
- **Dados falsos removidos**:
  - Dashboard: `salesPerformance` calculado de deals reais por mês; fallback de `recentOpportunities` removido; `activeTenders` conta `opportunities` reais
  - Funil: "Previsão (Mês)" → soma de deals Ganho no mês atual; "Taxa de Conversão" calculada de `columns`
  - Análise de Mercado: todos os hardcoded removidos; KPIs reais de `opportunities`; gráficos substituídos por "Em breve"
- **Perfil estratégico** — fallback entregue em branco para novos usuários (`lib/intel/services.ts`)
- **Validação de campanha** — aceita `html_content` OU `text_content` (não ambos obrigatórios)
- **Editor rico Tiptap** — `components/email/RichEmailEditor.tsx`; toolbar com variáveis `[Municipio]` `[Estado]`, negrito/itálico/sublinhado, link, listas, alinhamento, tabela 3×3; sincronizado com `html_content`
- **Settings** — carrega dados reais do usuário (email, role, empresa) via `auth.getUser()` + `profiles` + `companies`; avatar com iniciais; remove hardcoded "Ricardo Silva"
- **Histórico de email** — reescrito para `email_job_queue` com join em `email_campaigns(name, subject)`; filtros 7/30/90 dias; paginação 20/página; status badge
- **Admin: Logs do Sistema** — `app/(admin)/admin/logs/page.tsx`; tenta ler `audit_logs` (tabela ainda não existe — exibe estado vazio elegante); filtros de período e ação; paginação 50/página
- **Admin: Diagnóstico** — `app/(admin)/admin/diagnostico/page.tsx` + `GET /api/admin/diagnostics`; verifica conectividade Supabase, 6 env vars críticas (✅/❌ sem expor valores), jobs pendentes na fila de email, último sync PNCP
- **Google OAuth** — botão "Continuar com Google" em login e signup; `app/auth/callback/route.ts` provisiona empresa + perfil para novos usuários OAuth e redireciona para `/signup/onboarding`
- **Billing — troca de plano**: cancela assinatura anterior no Asaas antes de criar nova; reutiliza `asaas_customer_id`
- **Billing — cartão de crédito**: checkout transparente Asaas com campos `creditCard`, `creditCardHolderInfo`, `remoteIp`
- **Billing — cancelamento**: `POST /api/billing/cancel` + modal de confirmação em Settings
- **E-mails transacionais** (Resend): `sendWelcomeEmail` (signup), `sendPaymentConfirmedEmail` (webhook Asaas), `sendTrialExpiringEmail` (cron diário `/api/cron/trial-expiring`)
- **Mobile**: sidebar com CSS transform + overlay; stepper de campanha com `overflow-x-auto`; footer de navegação com `flex-wrap`
- **app/error.tsx** — global error boundary com reset
- **app/not-found.tsx** — 404 com link para /dashboard
- **app/(dashboard)/loading.tsx** — skeleton de 4 KPI cards + tabela
- **lib/fetch-client.ts** — `fetchWithAuth` com interceptação de 401 → redirect `/login?error=session_expired`
- **Admin: gestão de usuários** — convite, criação manual, reset de senha, edição de permissões
- **Admin: Ver Detalhes da Empresa** + `POST /api/admin/update-plan` — gestão de plano e suspensão

---

## Git Commits

- Never add "Co-Authored-By" tags in commit messages. Commits must have only one author.
- Do not include any Anthropic or Claude references in git commits.
- Never trigger `git push` or deploy directly — only make the code changes and commit locally.
