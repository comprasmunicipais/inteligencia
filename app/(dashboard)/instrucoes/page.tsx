export default function InstrucoesPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  )
}

const html = <!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CM Pro - Instruções de Uso</title>
  <style>
    :root {
      --bg: #f7f8fc;
      --card: #ffffff;
      --dark: #0f172a;
      --dark-2: #111827;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --blue: #1a56db;
      --blue-soft: #e8f0fe;
      --green: #0e9f6e;
      --green-soft: #e3faf0;
      --purple: #6c47ff;
      --purple-soft: #f0ecff;
      --amber: #e3a008;
      --amber-soft: #fef9e7;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      --radius: 16px;
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      font-family: "DM Sans", "Segoe UI", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
      border-bottom: 3px solid var(--blue);
      padding: 44px 24px 40px;
    }

    .container {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(26, 86, 219, 0.14);
      border: 1px solid rgba(96, 165, 250, 0.25);
      color: #60a5fa;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    .hero h1 {
      margin: 0 0 12px;
      color: #f8fafc;
      font-size: clamp(28px, 4vw, 38px);
      line-height: 1.2;
    }

    .hero p {
      margin: 0;
      color: #94a3b8;
      font-size: 16px;
      max-width: 760px;
    }

    .nav {
      margin-top: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .nav a {
      text-decoration: none;
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.22);
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      transition: 0.2s ease;
    }

    .nav a:hover {
      color: #fff;
      border-color: rgba(96, 165, 250, 0.5);
      background: rgba(255, 255, 255, 0.04);
    }

    main {
      padding: 36px 24px 56px;
    }

    section {
      margin-bottom: 30px;
    }

    .section-label {
      display: inline-block;
      background: var(--dark);
      color: #f8fafc;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.4px;
      margin-bottom: 14px;
    }

    .intro-card,
    .card,
    .feature-card,
    .flow-card,
    .note-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .intro-card {
      padding: 24px;
    }

    .intro-card p:last-child {
      margin-bottom: 0;
    }

    .grid {
      display: grid;
      gap: 18px;
    }

    .grid-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .grid-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .step-card {
      background: #fff;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .step-head {
      padding: 24px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .step-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .step-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 4px 10px;
    }

    .step-card h3,
    .feature-card h3,
    .flow-card h3,
    .card h3 {
      margin: 0 0 6px;
      font-size: 20px;
      line-height: 1.3;
      color: var(--text);
    }

    .step-card p,
    .feature-card p,
    .flow-card p,
    .card p,
    .intro-card p,
    .note-card p {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 15px;
    }

    .step-body {
      padding: 0 24px 24px;
    }

    .step-list,
    .plain-list,
    .timeline-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .step-list li,
    .timeline-list li {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 12px 0;
      border-top: 1px solid #eef2f7;
    }

    .step-list li:first-child,
    .timeline-list li:first-child {
      border-top: 0;
      padding-top: 0;
    }

    .num {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-list strong,
    .timeline-list strong,
    .plain-list strong {
      color: #1e293b;
    }

    .tip {
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 14px;
      border: 1px solid;
    }

    .feature-card,
    .flow-card,
    .card,
    .note-card {
      padding: 22px;
    }

    .feature-card ul,
    .flow-card ul,
    .card ul,
    .note-card ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 15px;
    }

    .feature-card li,
    .flow-card li,
    .card li,
    .note-card li {
      margin-bottom: 8px;
    }

    .module-header {
      margin-bottom: 16px;
    }

    .module-header h2 {
      margin: 0 0 6px;
      font-size: 28px;
      color: var(--text);
    }

    .module-header p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
      max-width: 760px;
    }

    .highlight-box {
      background: #f8fafc;
      border: 1px solid #e5edf6;
      border-radius: 14px;
      padding: 18px 20px;
      margin-top: 14px;
    }

    .highlight-box strong {
      display: block;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .journey {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 18px;
    }

    .journey .flow-card {
      height: 100%;
    }

    .footer-help {
      background: var(--dark);
      color: #f8fafc;
      padding: 22px 24px;
      border-radius: 16px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      box-shadow: var(--shadow);
    }

    .footer-help p {
      margin: 0;
      color: #94a3b8;
    }

    .footer-help h3 {
      margin: 0 0 4px;
      font-size: 18px;
    }

    .blue .step-icon { background: var(--blue-soft); color: var(--blue); }
    .blue .step-meta { color: var(--blue); background: var(--blue-soft); border: 1px solid rgba(26, 86, 219, 0.18); }
    .blue .num { background: var(--blue); }
    .blue .tip { background: var(--blue-soft); border-color: rgba(26, 86, 219, 0.18); color: #334155; }

    .green .step-icon { background: var(--green-soft); color: var(--green); }
    .green .step-meta { color: var(--green); background: var(--green-soft); border: 1px solid rgba(14, 159, 110, 0.18); }
    .green .num { background: var(--green); }
    .green .tip { background: var(--green-soft); border-color: rgba(14, 159, 110, 0.18); color: #334155; }

    .purple-top { border-top: 4px solid var(--purple); }
    .amber-top { border-top: 4px solid var(--amber); }
    .blue-top { border-top: 4px solid var(--blue); }

    @media (max-width: 900px) {
      .grid-2,
      .grid-3,
      .journey {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .hero {
        padding: 34px 18px 30px;
      }

      main {
        padding: 28px 18px 46px;
      }

      .step-head,
      .step-body,
      .feature-card,
      .flow-card,
      .card,
      .intro-card,
      .note-card {
        padding-left: 18px;
        padding-right: 18px;
      }

      .step-head {
        flex-direction: column;
      }

      .footer-help {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="container">
      <span class="badge">Primeiros passos e operação prática</span>
      <h1>Como começar a usar o CM Pro</h1>
      <p>
        Siga esta sequência para configurar o sistema corretamente, entender cada módulo e transformar oportunidades em operação comercial organizada.
      </p>
      <nav class="nav">
        <a href="#primeiros-passos">Primeiros passos</a>
        <a href="#visao-geral">Visão geral do sistema</a>
        <a href="#crm">CRM Operacional</a>
        <a href="#inteligencia">Inteligência</a>
        <a href="#email">Disparos de E-mail</a>
        <a href="#operacao">Como operar na prática</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="container">
      <section id="primeiros-passos">
        <div class="section-label">Etapa obrigatória</div>
        <div class="module-header">
          <h2>Primeiros passos</h2>
          <p>
            Antes de explorar qualquer módulo, o sistema precisa entender o perfil da sua empresa e recalcular o score das oportunidades disponíveis. Sem essa configuração inicial, a experiência perde precisão.
          </p>
        </div>

        <div class="grid">
          <article class="step-card blue">
            <div class="step-head">
              <div class="step-icon">⚙</div>
              <div>
                <div class="step-meta">Passo 1 — Obrigatório</div>
                <h3>Configure seu Perfil Estratégico</h3>
                <p>Este é o passo mais importante. É ele que define como o sistema vai interpretar as oportunidades para a sua empresa.</p>
              </div>
            </div>
            <div class="step-body">
              <ol class="step-list">
                <li>
                  <span class="num">1</span>
                  <div><strong>Acesse:</strong> menu lateral → Perfil Estratégico.</div>
                </li>
                <li>
                  <span class="num">2</span>
                  <div><strong>Preencha os dados da empresa:</strong> razão social, CNPJ, segmento principal e subsegmentos do que você vende.</div>
                </li>
                <li>
                  <span class="num">3</span>
                  <div><strong>Defina palavras-chave positivas:</strong> termos que identificam oportunidades relevantes para sua empresa.</div>
                </li>
                <li>
                  <span class="num">4</span>
                  <div><strong>Defina palavras-chave negativas:</strong> termos que ajudam a eliminar oportunidades irrelevantes.</div>
                </li>
                <li>
                  <span class="num">5</span>
                  <div><strong>Configure ticket mínimo e máximo:</strong> assim o sistema considera sua capacidade financeira e comercial.</div>
                </li>
                <li>
                  <span class="num">6</span>
                  <div><strong>Selecione estados de atuação:</strong> escolha onde sua empresa realmente pode operar.</div>
                </li>
                <li>
                  <span class="num">7</span>
                  <div><strong>Marque as modalidades aceitas:</strong> deixe selecionadas apenas as modalidades em que sua empresa participa.</div>
                </li>
                <li>
                  <span class="num">8</span>
                  <div><strong>Salve o perfil:</strong> o sistema passa a usar essa configuração como base para o Match IA.</div>
                </li>
              </ol>
              <div class="tip">
                Quanto mais preciso for o Perfil Estratégico, melhor será a qualidade dos resultados. Revise palavras-chave, regiões e modalidades com atenção.
              </div>
            </div>
          </article>

          <article class="step-card green">
            <div class="step-head">
              <div class="step-icon">◎</div>
              <div>
                <div class="step-meta">Passo 2 — Obrigatório</div>
                <h3>Recalcule o Score em Oportunidades</h3>
                <p>Depois de salvar o Perfil Estratégico, o sistema precisa reprocessar as oportunidades ativas com base nessa configuração.</p>
              </div>
            </div>
            <div class="step-body">
              <ol class="step-list">
                <li>
                  <span class="num">1</span>
                  <div><strong>Acesse:</strong> menu lateral → Oportunidades.</div>
                </li>
                <li>
                  <span class="num">2</span>
                  <div><strong>Clique em Recalcular Score:</strong> o botão fica no canto superior direito da tela.</div>
                </li>
                <li>
                  <span class="num">3</span>
                  <div><strong>Aguarde o processamento:</strong> o sistema analisa as oportunidades ativas em relação ao seu perfil.</div>
                </li>
                <li>
                  <span class="num">4</span>
                  <div><strong>Verifique os resultados:</strong> oportunidades com aderência mais alta passam a ser priorizadas.</div>
                </li>
              </ol>
              <div class="tip">
                Sempre que alterar o Perfil Estratégico, repita este processo. É isso que mantém o sistema alinhado com o foco real da sua empresa.
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="visao-geral">
        <div class="section-label">Depois da configuração inicial</div>
        <div class="intro-card">
          <h3 style="margin-top:0; font-size:24px;">Agora você pode entender o sistema como um todo</h3>
          <p>
            Depois de configurar o Perfil Estratégico e recalcular o score, o CM Pro passa a funcionar de forma prática para sua operação. A lógica do sistema é simples:
          </p>
          <div class="highlight-box">
            <strong>Fluxo principal do produto</strong>
            <p style="margin:0;">Inteligência identifica oportunidades relevantes, o CRM organiza o relacionamento com as prefeituras e os Disparos de E-mail ajudam sua empresa a atuar de forma ativa no mercado.</p>
          </div>
        </div>
      </section>

      <section id="crm">
        <div class="section-label">CRM Operacional</div>
        <div class="module-header">
          <h2>Organização comercial da sua empresa</h2>
          <p>
            O CRM Operacional é o núcleo de gestão comercial do CM Pro. É aqui que sua empresa acompanha o relacionamento com prefeituras, registra contatos, negociações, propostas, contratos e ações do dia a dia.
          </p>
        </div>

        <div class="grid grid-3">
          <article class="feature-card blue-top">
            <h3>Dashboard</h3>
            <p>Apresenta uma visão rápida dos principais indicadores da operação comercial e da inteligência do sistema.</p>
            <ul>
              <li>andamento do funil de vendas</li>
              <li>volume de propostas em aberto</li>
              <li>contratos registrados</li>
              <li>oportunidades recentes e visão geral da operação</li>
            </ul>
          </article>

          <article class="feature-card blue-top">
            <h3>Funil de Vendas</h3>
            <p>Organiza o estágio de cada negociação com prefeituras ao longo do processo comercial.</p>
            <ul>
              <li>acompanha a evolução de cada negociação</li>
              <li>ajuda a visualizar prioridades comerciais</li>
              <li>centraliza o andamento das oportunidades em aberto</li>
              <li>deve ser usado conforme os estágios configurados no seu ambiente</li>
            </ul>
          </article>

          <article class="feature-card blue-top">
            <h3>Prefeituras</h3>
            <p>É a base do relacionamento comercial da empresa.</p>
            <ul>
              <li>cada prefeitura é um órgão</li>
              <li>centraliza o histórico de relacionamento</li>
              <li>serve como referência para propostas e contatos</li>
            </ul>
          </article>

          <article class="feature-card blue-top">
            <h3>Contatos</h3>
            <p>São as pessoas dentro das prefeituras.</p>
            <ul>
              <li>secretários</li>
              <li>responsáveis por compras</li>
              <li>equipes técnicas</li>
              <li>pontos de relacionamento do órgão</li>
            </ul>
          </article>

          <article class="feature-card blue-top">
            <h3>Propostas</h3>
            <p>Organizam as negociações em andamento.</p>
            <ul>
              <li>controle do que foi enviado</li>
              <li>acompanhamento do status comercial</li>
              <li>vínculo com a prefeitura</li>
            </ul>
          </article>

          <article class="feature-card blue-top">
            <h3>Contratos</h3>
            <p>Registram os negócios fechados.</p>
            <ul>
              <li>histórico de vendas</li>
              <li>controle de contratos ativos</li>
              <li>consolidação de resultado comercial</li>
            </ul>
          </article>
        </div>

        <div class="grid" style="margin-top:18px;">
          <article class="card">
            <h3>Minhas Ações</h3>
            <p>É a área usada para organizar as tarefas e pendências da rotina comercial.</p>
            <ul>
              <li>registro de follow-ups</li>
              <li>controle de pendências operacionais</li>
              <li>organização das próximas ações da equipe</li>
              <li>uso recomendado para não deixar negociações sem acompanhamento</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="inteligencia">
        <div class="section-label">Inteligência</div>
        <div class="module-header">
          <h2>O ponto de partida da operação</h2>
          <p>
            A área de Inteligência é onde o CM Pro cruza dados públicos com o Perfil Estratégico da sua empresa para destacar oportunidades com maior aderência e reduzir o tempo gasto com análise irrelevante.
          </p>
        </div>

        <div class="grid grid-2">
          <article class="feature-card purple-top">
            <h3>Oportunidades</h3>
            <p>Mostra as licitações disponíveis para análise, acompanhadas de score de aderência com base no Perfil Estratégico.</p>
            <ul>
              <li>use o filtro <strong>Alta Aderência</strong> para priorizar o que faz mais sentido</li>
              <li>score acima de 70% indica oportunidade com aderência mais alta</li>
              <li>mostra título, órgão responsável, valor estimado e modalidade</li>
              <li>apresenta o motivo do match para apoiar a análise</li>
            </ul>
          </article>

          <article class="feature-card purple-top">
            <h3>Perfil Estratégico</h3>
            <p>É a configuração que define como o sistema interpreta oportunidades para a sua empresa.</p>
            <ul>
              <li>o que sua empresa vende</li>
              <li>palavras-chave positivas e negativas</li>
              <li>ticket</li>
              <li>regiões de atuação</li>
              <li>modalidades aceitas</li>
            </ul>
          </article>

          <article class="feature-card purple-top">
            <h3>Análise de Mercado</h3>
            <p>Entrega uma visão geral das oportunidades disponíveis e da distribuição do mercado.</p>
            <ul>
              <li>volume de oportunidades</li>
              <li>distribuição por estado</li>
              <li>comportamento do mercado</li>
              <li>apoio para decisões estratégicas</li>
            </ul>
          </article>

          <article class="feature-card purple-top">
            <h3>Relatórios</h3>
            <p>Consolidam indicadores das oportunidades e da aderência ao longo do tempo.</p>
            <ul>
              <li>volume de oportunidades analisadas</li>
              <li>distribuição de aderência</li>
              <li>visão estruturada para tomada de decisão</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="email">
        <div class="section-label">Disparos de E-mail</div>
        <div class="module-header">
          <h2>Prospecção ativa e relacionamento em escala</h2>
          <p>
            Esta área permite que sua empresa se comunique com prefeituras de forma estruturada, usando a própria conta de e-mail da empresa e audiências segmentadas dentro do sistema.
          </p>
        </div>

        <div class="grid grid-3">
          <article class="feature-card amber-top">
            <h3>Campanhas</h3>
            <p>Organizam a criação, revisão e disparo dos e-mails.</p>
            <ul>
              <li>assunto</li>
              <li>conteúdo</li>
              <li>audiência</li>
              <li>conta de envio</li>
            </ul>
          </article>

          <article class="feature-card amber-top">
            <h3>Audiências</h3>
            <p>Definem para quem os e-mails serão enviados.</p>
            <ul>
              <li>segmentação por estado</li>
              <li>município</li>
              <li>porte</li>
              <li>secretaria ou área</li>
            </ul>
          </article>

          <article class="feature-card amber-top">
            <h3>Contas de envio</h3>
            <p>São as contas SMTP da sua empresa utilizadas para realizar os disparos.</p>
            <ul>
              <li>Gmail</li>
              <li>Outlook</li>
              <li>servidor próprio</li>
              <li>teste a conexão antes de disparar qualquer campanha</li>
            </ul>
          </article>

          <article class="feature-card amber-top">
            <h3>Templates</h3>
            <p>Facilitam a produção do conteúdo das campanhas.</p>
            <ul>
              <li>criação manual</li>
              <li>apoio de IA</li>
              <li>modelos para prospecção e relacionamento</li>
            </ul>
          </article>

          <article class="feature-card amber-top">
            <h3>Histórico</h3>
            <p>Registra os envios realizados e o status de execução das campanhas.</p>
            <ul>
              <li>campanhas já enviadas</li>
              <li>quantidade de envios</li>
              <li>status de envio</li>
            </ul>
          </article>

          <article class="feature-card amber-top">
            <h3>Estatísticas</h3>
            <p>Mostram o desempenho das campanhas enviadas.</p>
            <ul>
              <li>taxa de abertura</li>
              <li>cliques</li>
              <li>engajamento das campanhas</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="operacao">
        <div class="section-label">Como operar o CM Pro na prática</div>
        <div class="module-header">
          <h2>Fluxo real de uso no dia a dia</h2>
          <p>
            Depois da configuração inicial, o CM Pro pode ser usado por dois caminhos principais: quando a oportunidade já existe e quando sua empresa quer atuar de forma antecipada no mercado.
          </p>
        </div>

        <div class="journey">
          <article class="flow-card purple-top">
            <h3>Caminho 1: Captação de Oportunidades</h3>
            <p>Quando sua empresa identifica uma licitação relevante e quer levar isso para a operação comercial.</p>
            <ol class="timeline-list">
              <li><span class="num" style="background: var(--purple);">1</span><div><strong>Acesse Oportunidades:</strong> filtre por alta aderência.</div></li>
              <li><span class="num" style="background: var(--purple);">2</span><div><strong>Analise a licitação:</strong> valor, prazo, escopo e órgão responsável.</div></li>
              <li><span class="num" style="background: var(--purple);">3</span><div><strong>Leve para o CRM:</strong> localize ou adicione a prefeitura e registre contatos.</div></li>
              <li><span class="num" style="background: var(--purple);">4</span><div><strong>Crie uma proposta:</strong> organize a negociação e acompanhe no funil.</div></li>
              <li><span class="num" style="background: var(--purple);">5</span><div><strong>Registre ações:</strong> follow-ups, tarefas e próximos passos.</div></li>
              <li><span class="num" style="background: var(--purple);">6</span><div><strong>Converta em contrato:</strong> quando o negócio for fechado.</div></li>
            </ol>
          </article>

          <article class="flow-card amber-top">
            <h3>Caminho 2: Prospecção Ativa</h3>
            <p>Quando sua empresa quer gerar relacionamento antes mesmo da licitação acontecer.</p>
            <ol class="timeline-list">
              <li><span class="num" style="background: var(--amber);">1</span><div><strong>Configure e teste a conta SMTP:</strong> acesse Contas de envio, preencha os dados e clique em Testar Conexão antes de avançar.</div></li>
              <li><span class="num" style="background: var(--amber);">2</span><div><strong>Monte a audiência:</strong> segmentando por região, município ou secretaria.</div></li>
              <li><span class="num" style="background: var(--amber);">3</span><div><strong>Crie a campanha:</strong> com conteúdo manual ou com apoio de IA.</div></li>
              <li><span class="num" style="background: var(--amber);">4</span><div><strong>Revise e dispare:</strong> validando conta, público e mensagem.</div></li>
              <li><span class="num" style="background: var(--amber);">5</span><div><strong>Acompanhe as estatísticas:</strong> abertura, cliques e engajamento.</div></li>
              <li><span class="num" style="background: var(--amber);">6</span><div><strong>Ajuste sua abordagem:</strong> com base no que performou melhor.</div></li>
            </ol>
          </article>
        </div>

        <div class="grid" style="margin-top:18px;">
          <article class="note-card">
            <h3>Rotina recomendada</h3>
            <div class="grid grid-3" style="margin-top: 10px;">
              <div>
                <strong style="display:block; margin-bottom:8px; color:#0f172a;">Diário</strong>
                <ul>
                  <li>verificar oportunidades com alta aderência</li>
                  <li>atualizar funil de vendas</li>
                  <li>revisar Minhas Ações</li>
                </ul>
              </div>
              <div>
                <strong style="display:block; margin-bottom:8px; color:#0f172a;">Semanal</strong>
                <ul>
                  <li>ajustar o Perfil Estratégico se necessário</li>
                  <li>rodar campanhas segmentadas</li>
                  <li>avaliar desempenho comercial</li>
                </ul>
              </div>
              <div>
                <strong style="display:block; margin-bottom:8px; color:#0f172a;">Mensal</strong>
                <ul>
                  <li>revisar estratégia de atuação</li>
                  <li>analisar resultados do período</li>
                  <li>ajustar palavras-chave, regiões e foco</li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <div class="footer-help">
          <div style="font-size: 24px; line-height: 1;">?</div>
          <div>
            <h3>Precisa de ajuda?</h3>
            <p>Se sua equipe precisar de apoio para configurar o sistema ou organizar a operação, entre em contato com a equipe do CM Pro pelo WhatsApp: (11) 3280-7010.</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</body>
</html>

