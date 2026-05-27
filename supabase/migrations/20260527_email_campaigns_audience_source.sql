ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS audience_source text NULL;

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS customer_contact_list_id uuid NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_campaigns TO authenticated;
GRANT ALL ON TABLE public.email_campaigns TO service_role;
