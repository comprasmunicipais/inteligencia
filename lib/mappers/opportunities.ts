import { OpportunityDTO } from '../types/dtos';
import { OpportunityEntity } from '../types/entities';

export function mapOpportunityToDTO(data: any): OpportunityDTO {
  const municipalityName = Array.isArray(data.municipalities)
    ? data.municipalities[0]?.name || null
    : data.municipalities?.name || null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    organ_name: data.organ_name,
    modality: data.modality,
    situation: data.situation,
    city: data.city,
    state: data.state,
    estimated_value: data.estimated_value,
    opening_date: data.opening_date,
    publication_date: data.publication_date,
    official_url: data.official_url,
    match_score: data.match_score || 0,
    match_reason: data.match_reason,
    internal_status: data.internal_status,
    municipality_id: data.municipality_id,
    municipality_name: municipalityName,
  };
}
