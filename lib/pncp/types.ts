/**
 * PNCP API Types based on ManualPNCPAPIConsultasVerso1.0
 */

export interface PNCPContratacao {
  numeroControlePNCP: string;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  unidadeOrgao: {
    ufSigla: string;
    municipioNome: string;
    codigoIbge: string;
    nomeUnidade: string;
  };
  modalidadeId: number;
  modalidadeNome: string;
  numeroCompra: string;
  anoCompra: number;
  processo: string;
  objeto: string;
  informacaoComplementar?: string;
  modoDisputaId?: number;
  modoDisputaNome?: string;
  tipoInstrumentoId?: number;
  tipoInstrumentoNome?: string;
  amparoLegal?: {
    codigo: string;
    nome: string;
  };
  dataPublicacaoPncp: string;
  dataAtualizacao: string;
  valorEstimadoTotal: number;
  valorHomologadoTotal?: number;
  situacaoId: number;
  situacaoNome: string;
  linkSistemaOrigem?: string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
}

export interface PNCPResponse<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
}

export interface PNCPQueryParams {
  dataInicial?: string;
  dataFinal?: string;
  codigoModalidade?: number;
  uf?: string;
  municipio?: string;
  cnpj?: string;
  pagina?: number;
  tamanhoPagina?: number;
}
