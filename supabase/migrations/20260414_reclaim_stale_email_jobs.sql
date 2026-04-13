-- Reclaim stale email jobs that were left in processing by a crashed worker.
-- Jobs claimed more than 10 minutes ago can be reclaimed by a new processor run.

CREATE INDEX IF NOT EXISTS email_job_queue_processing_claim_idx
  ON public.email_job_queue (claimed_at)
  WHERE status = 'processing';

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
       OR (
         status = 'processing'
         AND claimed_at IS NOT NULL
         AND claimed_at < now() - interval '10 minutes'
       )
    ORDER  BY created_at ASC
    LIMIT  p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
