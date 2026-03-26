# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run clean    # Clean Next.js build cache
```

No test runner is configured in this project.

## Architecture

**Next.js 15 full-stack B2B platform** for Brazilian public procurement intelligence (PNCP). Multi-tenant SaaS with role-based access: `platform_admin`, `company_admin`, `user`.

### Route Structure

- `app/(dashboard)/` — Authenticated user area (CRM, email marketing, intelligence, settings)
- `app/(admin)/admin/` — Platform admin area (companies, municipalities, users, system health)
- `app/api/` — API routes; `/api/pncp/sync` is the only public endpoint — all others require auth
- `app/login/` — Auth entry point

### Data Layer

**Supabase** (PostgreSQL + RLS) via two client modes:
- `lib/supabase/client.ts` — Browser-side client
- `lib/supabase/server.ts` — Server-side client (for Server Components and API routes)

Always use the server client in API routes and Server Components. RLS policies enforce tenant isolation automatically.

### Service Layer Pattern

`lib/services/` contains all business logic as plain async functions. Pages and API routes call these functions — there is no shared state or class instances. Mappers in `lib/mappers/` convert between database rows and UI types.

### Intelligence Engine

The core feature: matches government procurement opportunities against company profiles.
- `lib/intelligence/` — Match scoring engine
- `lib/intel/` — Types and service layer for opportunity/profile management
- `lib/pncp/` — PNCP API client, data mapper, and sync logic

Sync is triggered via `GET /api/pncp/sync` (cron-friendly; auth via `Authorization: Bearer <CRON_SECRET>` header). Scores are recalculated via `POST /api/intel/recalculate-scores`.

### AI Integration

Uses Gemini (`@google/genai`) for:
- Proposal generation (`/api/intel/generate-proposal`)
- Profile consolidation (`/api/intel/consolidate-profile`)
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

### Encryption (`lib/security/email-settings-crypto.ts`)

- Algorithm: AES-256-GCM
- Key: env var `EMAIL_SETTINGS_ENCRYPTION_KEY` — hex string, exactly 64 chars (256 bits)
- Ciphertext format: `"iv:authTag:encryptedData"` (all hex-encoded)
- Functions: `encryptEmailSettingSecret(plainText)` / `decryptEmailSettingSecret(payload)`

### SMTP test endpoint (`POST /api/email/test-connection`)

- Uses nodemailer `transporter.verify()` to test credentials
- Saves `last_tested_at`, `last_test_status` (`'success'` | `'error'`), `last_test_error` on the account row
- Sanitizes error messages before storing (redacts password/username tokens)
- Timeouts: `connectionTimeout=15000`, `greetingTimeout=15000`, `socketTimeout=20000`

### SMTP ports for Brazilian providers (email-ssl.com.br and similar)

- Port **465** — SSL/TLS (`smtp_secure: true`)
- Port **587** — STARTTLS (`smtp_secure: false`, `requireTLS: true`)
- Port **993** is IMAP — never use it for SMTP sending

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

## Security Rules (audited and enforced)

### Critical: Supabase client choice

**NEVER use `createAdminClient()` in authenticated routes.** It bypasses cookies/session so `auth.getUser()` returns null → always 401.

**ALWAYS use `createClient()` from `lib/supabase/server.ts`** in any route that requires a user session.

`createAdminClient()` is only valid for:
- Public server-to-server endpoints (`/api/pncp/sync`)
- Writing tracking events from unauthenticated callers (`/api/email/track/*`)
- Reading data that has no SELECT RLS policy when called from an already-authenticated API handler

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

## Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_API_KEY
EMAIL_SETTINGS_ENCRYPTION_KEY   # 64-char hex, AES-256-GCM
NEXT_PUBLIC_APP_URL              # e.g. https://inteligencia-sooty.vercel.app
CRON_SECRET                      # passed as Authorization: Bearer header to /api/pncp/sync
```

## Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`). Use this for all imports.

---

## Pricing Plans

| Plan | Emails/month |
|------|-------------|
| Standard | 10,000 |
| Pro | 20,000 |
| Excellence | 50,000 |

---

## Build Rules

- **NEVER include `supabase/functions/` in the Next.js build.** The folder is excluded via `tsconfig.json` `exclude: ["supabase"]`. Edge Functions use Deno and are incompatible with the Next.js TypeScript compiler.
- Deploy Edge Functions only via `supabase functions deploy`, never via Next.js build pipeline.
