CREATE TABLE IF NOT EXISTS public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  reminder_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz NULL,
  status text NOT NULL DEFAULT 'pending',
  notification_id uuid NULL REFERENCES public.notifications(id),
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_reminders_reminder_type_check CHECK (reminder_type IN ('due_30m')),
  CONSTRAINT task_reminders_status_check CHECK (status IN ('pending', 'sent', 'error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_reminders_task_type_unique
ON public.task_reminders (task_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_task_reminders_company_user_status
ON public.task_reminders (company_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_task_reminders_status_scheduled_for
ON public.task_reminders (status, scheduled_for);
