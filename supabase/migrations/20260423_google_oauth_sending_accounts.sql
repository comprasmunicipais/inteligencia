-- Add Google OAuth support to email_sending_accounts without changing SMTP rows.
ALTER TABLE public.email_sending_accounts
  ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'smtp',
  ADD COLUMN IF NOT EXISTS oauth_provider text NULL,
  ADD COLUMN IF NOT EXISTS oauth_email text NULL,
  ADD COLUMN IF NOT EXISTS oauth_access_token_encrypted text NULL,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token_encrypted text NULL,
  ADD COLUMN IF NOT EXISTS oauth_token_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS oauth_scope text NULL,
  ADD COLUMN IF NOT EXISTS oauth_status text NULL,
  ADD COLUMN IF NOT EXISTS oauth_last_error text NULL;

ALTER TABLE public.email_sending_accounts
  ALTER COLUMN provider_type SET DEFAULT 'smtp';

UPDATE public.email_sending_accounts
SET provider_type = 'smtp'
WHERE provider_type IS NULL;

ALTER TABLE public.email_sending_accounts
  DROP CONSTRAINT IF EXISTS email_sending_accounts_provider_type_check,
  DROP CONSTRAINT IF EXISTS email_sending_accounts_oauth_provider_check,
  DROP CONSTRAINT IF EXISTS email_sending_accounts_oauth_status_check;

ALTER TABLE public.email_sending_accounts
  ADD CONSTRAINT email_sending_accounts_provider_type_check
    CHECK (provider_type IN ('smtp', 'google_oauth')),
  ADD CONSTRAINT email_sending_accounts_oauth_provider_check
    CHECK (oauth_provider IS NULL OR oauth_provider IN ('google')),
  ADD CONSTRAINT email_sending_accounts_oauth_status_check
    CHECK (oauth_status IS NULL OR oauth_status IN ('active', 'revoked', 'error'));

-- OAuth accounts do not use SMTP credentials. Existing SMTP validation remains in app code.
ALTER TABLE public.email_sending_accounts
  ALTER COLUMN smtp_host DROP NOT NULL,
  ALTER COLUMN smtp_port DROP NOT NULL,
  ALTER COLUMN smtp_secure DROP NOT NULL,
  ALTER COLUMN smtp_username DROP NOT NULL,
  ALTER COLUMN smtp_password_encrypted DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_sending_accounts_google_oauth_email_idx
  ON public.email_sending_accounts (company_id, oauth_provider, lower(oauth_email))
  WHERE provider_type = 'google_oauth' AND oauth_email IS NOT NULL;
