-- Migration: add SPF/DKIM status columns to email_sending_accounts
ALTER TABLE public.email_sending_accounts
  ADD COLUMN IF NOT EXISTS spf_status    boolean NULL,
  ADD COLUMN IF NOT EXISTS dkim_status   boolean NULL,
  ADD COLUMN IF NOT EXISTS dkim_selector text    NULL;
