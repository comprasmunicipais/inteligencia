ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS deal_id uuid NULL REFERENCES public.deals(id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_deal_due_date
ON public.tasks (company_id, deal_id, due_date);
