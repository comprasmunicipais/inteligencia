-- Migration: create email_job_queue table for batched email sending
CREATE TABLE IF NOT EXISTS public.email_job_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid        NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  company_id          uuid        NOT NULL,
  sending_account_id  uuid        NOT NULL,
  recipient_email     text        NOT NULL,
  recipient_name      text        NOT NULL DEFAULT '',
  municipality        text        NOT NULL DEFAULT '',
  state               text        NOT NULL DEFAULT '',
  status              text        NOT NULL DEFAULT 'pending',
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz NULL
);

CREATE INDEX ON email_job_queue(campaign_id);
CREATE INDEX ON email_job_queue(status, created_at);

ALTER TABLE email_job_queue ENABLE ROW LEVEL SECURITY;

-- RPC used by queue processor to safely increment campaign counters
CREATE OR REPLACE FUNCTION public.increment_campaign_counts(
  p_campaign_id uuid,
  p_sent        int,
  p_failed      int
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE email_campaigns
  SET
    sent_count   = COALESCE(sent_count,   0) + p_sent,
    failed_count = COALESCE(failed_count, 0) + p_failed
  WHERE id = p_campaign_id;
$$;
