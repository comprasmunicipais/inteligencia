import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type TaskReminderCandidate = {
  id: string;
  company_id: string;
  owner_user_id: string | null;
  title: string;
  due_date: string | null;
};

function formatReminderTime(dueDate: string | null): string {
  if (!dueDate) return '--:--';

  return new Date(dueDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function normalizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now = new Date();
  const nextThirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);

  const result = {
    checked: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, company_id, owner_user_id, title, due_date')
    .eq('status', 'pendente')
    .not('owner_user_id', 'is', null)
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', nextThirtyMinutes.toISOString())
    .order('due_date', { ascending: true });

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  for (const task of (tasks || []) as TaskReminderCandidate[]) {
    result.checked++;

    if (!task.owner_user_id || !task.due_date) {
      result.skipped++;
      continue;
    }

    const { data: reminder, error: reminderError } = await supabase
      .from('task_reminders')
      .insert({
        task_id: task.id,
        company_id: task.company_id,
        user_id: task.owner_user_id,
        reminder_type: 'due_30m',
        scheduled_for: task.due_date,
      })
      .select('id')
      .single();

    if (reminderError) {
      if (reminderError.code === '23505') {
        result.skipped++;
        continue;
      }

      result.errors++;
      continue;
    }

    try {
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          company_id: task.company_id,
          user_id: task.owner_user_id,
          type: 'task_due_soon',
          title: 'Próxima ação vencendo em breve',
          message: `A ação "${task.title}" vence às ${formatReminderTime(task.due_date)}.`,
          read: false,
        })
        .select('id')
        .single();

      if (notificationError || !notification?.id) {
        throw new Error(notificationError?.message || 'Falha ao criar notification.');
      }

      const { error: updateError } = await supabase
        .from('task_reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          notification_id: notification.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      result.created++;
    } catch (error) {
      result.errors++;

      await supabase
        .from('task_reminders')
        .update({
          status: 'error',
          error_message: normalizeErrorMessage(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);
    }
  }

  return NextResponse.json(result);
}
