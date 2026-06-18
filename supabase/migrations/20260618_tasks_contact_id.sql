ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS contact_id uuid NULL REFERENCES public.contacts(id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_contact_due_date
ON public.tasks (company_id, contact_id, due_date);
