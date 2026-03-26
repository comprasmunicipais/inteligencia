-- Migration: add RLS SELECT policy for email_events
-- email_events has no company_id column — isolation is via campaign_id FK

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento por empresa email_events"
  ON email_events FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );
