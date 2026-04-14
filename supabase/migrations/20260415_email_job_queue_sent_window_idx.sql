-- Support SMTP sending limit enforcement by account and time window.
-- Speeds up counts over sent jobs filtered by sending_account_id and sent_at.

CREATE INDEX IF NOT EXISTS email_job_queue_sent_account_window_idx
  ON public.email_job_queue (sending_account_id, sent_at)
  WHERE status = 'sent';
