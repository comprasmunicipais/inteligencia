const itens = [
  { item: 'papel A4', segmento: 'papelaria' },
  { item: 'caneta esferográfica azul', segmento: 'papelaria' },
  { item: 'toner impressora HP', segmento: 'informática e suprimentos' },
  { item: 'luva de procedimento', segmento: 'saúde' },
  { item: 'máscara descartável', segmento: 'saúde' },
  { item: 'álcool 70', segmento: 'saúde' },
  { item: 'manutenção de ar-condicionado', segmento: 'serviços de manutenção' },
  { item: 'limpeza predial', segmento: 'serviços terceirizados' },
  { item: 'dedetização', segmento: 'serviços terceirizados' },
];

const relatorio = itens.map(({ item, segmento }) => ({
  item,
  segmento,
  fonte: 'a_definir',
  status: 'pendente_validacao',
  observacoes: 'Estrutura inicial para validacao exploratoria de fontes publicas.',
}));

console.log(JSON.stringify(relatorio, null, 2));
