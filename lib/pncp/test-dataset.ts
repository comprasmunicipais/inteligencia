import { PNCPContratacao } from './types';

/**
 * Initial test dataset for incremental sync validation
 */
export const INITIAL_TEST_DATASET: PNCPContratacao[] = [
  {
    numeroControlePNCP: 'TEST-001/2024',
    orgaoEntidade: {
      cnpj: '00000000000100',
      razaoSocial: 'PREFEITURA DE TESTE A',
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
    processo: '101/2024',
    objeto: 'Aquisição de computadores para a rede municipal.',
    dataPublicacaoPncp: '2024-01-10T10:00:00Z',
    dataAtualizacao: '2024-01-10T10:00:00Z',
    valorEstimadoTotal: 50000.00,
    situacaoId: 1,
    situacaoNome: 'Publicado',
  },
  {
    numeroControlePNCP: 'TEST-002/2024',
    orgaoEntidade: {
      cnpj: '00000000000200',
      razaoSocial: 'PREFEITURA DE TESTE B',
      poderId: '1',
      esferaId: 'M',
    },
    unidadeOrgao: {
      ufSigla: 'RJ',
      municipioNome: 'Rio de Janeiro',
      codigoIbge: '3304557',
      nomeUnidade: 'SECRETARIA DE EDUCACAO',
    },
    modalidadeId: 5,
    modalidadeNome: 'Pregão Eletrônico',
    numeroCompra: '2',
    anoCompra: 2024,
    processo: '102/2024',
    objeto: 'Serviços de consultoria em tecnologia da informação.',
    dataPublicacaoPncp: '2024-01-12T14:00:00Z',
    dataAtualizacao: '2024-01-12T14:00:00Z',
    valorEstimadoTotal: 120000.00,
    situacaoId: 1,
    situacaoNome: 'Publicado',
  },
  {
    numeroControlePNCP: 'TEST-003/2024',
    orgaoEntidade: {
      cnpj: '00000000000300',
      razaoSocial: 'PREFEITURA DE TESTE C',
      poderId: '1',
      esferaId: 'M',
    },
    unidadeOrgao: {
      ufSigla: 'PR',
      municipioNome: 'Curitiba',
      codigoIbge: '4106902',
      nomeUnidade: 'SECRETARIA DE OBRAS',
    },
    modalidadeId: 5,
    modalidadeNome: 'Pregão Eletrônico',
    numeroCompra: '3',
    anoCompra: 2024,
    processo: '103/2024',
    objeto: 'Manutenção de sistemas de iluminação pública.',
    dataPublicacaoPncp: '2024-01-15T09:00:00Z',
    dataAtualizacao: '2024-01-15T09:00:00Z',
    valorEstimadoTotal: 85000.00,
    situacaoId: 1,
    situacaoNome: 'Publicado',
  }
];

// Mutable dataset for simulation
let currentTestDataset: PNCPContratacao[] = [...INITIAL_TEST_DATASET];

/**
 * Gets the current test dataset
 */
export function getTestDataset(): PNCPContratacao[] {
  return currentTestDataset;
}

/**
 * Simulates a new opportunity being added to the PNCP
 */
export function simulateNewOpportunity() {
  const newId = `TEST-NEW-${Math.floor(Math.random() * 1000)}/2024`;
  const now = new Date().toISOString();
  
  const newOpp: PNCPContratacao = {
    numeroControlePNCP: newId,
    orgaoEntidade: {
      cnpj: '00000000000400',
      razaoSocial: 'PREFEITURA DE TESTE D',
      poderId: '1',
      esferaId: 'M',
    },
    unidadeOrgao: {
      ufSigla: 'SC',
      municipioNome: 'Florianópolis',
      codigoIbge: '4205407',
      nomeUnidade: 'SECRETARIA DE TURISMO',
    },
    modalidadeId: 5,
    modalidadeNome: 'Pregão Eletrônico',
    numeroCompra: '4',
    anoCompra: 2024,
    processo: '104/2024',
    objeto: 'Desenvolvimento de portal turístico municipal.',
    dataPublicacaoPncp: now,
    dataAtualizacao: now,
    valorEstimadoTotal: 45000.00,
    situacaoId: 1,
    situacaoNome: 'Publicado',
  };

  currentTestDataset.push(newOpp);
  return newOpp;
}

/**
 * Simulates an update to all existing opportunities in the test dataset
 */
export function simulateUpdateOpportunities() {
  const now = new Date().toISOString();
  currentTestDataset.forEach(opp => {
    opp.dataAtualizacao = now;
    if (!opp.objeto.includes('(Atualizado)')) {
      opp.objeto += ' (Atualizado)';
    }
  });
  return currentTestDataset;
}

/**
 * Resets the test dataset to its initial state
 */
export function resetTestDataset() {
  currentTestDataset = [...INITIAL_TEST_DATASET];
}
