import { createServerClient } from '@supabase/ssr';

export type AccessReason =
  | 'granted'
  | 'no_company'
  | 'company_pending'
  | 'company_past_due'
  | 'company_cancelled'
  | 'company_inactive'
  | 'company_suspended'
  | 'company_invalid'
  | 'no_plan'
  | 'no_subscription'
  | 'subscription_pending'
  | 'subscription_past_due'
  | 'subscription_cancelled'
  | 'subscription_inactive'
  | 'subscription_invalid';

export type AccessDecision = {
  allowed: boolean;
  reason: AccessReason;
};

type AccessEvaluationInput = {
  companyStatus?: string | null;
  planId?: string | null;
  subscriptionStatus?: string | null;
};

export function evaluateCompanyAccess({
  companyStatus,
  planId,
  subscriptionStatus,
}: AccessEvaluationInput): AccessDecision {
  switch (companyStatus) {
    case 'active':
      break;
    case 'pending':
      return { allowed: false, reason: 'company_pending' };
    case 'past_due':
      return { allowed: false, reason: 'company_past_due' };
    case 'cancelled':
      return { allowed: false, reason: 'company_cancelled' };
    case 'inactive':
      return { allowed: false, reason: 'company_inactive' };
    case 'suspended':
      return { allowed: false, reason: 'company_suspended' };
    case null:
    case undefined:
    case '':
      return { allowed: false, reason: 'company_invalid' };
    default:
      return { allowed: false, reason: 'company_invalid' };
  }

  if (!planId) {
    return { allowed: false, reason: 'no_plan' };
  }

  switch (subscriptionStatus) {
    case 'active':
      return { allowed: true, reason: 'granted' };
    case 'pending':
      return { allowed: false, reason: 'subscription_pending' };
    case 'past_due':
      return { allowed: false, reason: 'subscription_past_due' };
    case 'cancelled':
      return { allowed: false, reason: 'subscription_cancelled' };
    case 'inactive':
      return { allowed: false, reason: 'subscription_inactive' };
    case null:
    case undefined:
    case '':
      return { allowed: false, reason: 'no_subscription' };
    default:
      return { allowed: false, reason: 'subscription_invalid' };
  }
}

type AccessResult =
  | { blocked: false }
  | { blocked: true; reason: Exclude<AccessReason, 'granted'> };

/**
 * Checks whether a company is allowed to perform billable actions.
 * Uses createAdminClient() to bypass RLS — call only from authenticated server routes.
 */
export async function checkCompanyAccess(companyId: string): Promise<AccessResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op
        },
      },
    }
  );

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('status, plan_id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { blocked: true, reason: 'no_company' };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('company_id', companyId)
    .maybeSingle();

  if (subscriptionError) {
    return { blocked: true, reason: 'subscription_invalid' };
  }

  const decision = evaluateCompanyAccess({
    companyStatus: company.status,
    planId: company.plan_id,
    subscriptionStatus: subscription?.status ?? null,
  });

  if (decision.reason === 'granted') {
    return { blocked: false };
  }

  return { blocked: true, reason: decision.reason };
}
