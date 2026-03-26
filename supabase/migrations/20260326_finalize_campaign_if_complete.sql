-- Migration: atomic RPC to finalize campaign when all jobs are done
-- Replaces the non-atomic COUNT + UPDATE pattern in the queue processor.

CREATE OR REPLACE FUNCTION public.finalize_campaign_if_complete(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_campaigns
  SET
    status   = 'Ativa',
    sent_at  = now()
  WHERE id = p_campaign_id
    AND status = 'Agendada'
    AND NOT EXISTS (
      SELECT 1
      FROM   email_job_queue
      WHERE  campaign_id = p_campaign_id
        AND  status IN ('pending', 'processing')
    );
END;
$$;
