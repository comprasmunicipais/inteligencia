ALTER TABLE public.email_job_queue
  ADD COLUMN IF NOT EXISTS failure_reason text NULL,
  ADD COLUMN IF NOT EXISTS failure_code text NULL,
  ADD COLUMN IF NOT EXISTS smtp_response text NULL,
  ADD COLUMN IF NOT EXISTS smtp_response_code integer NULL;
