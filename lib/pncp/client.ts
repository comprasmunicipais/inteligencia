import { PNCPResponse, PNCPContratacao, PNCPQueryParams } from './types';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta';

/**
 * PNCP API Client
 * Responsible for making requests to the PNCP API
 */
export class PNCPClient {
  /**
   * Fetches contracts by publication date
   * Endpoint: /v1/contratacoes/publicacao
   */
  async getContratacoesByPublicacao(params: PNCPQueryParams): Promise<PNCPResponse<PNCPContratacao>> {
    const url = new URL(`${PNCP_BASE_URL}/v1/contratacoes/publicacao`);
    
    if (params.dataInicial) url.searchParams.append('dataInicial', params.dataInicial.replace(/-/g, ''));
    if (params.dataFinal) url.searchParams.append('dataFinal', params.dataFinal.replace(/-/g, ''));
    if (params.uf) url.searchParams.append('uf', params.uf);
    if (params.pagina) url.searchParams.append('pagina', params.pagina.toString());
    if (params.tamanhoPagina) url.searchParams.append('tamanhoPagina', params.tamanhoPagina.toString());

    try {
      // In a real environment, this might need to be called from a server-side context
      // to avoid CORS issues or use a proxy.
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`PNCP API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching from PNCP:', error);
      // Fallback for demo/development if API is unreachable
      return this.getMockResponse(params.pagina || 1);
    }
  }

  /**
   * Mock response for development/fallback
   */
  private getMockResponse(pagina: number): PNCPResponse<PNCPContratacao> {
    const mockData: PNCPContratacao[] = [
      {
        numeroControlePNCP: `00000000000100-1-000001/2024`,
        orgaoEntidade: {
          cnpj: '00000000000100',
          razaoSocial: 'PREFEITURA MUNICIPAL DE EXEMPLO',
          poderId: '1',
          esferaId: 'M',
        },
        unidadeOrgao: {
          ufSigla: 'SP',
          municipioNome: 'São Paulo',
          codigoIbge: '3550308',
          nomeUnidade: 'SECRETARIA DE SAUDE',
        },
        modalidadeId: 5,
        modalidadeNome: 'Pregão Eletrônico',
        numeroCompra: '1',
        anoCompra: 2024,
        processo: '123/2024',
        objeto: 'Aquisição de medicamentos para a rede municipal de saúde.',
        dataPublicacaoPncp: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString(),
        valorEstimadoTotal: 150000.00,
        situacaoId: 1,
        situacaoNome: 'Publicado',
      }
    ];

    return {
      data: mockData,
      totalRegistros: 1,
      totalPaginas: 1,
      numeroPagina: pagina,
      paginasRestantes: 0,
    };
  }
}

export const pncpClient = new PNCPClient();
