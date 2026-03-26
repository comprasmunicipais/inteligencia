-- Migration: add claimed_at column to email_job_queue for atomic job claiming
ALTER TABLE public.email_job_queue
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;

-- Index to make claim queries efficient
CREATE INDEX IF NOT EXISTS email_job_queue_claim_idx
  ON email_job_queue (status, created_at)
  WHERE status = 'pending';

-- RPC: atomically claim up to p_limit pending jobs using SELECT FOR UPDATE SKIP LOCKED
-- Returns the claimed rows so the caller can process them without re-querying.
CREATE OR REPLACE FUNCTION public.claim_email_jobs(p_limit int DEFAULT 100)
RETURNS SETOF email_job_queue
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE email_job_queue
  SET
    status     = 'processing',
    claimed_at = now()
  WHERE id IN (
    SELECT id
    FROM   email_job_queue
    WHERE  status = 'pending'
    ORDER  BY created_at ASC
    LIMIT  p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
