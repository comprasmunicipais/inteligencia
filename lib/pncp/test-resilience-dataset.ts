/**
 * Resilience Test Dataset
 * Simulates various API failure scenarios and payload changes
 */
export const RESILIENCE_TEST_DATASET = [
  // Scenario A: Optional fields missing
  {
    numeroControlePNCP: 'RES-001/2024',
    orgaoEntidade: {
      cnpj: '00000000000100',
      razaoSocial: 'ORGAO TESTE A',
    },
    unidadeOrgao: {
      ufSigla: 'SP',
      municipioNome: 'São Paulo',
    },
    objeto: 'Objeto com campos opcionais ausentes (sem modalidade, sem valor)',
    dataPublicacaoPncp: '2024-02-01T10:00:00Z',
    dataAtualizacao: '2024-02-01T10:00:00Z',
    // Missing: modalidadeNome, valorEstimadoTotal, etc.
  },

  // Scenario B: Mandatory field with different name (Simulated via mapper logic)
  {
    // numeroControlePNCP is missing, but we have an alias
    numero_controle_pncp: 'RES-002/2024', 
    orgaoEntidade: {
      cnpj: '00000000000200',
      razaoSocial: 'ORGAO TESTE B',
    },
    unidadeOrgao: {
      ufSigla: 'RJ',
      municipioNome: 'Rio de Janeiro',
    },
    objeto: 'Objeto com identificador em campo alternativo',
    dataPublicacaoPncp: '2024-02-02T10:00:00Z',
    dataAtualizacao: '2024-02-02T10:00:00Z',
  },

  // Scenario C: Invalid types
  {
    numeroControlePNCP: 'RES-003/2024',
    orgaoEntidade: {
      cnpj: '00000000000300',
      razaoSocial: 'ORGAO TESTE C',
    },
    unidadeOrgao: {
      ufSigla: 'PR',
      municipioNome: 'Curitiba',
    },
    objeto: 'Objeto com tipos inválidos (valor como string, data inválida)',
    valorEstimadoTotal: "NÃO É UM NÚMERO",
    dataPublicacaoPncp: "DATA-INVALIDA",
    dataAtualizacao: '2024-02-03T10:00:00Z',
  },

  // Scenario D: Incomplete record (Missing object/title)
  {
    numeroControlePNCP: 'RES-004/2024',
    orgaoEntidade: {
      cnpj: '00000000000400',
      razaoSocial: 'ORGAO TESTE D',
    },
    unidadeOrgao: {
      ufSigla: 'MG',
      municipioNome: 'Belo Horizonte',
    },
    // Missing: objeto
    dataPublicacaoPncp: '2024-02-04T10:00:00Z',
    dataAtualizacao: '2024-02-04T10:00:00Z',
  },

  // Scenario E: Extra unexpected fields
  {
    numeroControlePNCP: 'RES-005/2024',
    orgaoEntidade: {
      cnpj: '00000000000500',
      razaoSocial: 'ORGAO TESTE E',
    },
    unidadeOrgao: {
      ufSigla: 'RS',
      municipioNome: 'Porto Alegre',
    },
    objeto: 'Objeto com campos extras inesperados',
    campo_novo_futuro: 'Valor importante que não conhecemos ainda',
    metadados_adicionais: {
      versao_api: '2.0',
      prioridade_governo: 'alta'
    },
    dataPublicacaoPncp: '2024-02-05T10:00:00Z',
    dataAtualizacao: '2024-02-05T10:00:00Z',
  },

  // Scenario F: Totally invalid record (No ID)
  {
    objeto: 'Registro totalmente inválido (sem ID)',
    orgaoEntidade: { razaoSocial: 'ORGAO F' }
  }
];
