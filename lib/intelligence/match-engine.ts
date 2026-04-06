import { Opportunity, CompanyIntelligenceProfile, CompanyOpportunityMatch, PriorityLevel } from '@/lib/intel/types';
import { generateId } from '@/lib/utils';

/**
 * Match Engine Service
 * Calculates adherence score between a company profile and an opportunity
 */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const partialMatch = (text: string, term: string): boolean => {
  if (!term || term.length < 3) return false;
  if (text.includes(term)) return true;
  if (term.length >= 6) {
    const stem = term.slice(0, Math.floor(term.length * 0.85));
    return text.includes(stem);
  }
  return false;
};

export class MatchEngine {
  /**
   * Calculates match for a single opportunity
   */
  static calculateMatch(
    opportunity: Opportunity,
    profile: CompanyIntelligenceProfile
  ): CompanyOpportunityMatch {
    const titleDesc = normalize(`${opportunity.title || ''} ${opportunity.description || ''}`);

    // Gate de produto obrigatório
    const targetCategories = (profile.target_categories || '')
      .split(',')
      .map((c: string) => normalize(c.trim()))
      .filter(Boolean);

    const positiveKeywords = (profile.positive_keywords || '')
      .split(',')
      .map((k: string) => normalize(k.trim()))
      .filter(Boolean);

    const categoryHit = targetCategories.some((c: string) => partialMatch(titleDesc, c));
    const keywordHit = positiveKeywords.some((k: string) => partialMatch(titleDesc, k));

    const flags: string[] = [];
    const now = new Date().toISOString();

    if (!categoryHit && !keywordHit) {
      return {
        id: generateId(),
        company_id: profile.company_id,
        opportunity_id: opportunity.id,
        match_score: 0,
        match_reason: 'Produto/segmento da empresa não identificado na licitação.',
        priority_level: 'low',
        flags,
        status: 'new',
        created_at: now,
        updated_at: now,
      };
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Categorias PNCP (+50)
    const foundCategories = targetCategories.filter((c: string) => partialMatch(titleDesc, c));
    if (foundCategories.length > 0) {
      score += 50;
      reasons.push(`Categoria de interesse identificada: ${foundCategories.join(', ')}.`);
    }

    // 2. Keywords positivas (+20)
    const foundPositive = positiveKeywords.filter((k: string) => partialMatch(titleDesc, k));
    if (foundPositive.length > 0) {
      score += 20;
      reasons.push(`Contém termos de interesse: ${foundPositive.join(', ')}.`);
    }

    // 3. Estado prioritário (+15)
    const stateMatch = profile.target_states?.includes(opportunity.state) ||
                       profile.target_states?.includes('Nacional');
    if (stateMatch) {
      score += 15;
      reasons.push('Localização estratégica (Estado alvo).');
    }

    // 4. Modalidade (+10)
    const modalityMatch = profile.target_modalities?.some(
      (m: string) => normalize(opportunity.modality_name || '').includes(normalize(m))
    );
    if (modalityMatch) {
      score += 10;
      reasons.push('Modalidade de contratação preferencial.');
    }

    // 5. Ticket no range (+10)
    const withinTicket = opportunity.estimated_value >= profile.min_ticket &&
                         opportunity.estimated_value <= profile.max_ticket;
    if (withinTicket) {
      score += 10;
      reasons.push('Valor estimado dentro da faixa de ticket ideal.');
    } else if (opportunity.estimated_value > profile.max_ticket) {
      flags.push('high_value');
      reasons.push('Valor acima do ticket máximo definido.');
    }

    // 6. Órgão prioritário (+10)
    const preferredBuyers = (profile.preferred_buyers || '')
      .split(',')
      .map((b: string) => normalize(b.trim()))
      .filter(Boolean);
    const organName = normalize(opportunity.buyer_name || '');
    if (preferredBuyers.some((b: string) => organName.includes(b))) {
      score += 10;
      reasons.push('Órgão comprador classificado como prioritário.');
    }

    // 7. Keywords negativas (-20)
    const negativeKeywords = (profile.negative_keywords || '')
      .split(',')
      .map((k: string) => normalize(k.trim()))
      .filter(Boolean);
    const foundNegative = negativeKeywords.filter((k: string) => partialMatch(titleDesc, k));
    if (foundNegative.length > 0) {
      score -= 20;
      flags.push('negative_keywords');
      reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
    }

    // 8. Órgão excluído (-30)
    const excludedBuyers = (profile.excluded_buyers || '')
      .split(',')
      .map((b: string) => normalize(b.trim()))
      .filter(Boolean);
    if (excludedBuyers.some((b: string) => organName.includes(b))) {
      score -= 30;
      flags.push('excluded_buyer');
      reasons.push('Órgão comprador na lista de exclusão.');
    }

    const finalScore = Math.max(0, Math.min(100, score));

    let priority: PriorityLevel = 'low';
    if (finalScore >= 80) priority = 'critical';
    else if (finalScore >= 50) priority = 'high';
    else if (finalScore >= 30) priority = 'medium';

    return {
      id: generateId(),
      company_id: profile.company_id,
      opportunity_id: opportunity.id,
      match_score: finalScore,
      match_reason: reasons.length > 0 ? reasons.join(' ') : 'Baixa correlação detectada com o perfil estratégico.',
      priority_level: priority,
      flags,
      status: 'new',
      created_at: now,
      updated_at: now,
    };
  }
}
