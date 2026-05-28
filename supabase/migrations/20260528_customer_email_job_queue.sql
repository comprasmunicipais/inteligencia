CREATE TABLE IF NOT EXISTS public.customer_email_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL
    REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  sending_account_id uuid NOT NULL
    REFERENCES public.email_sending_accounts(id) ON DELETE CASCADE,
  customer_contact_list_id uuid NOT NULL
    REFERENCES public.customer_contact_lists(id) ON DELETE CASCADE,
  customer_contact_id uuid NULL
    REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text NULL,
  company_name text NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  failure_reason text NULL,
  failure_code text NULL,
  smtp_response text NULL,
  smtp_response_code integer NULL,
  next_attempt_at timestamptz NULL,
  claimed_at timestamptz NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_email_job_queue_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  CONSTRAINT customer_email_job_queue_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT customer_email_job_queue_campaign_recipient_unique
    UNIQUE (campaign_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_company_campaign_idx
  ON public.customer_email_job_queue (company_id, campaign_id);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_status_next_attempt_created_idx
  ON public.customer_email_job_queue (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_account_status_next_attempt_idx
  ON public.customer_email_job_queue (sending_account_id, status, next_attempt_at);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_campaign_status_idx
  ON public.customer_email_job_queue (campaign_id, status);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_claimed_at_idx
  ON public.customer_email_job_queue (claimed_at);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_contact_list_idx
  ON public.customer_email_job_queue (customer_contact_list_id);

CREATE INDEX IF NOT EXISTS customer_email_job_queue_contact_idx
  ON public.customer_email_job_queue (customer_contact_id);

ALTER TABLE public.customer_email_job_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_email_job_queue_company_isolation" ON public.customer_email_job_queue;
CREATE POLICY "customer_email_job_queue_company_isolation"
  ON public.customer_email_job_queue
  FOR ALL
  TO authenticated
  USING (
    company_id = (
      SELECT company_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.customer_email_job_queue
  TO authenticated;

GRANT ALL
  ON public.customer_email_job_queue
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_customer_email_jobs(
  p_limit integer DEFAULT 100,
  p_sending_account_id uuid DEFAULT NULL
)
RETURNS SETOF public.customer_email_job_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.customer_email_job_queue
  SET
    status = 'processing',
    claimed_at = now(),
    updated_at = now()
  WHERE id IN (
    SELECT id
    FROM public.customer_email_job_queue
    WHERE (
      (
        status = 'pending'
        AND (
          next_attempt_at IS NULL
          OR next_attempt_at <= now()
        )
      )
      OR (
        status = 'processing'
        AND claimed_at IS NOT NULL
        AND claimed_at < now() - interval '10 minutes'
      )
    )
    AND (
      p_sending_account_id IS NULL
      OR sending_account_id = p_sending_account_id
    )
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.finalize_customer_campaign_if_complete(
  p_campaign_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_campaigns
  SET
    status = 'Enviada',
    sent_at = now()
  WHERE id = p_campaign_id
    AND status IN ('Agendada', 'Ativa')
    AND NOT EXISTS (
      SELECT 1
      FROM public.customer_email_job_queue
      WHERE campaign_id = p_campaign_id
        AND status IN ('pending', 'processing')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_customer_email_jobs(integer, uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_customer_campaign_if_complete(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_customer_email_jobs(integer, uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.finalize_customer_campaign_if_complete(uuid)
  TO service_role;
