import { PNCPContratacao } from './types';
import { Opportunity } from '@/lib/intel/types';
import { generateId } from '@/lib/utils';

/**
 * PNCP Mapper
 * Transforms PNCP API data into the local Opportunity format
 */
export class PNCPMapper {
  /**
   * Maps a single PNCP contract to an Opportunity
   */
  static toOpportunity(pncp: any): Opportunity {
    const now = new Date().toISOString();
    
    // Defensive ID extraction (Scenario B: Aliases)
    const externalId = pncp.numeroControlePNCP || pncp.numeroControlePncp || pncp.numero_controle_pncp;
    
    if (!externalId) {
      throw new Error('Identificador único (numeroControlePNCP) ausente no payload.');
    }

    // Defensive Title/Object (Scenario D)
    const title = pncp.objeto || pncp.titulo || 'Objeto não informado';

    // Defensive Value (Scenario C: Type normalization)
    let estimatedValue = pncp.valorEstimadoTotal;
    if (typeof estimatedValue === 'string') {
      const parsed = parseFloat(estimatedValue.replace(/[^\d.-]/g, ''));
      estimatedValue = isNaN(parsed) ? null : parsed;
    }

    // Defensive Dates (Scenario C)
    const isValidDate = (d: any) => d && !isNaN(Date.parse(d));
    const publishDate = isValidDate(pncp.dataPublicacaoPncp) ? pncp.dataPublicacaoPncp : now;
    const updatedAt = isValidDate(pncp.dataAtualizacao) ? pncp.dataAtualizacao : now;

    return {
      id: generateId(),
      source: 'pncp',
      source_external_id: externalId,
      numero_controle_pncp: externalId,
      source_url: `https://pncp.gov.br/app/editais/${externalId}`,
      title: title,
      description: pncp.informacaoComplementar || title,
      buyer_name: pncp.orgaoEntidade?.razaoSocial || 'Órgão não informado',
      buyer_cnpj: pncp.orgaoEntidade?.cnpj || '00000000000000',
      buyer_type: pncp.orgaoEntidade?.esferaId === 'M' ? 'Municipal' : 
                  pncp.orgaoEntidade?.esferaId === 'E' ? 'Estadual' : 'Federal',
      municipality: pncp.unidadeOrgao?.municipioNome || 'Não informado',
      state: pncp.unidadeOrgao?.ufSigla || 'EX',
      ibge_code: pncp.unidadeOrgao?.codigoIbge,
      modality_id: pncp.modalidadeId?.toString() || '0',
      modality_name: pncp.modalidadeNome || 'Não informada',
      category: pncp.modalidadeNome || 'Outros',
      dispute_mode_id: pncp.modoDisputaId?.toString(),
      dispute_mode_name: pncp.modoDisputaNome,
      instrument_type_id: pncp.tipoInstrumentoId?.toString(),
      instrument_type_name: pncp.tipoInstrumentoNome,
      legal_basis_code: pncp.amparoLegal?.codigo,
      legal_basis_name: pncp.amparoLegal?.nome,
      estimated_value: estimatedValue,
      homologated_value: pncp.valorHomologadoTotal,
      publish_date: publishDate,
      proposal_open_date: pncp.dataAberturaProposta,
      proposal_close_date: pncp.dataEncerramentoProposta,
      deadline_date: pncp.dataEncerramentoProposta || pncp.dataAberturaProposta || publishDate,
      status: 'active',
      source_created_at: publishDate,
      source_updated_at: updatedAt,
      imported_at: now,
      updated_at: now,
      raw_payload: pncp,
      is_active: true,
    };
  }
}
