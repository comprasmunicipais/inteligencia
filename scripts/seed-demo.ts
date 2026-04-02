// Seed script para popular a empresa demo com dados fictícios realistas (contexto B2G).
//
// Execução:
//   npx tsx --env-file=.env.local scripts/seed-demo.ts
//
// Pré-requisito: .env.local com SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL
// O script carrega .env.local automaticamente via dotenv (veja import abaixo).
//
// ATENÇÃO: só insere dados para a empresa demo. Nunca toca em outros tenants.
// É idempotente: aborta se já existirem contatos cadastrados para a demo.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEMO_COMPANY_ID = 'e4b60595-2a42-4c2a-aa61-ebfb52cfb50d'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── IDs de municípios reais já existentes na tabela municipalities ─────────

const MUNS = {
  campinas:       { id: '3f54bb8f-3ed4-4bfd-8b02-477ff1579501', city: 'Campinas',             state: 'SP' },
  ribeirao:       { id: '508002f6-6e1e-4514-bd88-f3ed5d40a9eb', city: 'Ribeirão Preto',       state: 'SP' },
  sorocaba:       { id: '5ab3af92-0ebd-4a97-b653-d3961ede32b7', city: 'Sorocaba',             state: 'SP' },
  sjc:            { id: 'eceb7b1c-bb91-478c-b7be-ace461cf4965', city: 'São José dos Campos',  state: 'SP' },
  piracicaba:     { id: '5859a7ea-3919-4558-830c-3a70fdd48c0e', city: 'Piracicaba',           state: 'SP' },
  bauru:          { id: 'd740c3af-3235-4565-81b9-06c019d9b578', city: 'Bauru',                state: 'SP' },
  londrina:       { id: '676204b4-453a-424b-a18c-eb6f6347df11', city: 'Londrina',             state: 'PR' },
  maringa:        { id: 'd0727671-e9b9-42d8-9bdf-0cd8429a3a73', city: 'Maringá',             state: 'PR' },
  curitiba:       { id: '76d53f9c-1024-44a5-b0b8-790848c56d8c', city: 'Curitiba',            state: 'PR' },
  uberlandia:     { id: '2685e1a7-6792-4de7-b8dd-cf83dbe8e385', city: 'Uberlândia',          state: 'MG' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function dateOnly(daysOffset: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍  Verificando se dados demo já existem...')

  const { count } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', DEMO_COMPANY_ID)

  if ((count ?? 0) > 0) {
    console.log(`⚠️   Empresa demo já possui ${count} contato(s). Abortando para evitar duplicatas.`)
    console.log('     Para re-seed, delete os dados manualmente antes de executar.')
    process.exit(0)
  }

  // ── 1. Pipeline stages ───────────────────────────────────────────────────

  console.log('📋  Criando pipeline stages...')
  const stages = [
    { company_id: DEMO_COMPANY_ID, title: 'Prospecção',      color: '#6366f1', position: 1, is_default: true },
    { company_id: DEMO_COMPANY_ID, title: 'Qualificação',    color: '#f59e0b', position: 2, is_default: false },
    { company_id: DEMO_COMPANY_ID, title: 'Proposta Enviada',color: '#3b82f6', position: 3, is_default: false },
    { company_id: DEMO_COMPANY_ID, title: 'Negociação',      color: '#10b981', position: 4, is_default: false },
    { company_id: DEMO_COMPANY_ID, title: 'Fechamento',      color: '#ef4444', position: 5, is_default: false },
  ]
  const { error: stagesErr } = await supabase.from('pipeline_stages').insert(stages)
  if (stagesErr) { console.error('❌  pipeline_stages:', stagesErr.message); process.exit(1) }
  console.log(`   ✓ ${stages.length} stages criados`)

  // ── 2. Contacts ──────────────────────────────────────────────────────────

  console.log('👥  Criando contatos...')
  const contacts = [
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.campinas.id,   name: 'Ana Beatriz Ferreira',  role: 'Diretora de Tecnologia',      email: 'ana.ferreira@campinas.sp.gov.br',   phone: '(19) 3232-1001', department: 'Secretaria de TI',             secretariat: 'Sec. de Gestão e Inovação',  status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.ribeirao.id,   name: 'Carlos Eduardo Souza',  role: 'Secretário de Educação',       email: 'carlos.souza@ribeirao.sp.gov.br',   phone: '(16) 3977-9000', department: 'Secretaria de Educação',       secretariat: 'Sec. Municipal de Educação', status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sorocaba.id,   name: 'Fernanda Lima',         role: 'Coordenadora de TI',           email: 'fernanda.lima@sorocaba.sp.gov.br',  phone: '(15) 3238-2200', department: 'Departamento de TI',           secretariat: 'Sec. de Administração',      status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sjc.id,        name: 'Roberto Alves',         role: 'Secretário de Administração',  email: 'roberto.alves@sjc.sp.gov.br',       phone: '(12) 3947-8000', department: 'Secretaria de Administração',  secretariat: 'Gabinete do Prefeito',       status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.piracicaba.id, name: 'Patrícia Mendes',       role: 'Secretária de Saúde',          email: 'patricia.mendes@piracicaba.sp.gov.br', phone: '(19) 3403-1100', department: 'Secretaria de Saúde',       secretariat: 'Sec. Municipal de Saúde',    status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.bauru.id,      name: 'Gustavo Rocha',         role: 'Diretor de Compras',           email: 'gustavo.rocha@bauru.sp.gov.br',     phone: '(14) 3235-5000', department: 'Departamento de Licitações',   secretariat: 'Sec. de Finanças',           status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.londrina.id,   name: 'Mariana Oliveira',      role: 'Secretária de Administração',  email: 'mariana.oliveira@londrina.pr.gov.br', phone: '(43) 3372-4000', department: 'Secretaria de Administração', secretariat: 'Sec. de Gestão Pública',    status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.maringa.id,    name: 'Diego Castro',          role: 'Coordenador de Projetos',      email: 'diego.castro@maringa.pr.gov.br',    phone: '(44) 3221-1200', department: 'Departamento de Projetos',     secretariat: 'Sec. de Planejamento',       status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.curitiba.id,   name: 'Luciana Pereira',       role: 'Diretora de Infraestrutura',   email: 'luciana.pereira@curitiba.pr.gov.br', phone: '(41) 3350-8000', department: 'Departamento de Infra',      secretariat: 'Sec. de Obras Públicas',     status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.uberlandia.id, name: 'André Martins',         role: 'Secretário de Obras',          email: 'andre.martins@uberlandia.mg.gov.br', phone: '(34) 3239-2000', department: 'Secretaria de Obras',        secretariat: 'Sec. de Infraestrutura',     status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.campinas.id,   name: 'Camila Torres',         role: 'Assistente Administrativa',    email: 'camila.torres@campinas.sp.gov.br',  phone: '(19) 3232-1002', department: 'Secretaria de TI',             secretariat: 'Sec. de Gestão e Inovação',  status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.ribeirao.id,   name: 'Felipe Santos',         role: 'Analista de Compras',          email: 'felipe.santos@ribeirao.sp.gov.br',  phone: '(16) 3977-9001', department: 'Departamento de Licitações',   secretariat: 'Sec. de Administração',      status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sorocaba.id,   name: 'Renata Costa',          role: 'Diretora Financeira',          email: 'renata.costa@sorocaba.sp.gov.br',   phone: '(15) 3238-2201', department: 'Departamento Financeiro',      secretariat: 'Sec. de Finanças',           status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.londrina.id,   name: 'Marcos Vieira',         role: 'Coordenador de TI',            email: 'marcos.vieira@londrina.pr.gov.br',  phone: '(43) 3372-4001', department: 'Departamento de TI',           secretariat: 'Sec. de Gestão Pública',     status: 'ativo' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.curitiba.id,   name: 'Beatriz Nunes',         role: 'Secretária de Fazenda',        email: 'beatriz.nunes@curitiba.pr.gov.br',  phone: '(41) 3350-8001', department: 'Secretaria de Fazenda',        secretariat: 'Sec. de Fazenda',            status: 'ativo' },
  ]
  const { error: contactsErr } = await supabase.from('contacts').insert(contacts)
  if (contactsErr) { console.error('❌  contacts:', contactsErr.message); process.exit(1) }
  console.log(`   ✓ ${contacts.length} contatos criados`)

  // ── 3. Proposals ─────────────────────────────────────────────────────────

  console.log('📄  Criando propostas...')
  const proposals = [
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.campinas.id,   title: 'Software de Gestão Escolar Municipal',          status: 'Aprovada',    value: 285000, date: dateOnly(-30), department: 'Secretaria de Educação',    secretariat: 'Sec. Municipal de Educação' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.ribeirao.id,   title: 'Plataforma de Telemedicina para UBS',            status: 'Em análise',  value: 420000, date: dateOnly(-15), department: 'Secretaria de Saúde',       secretariat: 'Sec. Municipal de Saúde' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sorocaba.id,   title: 'Sistema de Controle e Rastreamento de Frotas',   status: 'Enviada',     value: 180000, date: dateOnly(-7),  department: 'Secretaria de Obras',       secretariat: 'Sec. de Infraestrutura' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sjc.id,        title: 'Portal de Transparência e Dados Abertos',        status: 'Ganha',       value: 95000,  date: dateOnly(-60), department: 'Gabinete do Prefeito',      secretariat: 'Sec. de Comunicação' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.piracicaba.id, title: 'Sistema Integrado de Gestão de RH',              status: 'Rascunho',    value: 210000, date: dateOnly(-3),  department: 'Secretaria de Administração', secretariat: 'Sec. de Gestão de Pessoas' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.londrina.id,   title: 'Plataforma de Business Intelligence Municipal',  status: 'Em análise',  value: 340000, date: dateOnly(-20), department: 'Secretaria de Planejamento', secretariat: 'Sec. de Planejamento' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.curitiba.id,   title: 'Sistema de Arrecadação e Fiscalização Tributária', status: 'Perdida',   value: 560000, date: dateOnly(-90), department: 'Secretaria de Fazenda',     secretariat: 'Sec. de Fazenda' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.uberlandia.id, title: 'App de Atendimento ao Cidadão — Prefeitura Digital', status: 'Enviada', value: 125000, date: dateOnly(-5),  department: 'Secretaria de Administração', secretariat: 'Sec. de Modernização' },
  ]
  const { error: proposalsErr } = await supabase.from('proposals').insert(proposals)
  if (proposalsErr) { console.error('❌  proposals:', proposalsErr.message); process.exit(1) }
  console.log(`   ✓ ${proposals.length} propostas criadas`)

  // ── 4. Deals (funil / pipeline) ──────────────────────────────────────────

  console.log('🔄  Criando deals para o funil...')
  const deals = [
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.campinas.id,   title: 'Gestão Escolar — Campinas',            estimated_value: 285000, status: 'Proposta Enviada', source: 'Licitação PNCP' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.ribeirao.id,   title: 'Telemedicina UBS — Ribeirão Preto',    estimated_value: 420000, status: 'Negociação',       source: 'Prospecção ativa' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sorocaba.id,   title: 'Frotas — Sorocaba',                    estimated_value: 180000, status: 'Qualificação',     source: 'Indicação' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sjc.id,        title: 'Portal Transparência — SJC',           estimated_value: 95000,  status: 'Fechamento',       source: 'Licitação PNCP' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.piracicaba.id, title: 'RH Integrado — Piracicaba',            estimated_value: 210000, status: 'Prospecção',       source: 'Prospecção ativa' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.londrina.id,   title: 'BI Municipal — Londrina',              estimated_value: 340000, status: 'Qualificação',     source: 'Licitação PNCP' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.maringa.id,    title: 'App Cidadão — Maringá',                estimated_value: 160000, status: 'Prospecção',       source: 'Prospecção ativa' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.uberlandia.id, title: 'Prefeitura Digital — Uberlândia',      estimated_value: 125000, status: 'Proposta Enviada', source: 'Licitação PNCP' },
  ]
  const { error: dealsErr } = await supabase.from('deals').insert(deals)
  if (dealsErr) { console.error('❌  deals:', dealsErr.message); process.exit(1) }
  console.log(`   ✓ ${deals.length} deals criados`)

  // ── 5. Contracts ─────────────────────────────────────────────────────────

  console.log('📑  Criando contratos...')
  const contracts = [
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.londrina.id,
      title: 'Licença Anual — Plataforma BI Municipal',
      status: 'ativo',
      value: 48000,
      start_date: dateOnly(-90),
      end_date: dateOnly(275),
      department: 'Secretaria de Planejamento',
      secretariat: 'Sec. de Planejamento',
      notes: 'Contrato de SaaS anual com suporte técnico incluso. Renovação automática.',
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.sjc.id,
      title: 'Portal de Transparência — Implantação e Licença',
      status: 'encerrado',
      value: 95000,
      start_date: dateOnly(-365),
      end_date: dateOnly(-5),
      department: 'Gabinete do Prefeito',
      secretariat: 'Sec. de Comunicação',
      notes: 'Projeto entregue. Encerrado conforme escopo original. Oportunidade de renovação identificada.',
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.ribeirao.id,
      title: 'Sistema de Gestão de RH — Licença e Manutenção',
      status: 'em renovação',
      value: 168000,
      start_date: dateOnly(-180),
      end_date: dateOnly(15),
      department: 'Secretaria de Administração',
      secretariat: 'Sec. de Gestão de Pessoas',
      notes: 'Em processo de renovação por mais 24 meses. Proposta de upgrade enviada.',
    },
  ]
  const { error: contractsErr } = await supabase.from('contracts').insert(contracts)
  if (contractsErr) { console.error('❌  contracts:', contractsErr.message); process.exit(1) }
  console.log(`   ✓ ${contracts.length} contratos criados`)

  // ── 6. Tasks ─────────────────────────────────────────────────────────────

  console.log('✅  Criando tarefas...')
  const tasks = [
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.campinas.id,   title: 'Enviar proposta revisada para Campinas',                    description: 'Incluir ajustes solicitados pela Sec. de Educação na reunião do dia 02/04.',  due_date: daysFromNow(3),   priority: 'high',   status: 'pending' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.piracicaba.id, title: 'Agendar reunião com Secretaria de Saúde — Piracicaba',      description: 'Patrícia Mendes aguarda retorno. Confirmar disponibilidade para semana que vem.', due_date: daysFromNow(5),   priority: 'medium', status: 'pending' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.curitiba.id,   title: 'Preparar demonstração técnica do sistema — Curitiba',       description: 'Demo para equipe da Sec. de Infraestrutura. Focar nos módulos de BI e relatórios.', due_date: daysFromNow(7),   priority: 'high',   status: 'pending' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sorocaba.id,   title: 'Follow-up proposta controle de frotas — Sorocaba',         description: 'Ligar para Fernanda Lima — 7 dias sem resposta.',                              due_date: daysFromNow(1),   priority: 'medium', status: 'pending' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.ribeirao.id,   title: 'Revisar minuta de renovação contratual — Ribeirão Preto',  description: 'Contrato vence em 15 dias. Enviar nova proposta com reajuste IPCA.',            due_date: daysFromNow(10),  priority: 'high',   status: 'pending' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.maringa.id,    title: 'Reunião de kickoff sistema de projetos — Maringá',         description: 'Kickoff realizado com sucesso. Equipe técnica alinhada.',                      due_date: daysFromNow(-10), priority: 'medium', status: 'completed' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.bauru.id,      title: 'Enviar proposta inicial para Bauru',                       description: 'Enviado via e-mail institucional.',                                            due_date: daysFromNow(-20), priority: 'low',    status: 'completed' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.londrina.id,   title: 'Visita técnica à prefeitura de Londrina',                  description: 'Reunião presencial realizada. Contrato assinado na sequência.',                 due_date: daysFromNow(-45), priority: 'medium', status: 'completed' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.uberlandia.id, title: 'Coleta de requisitos — Prefeitura Digital Uberlândia',     description: 'Requisitos documentados no drive. Aprovados pelo cliente.',                    due_date: daysFromNow(-15), priority: 'low',    status: 'completed' },
    { company_id: DEMO_COMPANY_ID, municipality_id: MUNS.sjc.id,        title: 'Apresentação executiva para Secretaria de Comunicação — SJC', description: 'Apresentação realizada. Proposta aprovada e contrato assinado.',             due_date: daysFromNow(-60), priority: 'high',   status: 'completed' },
  ]
  const { error: tasksErr } = await supabase.from('tasks').insert(tasks)
  if (tasksErr) { console.error('❌  tasks:', tasksErr.message); process.exit(1) }
  console.log(`   ✓ ${tasks.length} tarefas criadas`)

  // ── 7. Opportunities (fictícias, vinculadas à empresa demo) ──────────────

  console.log('🔎  Criando oportunidades PNCP fictícias...')
  const now = new Date().toISOString()
  const opportunities = [
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.campinas.id,
      source: 'PNCP',
      external_id: 'DEMO-2026-CAMP-001',
      organ_name: 'Prefeitura Municipal de Campinas',
      city: 'Campinas', state: 'SP', municipality_name: 'Campinas',
      title: 'Contratação de solução de software para gestão municipal integrada',
      description: 'Pregão eletrônico para contratação de plataforma SaaS de gestão administrativa, financeira e RH para uso da prefeitura e secretarias.',
      modality: 'Pregão Eletrônico',
      situation: 'Aberta',
      publication_date: daysAgo(5),
      opening_date: daysFromNow(10),
      estimated_value: 350000,
      official_url: 'https://pncp.gov.br/app/editais/demo-camp-001',
      match_score: 92,
      match_reason: 'Alta compatibilidade: gestão municipal, SaaS, integração de sistemas — alinhado ao portfólio da empresa.',
      internal_status: 'new',
      last_synced_at: now,
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.ribeirao.id,
      source: 'PNCP',
      external_id: 'DEMO-2026-RIB-001',
      organ_name: 'Prefeitura Municipal de Ribeirão Preto',
      city: 'Ribeirão Preto', state: 'SP', municipality_name: 'Ribeirão Preto',
      title: 'Plataforma digital de atendimento ao cidadão e serviços online',
      description: 'Dispensa de licitação para contratação de plataforma web e mobile de atendimento ao cidadão com integração ao portal de transparência.',
      modality: 'Dispensa',
      situation: 'Aberta',
      publication_date: daysAgo(3),
      opening_date: daysFromNow(7),
      estimated_value: 180000,
      official_url: 'https://pncp.gov.br/app/editais/demo-rib-001',
      match_score: 88,
      match_reason: 'Compatível: plataforma digital, portal cidadão — soluções disponíveis no portfólio.',
      internal_status: 'new',
      last_synced_at: now,
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.sorocaba.id,
      source: 'PNCP',
      external_id: 'DEMO-2026-SOR-001',
      organ_name: 'Prefeitura Municipal de Sorocaba',
      city: 'Sorocaba', state: 'SP', municipality_name: 'Sorocaba',
      title: 'Sistema integrado de saúde pública — prontuário eletrônico e gestão de UBS',
      description: 'Concorrência pública para sistema de prontuário eletrônico, agendamento online e gestão de unidades básicas de saúde.',
      modality: 'Concorrência',
      situation: 'Aberta',
      publication_date: daysAgo(10),
      opening_date: daysFromNow(20),
      estimated_value: 520000,
      official_url: 'https://pncp.gov.br/app/editais/demo-sor-001',
      match_score: 76,
      match_reason: 'Parcialmente compatível: telemedicina e saúde digital estão no portfólio; prontuário eletrônico requer adaptação.',
      internal_status: 'new',
      last_synced_at: now,
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.londrina.id,
      source: 'PNCP',
      external_id: 'DEMO-2026-LON-001',
      organ_name: 'Prefeitura Municipal de Londrina',
      city: 'Londrina', state: 'PR', municipality_name: 'Londrina',
      title: 'Solução de Business Intelligence e analytics para tomada de decisão municipal',
      description: 'Pregão eletrônico para contratação de plataforma de BI, dashboards executivos e relatórios gerenciais para todas as secretarias.',
      modality: 'Pregão Eletrônico',
      situation: 'Aberta',
      publication_date: daysAgo(2),
      opening_date: daysFromNow(14),
      estimated_value: 290000,
      official_url: 'https://pncp.gov.br/app/editais/demo-lon-001',
      match_score: 95,
      match_reason: 'Excelente fit: BI municipal é o produto principal. Já existe contrato ativo com Londrina — ampliação natural.',
      internal_status: 'new',
      last_synced_at: now,
    },
    {
      company_id: DEMO_COMPANY_ID,
      municipality_id: MUNS.uberlandia.id,
      source: 'PNCP',
      external_id: 'DEMO-2026-UBE-001',
      organ_name: 'Prefeitura Municipal de Uberlândia',
      city: 'Uberlândia', state: 'MG', municipality_name: 'Uberlândia',
      title: 'Licenciamento de software educacional para rede municipal de ensino',
      description: 'Pregão eletrônico para contratação de plataforma de gestão escolar com módulos de matrículas, frequência, notas e comunicação com responsáveis.',
      modality: 'Pregão Eletrônico',
      situation: 'Aberta',
      publication_date: daysAgo(7),
      opening_date: daysFromNow(8),
      estimated_value: 145000,
      official_url: 'https://pncp.gov.br/app/editais/demo-ube-001',
      match_score: 83,
      match_reason: 'Boa compatibilidade: software educacional, gestão de matrículas e frequência alinhados ao portfólio.',
      internal_status: 'new',
      last_synced_at: now,
    },
  ]
  const { error: oppsErr } = await supabase.from('opportunities').insert(opportunities)
  if (oppsErr) { console.error('❌  opportunities:', oppsErr.message); process.exit(1) }
  console.log(`   ✓ ${opportunities.length} oportunidades criadas`)

  console.log('\n🎉  Seed demo concluído com sucesso!')
  console.log(`   • ${stages.length} pipeline stages`)
  console.log(`   • ${contacts.length} contatos`)
  console.log(`   • ${proposals.length} propostas`)
  console.log(`   • ${deals.length} deals no funil`)
  console.log(`   • ${contracts.length} contratos`)
  console.log(`   • ${tasks.length} tarefas`)
  console.log(`   • ${opportunities.length} oportunidades PNCP`)
}

main().catch((err) => {
  console.error('❌  Erro inesperado:', err)
  process.exit(1)
})
