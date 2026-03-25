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
- `app/api/` — API routes; only `/api/pncp/sync` is public — all others require auth (enforced in `middleware.ts`)
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

Sync is triggered via `POST /api/pncp/sync` (cron-friendly, unauthenticated). Scores are recalculated via `POST /api/intel/recalculate-scores`.

### AI Integration

Uses `@google/genai` (Gemini) for:
- Proposal generation (`/api/intel/generate-proposal`)
- Profile consolidation (`/api/intel/consolidate-profile`)
Requires `GEMINI_API_KEY` environment variable.

### Email System

Dual sending path:
- **Nodemailer** — SMTP via configurable sending accounts (credentials encrypted with `lib/security/email-settings-crypto.ts`)
- **Resend** — Alternative delivery provider

#### Email module details

**Supabase client in API routes — critical rule:**
Always use `createClient()` (from `lib/supabase/server.ts`) in authenticated API routes. `createAdminClient()` bypasses RLS and must only be used for server-to-server operations that explicitly need it (e.g. public sync endpoints). Using `createAdminClient` in authenticated routes breaks session-based auth.

**SMTP account storage (`email_sending_accounts`):**
- Isolated per company via RLS on `company_id`
- Password never stored in plain text — always encrypted before insert/update
- `smtp_password_encrypted` column stores the ciphertext; the column `smtp_password` does not exist
- PATCH (update) must only re-encrypt the password if a new one is provided; omit the field otherwise

**Encryption (`lib/security/email-settings-crypto.ts`):**
- Algorithm: AES-256-GCM
- Key: env var `EMAIL_SETTINGS_ENCRYPTION_KEY` — hex string, exactly 64 chars (256 bits)
- Ciphertext format: `"iv:authTag:encryptedData"` (all hex-encoded)
- Functions: `encryptEmailSettingSecret(plainText)` / `decryptEmailSettingSecret(payload)`

**SMTP endpoint (`POST /api/email/test-connection`):**
- Uses nodemailer `transporter.verify()` to test credentials
- Saves `last_tested_at`, `last_test_status` (`'success'` | `'error'`), `last_test_error` on the account row
- Sanitizes error messages before storing (redacts password/username tokens)
- Timeouts: `connectionTimeout=15000`, `greetingTimeout=15000`, `socketTimeout=20000`

**SMTP ports for email-ssl.com.br (and similar Brazilian providers):**
- Port **465** — SSL/TLS (`smtp_secure: true`)
- Port **587** — STARTTLS (`smtp_secure: false`, `requireTLS: true`)
- Port **993** is IMAP — never use it for SMTP sending

**Campaign send API (`POST /api/email/campaigns/[id]/send`):**
- Rebuilds audience query from `audience_filters JSONB` stored on the campaign
- Caps send at `min(hourly_limit, 2000)` rows
- Substitutes `[Nome]`, `[Municipio]`, `[Estado]` in subject, HTML, and plain text
- Updates campaign: `status='Ativa'`, `sent_at`, `sent_count`, `failed_count`, `sending_account_id`

### Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`). Use this for all imports.
