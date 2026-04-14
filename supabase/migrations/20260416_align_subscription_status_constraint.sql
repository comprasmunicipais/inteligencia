-- Align runtime and database contract for subscription statuses.
-- Normalized final set:
--   pending, active, past_due, cancelled, inactive

UPDATE public.subscriptions
SET status = 'pending'
WHERE status = 'trial';

UPDATE public.subscriptions
SET status = 'inactive'
WHERE status = 'expired';

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'inactive'));
