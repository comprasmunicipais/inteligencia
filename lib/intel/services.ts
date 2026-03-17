import { Opportunity, SyncJob, CompanyIntelligenceProfile, CompanyOpportunityMatch, PriorityLevel } from './types';
import { generateId } from '@/lib/utils';
import { pncpSyncService } from '@/lib/pncp/sync';
import { MatchEngine } from '@/lib/intelligence/match-engine';
import { simulateNewOpportunity, resetTestDataset, simulateUpdateOpportunities } from '@/lib/pncp/test-dataset';

// In-memory storage for matches (this stays here for now as it's company-specific)
let companyMatches: CompanyOpportunityMatch[] = [];

/**
 * Incremental Sync Logic - Facade to pncpSyncService
 */
export async function runIncrementalSync() {
  const job = await pncpSyncService.runSync({ mode: 'production' });
  // After sync, trigger match calculation for current company
  await calculateMatchesForCompany('current-company-id');
  return job;
}

/**
 * Test Sync Logic
 */
export async function runTestSync() {
  const job = await pncpSyncService.runSync({ mode: 'test' });
  await calculateMatchesForCompany('current-company-id');
  return job;
}

export async function runResilienceTest() {
  const job = await pncpSyncService.runSync({ mode: 'resilience' });
  await calculateMatchesForCompany('current-company-id');
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
 * Profile Management
 */
export function saveCompanyProfile(profile: CompanyIntelligenceProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('intel_profile', JSON.stringify(profile));
    // Trigger recalculation after saving profile
    calculateMatchesForCompany(profile.company_id);
  }
}

export function getCompanyProfile(companyId: string): CompanyIntelligenceProfile | null {
  if (typeof window !== 'undefined') {
    const profileStr = localStorage.getItem('intel_profile');
    if (profileStr) {
      return JSON.parse(profileStr);
    }
  }
  
  // Default profile if none exists
  return {
    id: generateId(),
    company_id: companyId,
    company_name: 'Minha Empresa',
    main_segment: 'Tecnologia da Informação',
    subsegments: 'Software as a Service (SaaS), Consultoria de TI',
    target_categories: 'Software, Serviços de TI, Equipamentos de Informática',
    target_modalities: ['Pregão Eletrônico', 'Dispensa de Licitação'],
    target_states: ['SP', 'PR', 'SC', 'RS', 'DF'],
    target_municipalities: 'Curitiba, São Paulo, Florianópolis',
    min_ticket: 50000,
    max_ticket: 5000000,
    positive_keywords: 'software, desenvolvimento, consultoria, licença, suporte',
    negative_keywords: 'hardware, manutenção predial, limpeza, segurança',
    preferred_buyers: 'Prefeitura, Tribunal, Secretaria de Saúde',
    excluded_buyers: 'Exército, Marinha',
    notes: 'Perfil estratégico focado em expansão no Sul e Sudeste.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Match Calculation Logic
 */
export async function calculateMatchesForCompany(companyId: string) {
  const profile = getCompanyProfile(companyId);
  if (!profile) return;

  const centralOpportunities = pncpSyncService.getOpportunities();
  const newMatches: CompanyOpportunityMatch[] = [];

  // Process each opportunity in the central base
  for (const opp of centralOpportunities) {
    const existingMatch = companyMatches.find(m => m.company_id === companyId && m.opportunity_id === opp.id);
    
    const matchData = MatchEngine.calculateMatch(opp, profile);
    
    // Preserve status if it was already modified (saved, dismissed, etc.)
    if (existingMatch) {
      matchData.status = existingMatch.status;
      matchData.id = existingMatch.id;
    }

    newMatches.push(matchData);
  }

  // Update in-memory storage
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

export async function addManualOpportunity(opportunity: Opportunity) {
  // In a real app, this would save to Supabase
  // For now, we add to the central base in pncpSyncService
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

  // We need a way to push to centralOpportunities in pncpSyncService
  // Since it's a private variable in that module, we'll add a method there
  pncpSyncService.addManualOpportunity(newOpp);
  
  // Recalculate matches for the current company
  await calculateMatchesForCompany('current-company-id');
  
  return newOpp;
}

// Initialize with some mock data if empty
if (typeof window !== 'undefined') {
  const initSync = async () => {
    const opps = pncpSyncService.getOpportunities();
    if (opps.length === 0) {
      await pncpSyncService.runSync();
    } else {
      await calculateMatchesForCompany('current-company-id');
    }
  };
  initSync();
}


