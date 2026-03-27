ALTER TABLE public.companies
  ADD COLUMN plan_id uuid NULL REFERENCES public.plans(id),
  ADD COLUMN emails_used_this_month int NOT NULL DEFAULT 0,
  ADD COLUMN extra_credits_available int NOT NULL DEFAULT 0,
  ADD COLUMN trial_ends_at timestamptz NULL,
  ADD COLUMN additional_users_count int NOT NULL DEFAULT 0;
