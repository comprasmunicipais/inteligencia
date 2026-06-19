ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_owner_due_date
ON public.tasks (company_id, owner_user_id, due_date);
