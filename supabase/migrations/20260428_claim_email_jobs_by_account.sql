CREATE OR REPLACE FUNCTION public.claim_email_jobs(
  p_limit int DEFAULT 100,
  p_sending_account_id uuid DEFAULT NULL
)
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
    WHERE  (
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
      AND sending_account_id = p_sending_account_id
    ORDER  BY created_at ASC
    LIMIT  p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
