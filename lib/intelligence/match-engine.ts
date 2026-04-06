import { Opportunity, CompanyIntelligenceProfile, CompanyOpportunityMatch, PriorityLevel } from '@/lib/intel/types';
import { generateId } from '@/lib/utils';

/**
 * Match Engine Service
 * Calculates adherence score between a company profile and an opportunity
 */
export class MatchEngine {
  /**
   * Calculates match for a single opportunity
   */
  static calculateMatch(
    opportunity: Opportunity, 
    profile: CompanyIntelligenceProfile
  ): CompanyOpportunityMatch {
    let score = 0;
    const reasons: string[] = [];
    const flags: string[] = [];

    // 1. Region Match (+15)
    const stateMatch = profile.target_states?.includes(opportunity.state) ||
                       profile.target_states?.includes('Nacional');
    if (stateMatch) {
      score += 15;
      reasons.push('Localização estratégica (Estado alvo).');
    }

    // 2. Modality Match (+15)
    const modalityMatch = profile.target_modalities?.includes(opportunity.modality_name);
    if (modalityMatch) {
      score += 15;
      reasons.push('Modalidade de contratação preferencial.');
    }

    // 3. Value Match (+10)
    const withinTicket = opportunity.estimated_value >= profile.min_ticket &&
                         opportunity.estimated_value <= profile.max_ticket;
    if (withinTicket) {
      score += 10;
      reasons.push('Valor estimado dentro da faixa de ticket ideal.');
    } else if (opportunity.estimated_value > profile.max_ticket) {
      flags.push('high_value');
      reasons.push('Valor acima do ticket máximo definido.');
    }

    // 4. Positive Keywords (+25)
    const positiveKeywords = profile.positive_keywords?.split(',').map(k => k.trim().toLowerCase()) || [];
    const foundPositive = positiveKeywords.filter(k =>
      k && (opportunity.title.toLowerCase().includes(k) || opportunity.description.toLowerCase().includes(k))
    );
    if (foundPositive.length > 0) {
      score += 25;
      reasons.push(`Contém termos de interesse: ${foundPositive.join(', ')}.`);
    }

    // 5. Negative Keywords (-20)
    const negativeKeywords = profile.negative_keywords?.split(',').map(k => k.trim().toLowerCase()) || [];
    const foundNegative = negativeKeywords.filter(k =>
      k && (opportunity.title.toLowerCase().includes(k) || opportunity.description.toLowerCase().includes(k))
    );
    if (foundNegative.length > 0) {
      score -= 20;
      flags.push('negative_keywords');
      reasons.push(`Contém termos evitados: ${foundNegative.join(', ')}.`);
    }

    // 6. Preferred Buyers (+10)
    const preferredBuyers = profile.preferred_buyers?.split(',').map(b => b.trim().toLowerCase()) || [];
    const isPreferredBuyer = preferredBuyers.some(b => b && opportunity.buyer_name.toLowerCase().includes(b));
    if (isPreferredBuyer) {
      score += 10;
      reasons.push('Órgão comprador classificado como prioritário.');
    }

    // 7. Excluded Buyers (-30)
    const excludedBuyers = profile.excluded_buyers?.split(',').map(b => b.trim().toLowerCase()) || [];
    const isExcludedBuyer = excludedBuyers.some(b => b && opportunity.buyer_name.toLowerCase().includes(b));
    if (isExcludedBuyer) {
      score -= 30;
      flags.push('excluded_buyer');
      reasons.push('Órgão comprador na lista de exclusão.');
    }

    // 8. PNCP Categories (+35)
    const targetCategories = profile.target_categories?.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean) || [];
    const titleDesc = `${opportunity.title || ''} ${opportunity.description || ''}`.toLowerCase();
    const foundCategories = targetCategories.filter((c: string) => titleDesc.includes(c));
    if (foundCategories.length > 0) {
      score += 35;
      reasons.push(`Categoria de interesse identificada: ${foundCategories.join(', ')}.`);
    }

    // Normalize score 0-100
    const finalScore = Math.max(0, Math.min(100, score));

    // Define Priority
    let priority: PriorityLevel = 'low';
    if (finalScore >= 80) priority = 'critical';
    else if (finalScore >= 50) priority = 'high';
    else if (finalScore >= 30) priority = 'medium';

    const now = new Date().toISOString();

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
