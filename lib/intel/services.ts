import { Opportunity, SyncJob, CompanyIntelligenceProfile, CompanyOpportunityMatch, PriorityLevel } from './types';
import { generateId } from '@/lib/utils';
import { pncpSyncService } from '@/lib/pncp/sync';
import { MatchEngine } from '@/lib/intelligence/match-engine';
import { simulateNewOpportunity, resetTestDataset, simulateUpdateOpportunities } from '@/lib/pncp/test-dataset';
import { createClient } from '@/lib/supabase/client';

// In-memory storage for matches
let companyMatches: CompanyOpportunityMatch[] = [];

/**
 * Incremental Sync Logic
 * companyId deve ser passado pelo caller — nunca hardcoded
 */
export async function runIncrementalSync(companyId: string) {
  const job = await pncpSyncService.runSync({ mode: 'production' });
  await calculateMatchesForCompany(companyId);
  return job;
}

export async function runTestSync(companyId: string) {
  const job = await pncpSyncService.runSync({ mode: 'test' });
  await calculateMatchesForCompany(companyId);
  return job;
}

export async function runResilienceTest(companyId: string) {
  const job = await pncpSyncService.runSync({ mode: 'resilience' });
  await calculateMatchesForCompany(companyId);
  return job;
}

export function triggerNewTestOpportunity() {
  return simulateNewOpportunity();
}

export function triggerUpdateTestOpportunities() {
  return simulateUpdateOpportunities();
}

export function resetSyncTest() {
  resetTestDataset();
  pncpSyncService.resetBase();
  companyMatches = [];
}

/**
 * Profile Management — Supabase
 */
export async function saveCompanyProfile(profile: CompanyIntelligenceProfile): Promise<void> {
  const supabase = createClient();

  const payload = {
    company_id: profile.company_id,
    company_name: profile.company_name,
    main_segment: profile.main_segment,
    subsegments: profile.subsegments,
    target_categories: profile.target_categories,
    positive_keywords: profile.positive_keywords,
    negative_keywords: profile.negative_keywords,
    preferred_buyers: profile.preferred_buyers,
    excluded_buyers: profile.excluded_buyers,
    min_ticket: profile.min_ticket,
    max_ticket: profile.max_ticket,
    target_states: profile.target_states || [],
    target_municipalities: profile.target_municipalities,
    target_modalities: profile.target_modalities || [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('company_profiles')
    .upsert(payload, { onConflict: 'company_id' });

  if (error) {
    console.error('SUPABASE ERROR (saveCompanyProfile):', error);
    throw error;
  }

  // Recalculate matches after saving
  await calculateMatchesForCompany(profile.company_id);
}

export async function getCompanyProfile(companyId: string): Promise<CompanyIntelligenceProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    // Return default profile if none exists
    return {
      id: generateId(),
      company_id: companyId,
      company_name: '',
      main_segment: '',
      subsegments: '',
      target_categories: '',
      target_modalities: [],
      target_states: [],
      target_municipalities: '',
      min_ticket: 0,
      max_ticket: 0,
      positive_keywords: '',
      negative_keywords: '',
      preferred_buyers: '',
      excluded_buyers: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    company_id: data.company_id,
    company_name: data.company_name || '',
    main_segment: data.main_segment || '',
    subsegments: data.subsegments || '',
    target_categories: data.target_categories || '',
    positive_keywords: data.positive_keywords || '',
    negative_keywords: data.negative_keywords || '',
    preferred_buyers: data.preferred_buyers || '',
    excluded_buyers: data.excluded_buyers || '',
    min_ticket: data.min_ticket || 0,
    max_ticket: data.max_ticket || 0,
    target_states: data.target_states || [],
    target_municipalities: data.target_municipalities || '',
    target_modalities: data.target_modalities || [],
    notes: data.notes || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Match Calculation Logic
 */
export async function calculateMatchesForCompany(companyId: string) {
  const profile = await getCompanyProfile(companyId);
  if (!profile) return;

  const centralOpportunities = pncpSyncService.getOpportunities();
  const newMatches: CompanyOpportunityMatch[] = [];

  for (const opp of centralOpportunities) {
    const existingMatch = companyMatches.find(m => m.company_id === companyId && m.opportunity_id === opp.id);
    const matchData = MatchEngine.calculateMatch(opp, profile);

    if (existingMatch) {
      matchData.status = existingMatch.status;
      matchData.id = existingMatch.id;
    }

    newMatches.push(matchData);
  }

  companyMatches = newMatches;
}

/**
 * Getters for UI
 */
export function getSyncJobs() {
  return pncpSyncService.getJobs();
}

export function getCentralOpportunities() {
  return pncpSyncService.getOpportunities();
}

export function getCompanyMatches(companyId: string) {
  return companyMatches.filter(m => m.company_id === companyId);
}

export async function addManualOpportunity(opportunity: Opportunity, companyId: string) {
  const newOpp = {
    ...opportunity,
    id: opportunity.id || generateId(),
    source: 'manual' as any,
    numero_controle_pncp: `MANUAL-${Date.now()}`,
    source_external_id: `MANUAL-${Date.now()}`,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_updated_at: new Date().toISOString(),
  };

  pncpSyncService.addManualOpportunity(newOpp);
  await calculateMatchesForCompany(companyId);
  return newOpp;
}
