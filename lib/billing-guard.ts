import { createAdminClient } from '@/lib/supabase/server';

type AccessResult =
  | { blocked: false }
  | { blocked: true; reason: 'past_due' | 'suspended' | 'trial_expired' };

/**
 * Checks whether a company is allowed to perform billable actions.
 * Uses createAdminClient() to bypass RLS — call only from authenticated server routes.
 */
export async function checkCompanyAccess(companyId: string): Promise<AccessResult> {
  const supabase = await createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('status, trial_ends_at, plan_id')
    .eq('id', companyId)
    .single();

  if (!company) {
    // Fail open — if company can't be fetched, let the route handle it
    return { blocked: false };
  }

  if (company.status === 'past_due') {
    return { blocked: true, reason: 'past_due' };
  }

  if (company.status === 'suspended') {
    return { blocked: true, reason: 'suspended' };
  }

  if (company.trial_ends_at && new Date(company.trial_ends_at) < new Date()) {
    return { blocked: true, reason: 'trial_expired' };
  }

  return { blocked: false };
}
