const colors = {
  bg: "#f7f8fc",
  card: "#ffffff",
  dark: "#0f172a",
  dark2: "#111827",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  blue: "#1a56db",
  blueSoft: "#e8f0fe",
  green: "#0e9f6e",
  greenSoft: "#e3faf0",
  purple: "#6c47ff",
  amber: "#e3a008",
  shadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
}

const styles = {
  page: {
    margin: 0,
    fontFamily: '"DM Sans", "Segoe UI", Arial, sans-serif',
    background: colors.bg,
    color: colors.text,
    lineHeight: 1.6,
  },
  hero: {
    background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.dark2} 100%)`,
    borderBottom: `3px solid ${colors.blue}`,
    padding: "44px 24px 40px",
  },
  container: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(26, 86, 219, 0.14)",
    border: "1px solid rgba(96, 165, 250, 0.25)",
    color: "#60a5fa",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase" as const,
    marginBottom: 18,
  },
  heroTitle: {
    margin: "0 0 12px",
    color: "#f8fafc",
    fontSize: 38,
    lineHeight: 1.2,
  },
  heroText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 16,
    maxWidth: 760,
  },
  nav: {
    marginTop: 24,
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 10,
  },
  navLink: {
    textDecoration: "none",
    color: "#cbd5e1",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
  },
  main: {
    padding: "36px 24px 56px",
  },
  section: {
    marginBottom: 30,
  },
  sectionLabel: {
    display: "inline-block",
    background: colors.dark,
    color: "#f8fafc",
    padding: "8px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.4px",
    marginBottom: 14,
  },
  moduleHeader: {
    marginBottom: 16,
  },
  h2: {
    margin: "0 0 6px",
    fontSize: 28,
    color: colors.text,
  },
  moduleText: {
    margin: 0,
    color: colors.muted,
    fontSize: 15,
    maxWidth: 760,
  },
  cardBase: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: colors.shadow,
  },
  introCard: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: colors.shadow,
    padding: 24,
  },
  grid: {
    display: "grid",
    gap: 18,
  },
  grid2: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  grid3: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  stepCard: {
    background: "#fff",
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    boxShadow: colors.shadow,
    overflow: "hidden" as const,
  },
  stepHead: {
    padding: 24,
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  stepMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase" as const,
    borderRadius: 999,
    padding: "4px 10px",
  },
  h3: {
    margin: "0 0 6px",
    fontSize: 20,
    lineHeight: 1.3,
    color: colors.text,
  },
  cardText: {
    margin: "0 0 14px",
    color: colors.muted,
    fontSize: 15,
  },
  stepBody: {
    padding: "0 24px 24px",
  },
  listReset: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  stepLi: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    padding: "12px 0",
    borderTop: "1px solid #eef2f7",
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  tip: {
    marginTop: 18,
    padding: "14px 16px",
    borderRadius: 12,
    fontSize: 14,
    border: "1px solid",
    color: "#334155",
  },
  featureCard: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: colors.shadow,
    padding: 22,
  },
  card: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: colors.shadow,
    padding: 22,
  },
  ul: {
    margin: 0,
    paddingLeft: 18,
    color: colors.muted,
    fontSize: 15,
  },
  li: {
    marginBottom: 8,
  },
  highlightBox: {
    background: "#f8fafc",
    border: "1px solid #e5edf6",
    borderRadius: 14,
    padding: "18px 20px",
    marginTop: 14,
  },
  journey: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: 18,
  },
  footerHelp: {
    background: colors.dark,
    color: "#f8fafc",
    padding: "22px 24px",
    borderRadius: 16,
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
    boxShadow: colors.shadow,
  },
  footerHelpText: {
    margin: 0,
    color: "#94a3b8",
  },
}

function stepTheme(color: "blue" | "green") {
  if (color === "blue") {
    return {
      icon: { background: colors.blueSoft, color: colors.blue },
      meta: {
        color: colors.blue,
        background: colors.blueSoft,
        border: "1px solid rgba(26, 86, 219, 0.18)",
      },
      num: { background: colors.blue },
      tip: {
        background: colors.blueSoft,
        borderColor: "rgba(26, 86, 219, 0.18)",
      },
    }
  }

  return {
    icon: { background: colors.greenSoft, color: colors.green },
    meta: {
      color: colors.green,
      background: colors.greenSoft,
      border: "1px solid rgba(14, 159, 110, 0.18)",
    },
    num: { background: colors.green },
    tip: {
      background: colors.greenSoft,
      borderColor: "rgba(14, 159, 110, 0.18)",
    },
  }
}

const blueTheme = stepTheme("blue")
const greenTheme = stepTheme("green")

function topBorder(color: string) {
  return { borderTop: `4px solid ${color}` }
}

function timelineNum(color: string) {
  return { ...styles.num, background: color }
}

export default function InstrucoesPage() {
  return (
    <div style={styles.page}>
      <header className="hero" style={styles.hero}>
        <div className="container" style={styles.container}>
          <span className="badge" style={styles.badge}>Primeiros passos e operação prática</span>
          <h1 style={styles.heroTitle}>Como começar a usar o CM Pro</h1>
          <p style={styles.heroText}>
            Siga esta sequência para configurar o sistema corretamente, entender cada módulo e transformar oportunidades em operação comercial organizada.
          </p>
          <nav className="nav" style={styles.nav}>
            <a href="#primeiros-passos" style={styles.navLink}>Primeiros passos</a>
            <a href="#visao-geral" style={styles.navLink}>Visão geral do sistema</a>
            <a href="#crm" style={styles.navLink}>CRM Operacional</a>
            <a href="#inteligencia" style={styles.navLink}>Inteligência</a>
            <a href="#email" style={styles.navLink}>Disparos de E-mail</a>
            <a href="#operacao" style={styles.navLink}>Como operar na prática</a>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <div className="container" style={styles.container}>
          <section id="primeiros-passos" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>Etapa obrigatória</div>
            <div className="module-header" style={styles.moduleHeader}>
              <h2 style={styles.h2}>Primeiros passos</h2>
              <p style={styles.moduleText}>
                Antes de explorar qualquer módulo, o sistema precisa entender o perfil da sua empresa e recalcular o score das oportunidades disponíveis. Sem essa configuração inicial, a experiência perde precisão.
              </p>
            </div>

            <div className="grid" style={styles.grid}>
              <article className="step-card blue" style={styles.stepCard}>
                <div className="step-head" style={styles.stepHead}>
                  <div className="step-icon" style={{ ...styles.stepIcon, ...blueTheme.icon }}>⚙</div>
                  <div>
                    <div className="step-meta" style={{ ...styles.stepMeta, ...blueTheme.meta }}>Passo 1 — Obrigatório</div>
                    <h3 style={styles.h3}>Configure seu Perfil Estratégico</h3>
                    <p style={styles.cardText}>Este é o passo mais importante. É ele que define como o sistema vai interpretar as oportunidades para a sua empresa.</p>
                  </div>
                </div>
                <div className="step-body" style={styles.stepBody}>
                  <ol className="step-list" style={styles.listReset}>
                    <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>1</span>
                      <div><strong>Acesse:</strong> menu lateral → Perfil Estratégico.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>2</span>
                      <div><strong>Preencha os dados da empresa:</strong> razão social, CNPJ, segmento principal e subsegmentos do que você vende.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>3</span>
                      <div><strong>Defina palavras-chave positivas:</strong> termos que identificam oportunidades relevantes para sua empresa.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>4</span>
                      <div><strong>Defina palavras-chave negativas:</strong> termos que ajudam a eliminar oportunidades irrelevantes.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>5</span>
                      <div><strong>Configure ticket mínimo e máximo:</strong> assim o sistema considera sua capacidade financeira e comercial.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>6</span>
                      <div><strong>Selecione estados de atuação:</strong> escolha onde sua empresa realmente pode operar.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>7</span>
                      <div><strong>Marque as modalidades aceitas:</strong> deixe selecionadas apenas as modalidades em que sua empresa participa.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...blueTheme.num }}>8</span>
                      <div><strong>Salve o perfil:</strong> o sistema passa a usar essa configuração como base para o Match IA.</div>
                    </li>
                  </ol>
                  <div className="tip" style={{ ...styles.tip, ...blueTheme.tip }}>
                    Quanto mais preciso for o Perfil Estratégico, melhor será a qualidade dos resultados. Revise palavras-chave, regiões e modalidades com atenção.
                  </div>
                </div>
              </article>

              <article className="step-card green" style={styles.stepCard}>
                <div className="step-head" style={styles.stepHead}>
                  <div className="step-icon" style={{ ...styles.stepIcon, ...greenTheme.icon }}>◎</div>
                  <div>
                    <div className="step-meta" style={{ ...styles.stepMeta, ...greenTheme.meta }}>Passo 2 — Obrigatório</div>
                    <h3 style={styles.h3}>Recalcule o Score em Oportunidades</h3>
                    <p style={styles.cardText}>Depois de salvar o Perfil Estratégico, o sistema precisa reprocessar as oportunidades ativas com base nessa configuração.</p>
                  </div>
                </div>
                <div className="step-body" style={styles.stepBody}>
                  <ol className="step-list" style={styles.listReset}>
                    <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}>
                      <span className="num" style={{ ...styles.num, ...greenTheme.num }}>1</span>
                      <div><strong>Acesse:</strong> menu lateral → Oportunidades.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...greenTheme.num }}>2</span>
                      <div><strong>Clique em Recalcular Score:</strong> o botão fica no canto superior direito da tela.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...greenTheme.num }}>3</span>
                      <div><strong>Aguarde o processamento:</strong> o sistema analisa as oportunidades ativas em relação ao seu perfil.</div>
                    </li>
                    <li style={styles.stepLi}>
                      <span className="num" style={{ ...styles.num, ...greenTheme.num }}>4</span>
                      <div><strong>Verifique os resultados:</strong> oportunidades com aderência mais alta passam a ser priorizadas.</div>
                    </li>
                  </ol>
                  <div className="tip" style={{ ...styles.tip, ...greenTheme.tip }}>
                    Sempre que alterar o Perfil Estratégico, repita este processo. É isso que mantém o sistema alinhado com o foco real da sua empresa.
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="visao-geral" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>Depois da configuração inicial</div>
            <div className="intro-card" style={styles.introCard}>
              <h3 style={{ marginTop: 0, fontSize: 24 }}>Agora você pode entender o sistema como um todo</h3>
              <p style={styles.cardText}>
                Depois de configurar o Perfil Estratégico e recalcular o score, o CM Pro passa a funcionar de forma prática para sua operação. A lógica do sistema é simples:
              </p>
              <div className="highlight-box" style={styles.highlightBox}>
                <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>Fluxo principal do produto</strong>
                <p style={{ margin: 0, color: colors.muted, fontSize: 15 }}>Inteligência identifica oportunidades relevantes, o CRM organiza o relacionamento com as prefeituras e os Disparos de E-mail ajudam sua empresa a atuar de forma ativa no mercado.</p>
              </div>
            </div>
          </section>

          <section id="crm" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>CRM Operacional</div>
            <div className="module-header" style={styles.moduleHeader}>
              <h2 style={styles.h2}>Organização comercial da sua empresa</h2>
              <p style={styles.moduleText}>
                O CRM Operacional é o núcleo de gestão comercial do CM Pro. É aqui que sua empresa acompanha o relacionamento com prefeituras, registra contatos, negociações, propostas, contratos e ações do dia a dia.
              </p>
            </div>

            <div className="grid grid-3" style={styles.grid3}>
              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Dashboard</h3>
                <p style={styles.cardText}>Apresenta uma visão rápida dos principais indicadores da operação comercial e da inteligência do sistema.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>andamento do funil de vendas</li>
                  <li style={styles.li}>volume de propostas em aberto</li>
                  <li style={styles.li}>contratos registrados</li>
                  <li style={styles.li}>oportunidades recentes e visão geral da operação</li>
                </ul>
              </article>

              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Funil de Vendas</h3>
                <p style={styles.cardText}>Organiza o estágio de cada negociação com prefeituras ao longo do processo comercial.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>acompanha a evolução de cada negociação</li>
                  <li style={styles.li}>ajuda a visualizar prioridades comerciais</li>
                  <li style={styles.li}>centraliza o andamento das oportunidades em aberto</li>
                  <li style={styles.li}>deve ser usado conforme os estágios configurados no seu ambiente</li>
                </ul>
              </article>

              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Prefeituras</h3>
                <p style={styles.cardText}>É a base do relacionamento comercial da empresa.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>cada prefeitura é um órgão</li>
                  <li style={styles.li}>centraliza o histórico de relacionamento</li>
                  <li style={styles.li}>serve como referência para propostas e contatos</li>
                </ul>
              </article>

              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Contatos</h3>
                <p style={styles.cardText}>São as pessoas dentro das prefeituras.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>secretários</li>
                  <li style={styles.li}>responsáveis por compras</li>
                  <li style={styles.li}>equipes técnicas</li>
                  <li style={styles.li}>pontos de relacionamento do órgão</li>
                </ul>
              </article>

              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Propostas</h3>
                <p style={styles.cardText}>Organizam as negociações em andamento.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>controle do que foi enviado</li>
                  <li style={styles.li}>acompanhamento do status comercial</li>
                  <li style={styles.li}>vínculo com a prefeitura</li>
                </ul>
              </article>

              <article className="feature-card blue-top" style={{ ...styles.featureCard, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Contratos</h3>
                <p style={styles.cardText}>Registram os negócios fechados.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>histórico de vendas</li>
                  <li style={styles.li}>controle de contratos ativos</li>
                  <li style={styles.li}>consolidação de resultado comercial</li>
                </ul>
              </article>
            </div>

            <div className="grid" style={{ ...styles.grid, marginTop: 18 }}>
              <article className="card" style={styles.card}>
                <h3 style={styles.h3}>Minhas Ações</h3>
                <p style={styles.cardText}>É a área usada para organizar as tarefas e pendências da rotina comercial.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>registro de follow-ups</li>
                  <li style={styles.li}>controle de pendências operacionais</li>
                  <li style={styles.li}>organização das próximas ações da equipe</li>
                  <li style={styles.li}>uso recomendado para não deixar negociações sem acompanhamento</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="inteligencia" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>Inteligência</div>
            <div className="module-header" style={styles.moduleHeader}>
              <h2 style={styles.h2}>O ponto de partida da operação</h2>
              <p style={styles.moduleText}>
                A área de Inteligência é onde o CM Pro cruza dados públicos com o Perfil Estratégico da sua empresa para destacar oportunidades com maior aderência e reduzir o tempo gasto com análise irrelevante.
              </p>
            </div>

            <div className="grid grid-2" style={styles.grid2}>
              <article className="feature-card purple-top" style={{ ...styles.featureCard, ...topBorder(colors.purple) }}>
                <h3 style={styles.h3}>Oportunidades</h3>
                <p style={styles.cardText}>Mostra as licitações disponíveis para análise, acompanhadas de score de aderência com base no Perfil Estratégico.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>use o filtro <strong>Alta Aderência</strong> para priorizar o que faz mais sentido</li>
                  <li style={styles.li}>score acima de 70% indica oportunidade com aderência mais alta</li>
                  <li style={styles.li}>mostra título, órgão responsável, valor estimado e modalidade</li>
                  <li style={styles.li}>apresenta o motivo do match para apoiar a análise</li>
                </ul>
              </article>

              <article className="feature-card purple-top" style={{ ...styles.featureCard, ...topBorder(colors.purple) }}>
                <h3 style={styles.h3}>Perfil Estratégico</h3>
                <p style={styles.cardText}>É a configuração que define como o sistema interpreta oportunidades para a sua empresa.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>o que sua empresa vende</li>
                  <li style={styles.li}>palavras-chave positivas e negativas</li>
                  <li style={styles.li}>ticket</li>
                  <li style={styles.li}>regiões de atuação</li>
                  <li style={styles.li}>modalidades aceitas</li>
                </ul>
              </article>

              <article className="feature-card purple-top" style={{ ...styles.featureCard, ...topBorder(colors.purple) }}>
                <h3 style={styles.h3}>Análise de Mercado</h3>
                <p style={styles.cardText}>Entrega uma visão geral das oportunidades disponíveis e da distribuição do mercado.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>volume de oportunidades</li>
                  <li style={styles.li}>distribuição por estado</li>
                  <li style={styles.li}>comportamento do mercado</li>
                  <li style={styles.li}>apoio para decisões estratégicas</li>
                </ul>
              </article>

              <article className="feature-card purple-top" style={{ ...styles.featureCard, ...topBorder(colors.purple) }}>
                <h3 style={styles.h3}>Relatórios</h3>
                <p style={styles.cardText}>Consolidam indicadores das oportunidades e da aderência ao longo do tempo.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>volume de oportunidades analisadas</li>
                  <li style={styles.li}>distribuição de aderência</li>
                  <li style={styles.li}>visão estruturada para tomada de decisão</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="email" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>Disparos de E-mail</div>
            <div className="module-header" style={styles.moduleHeader}>
              <h2 style={styles.h2}>Prospecção ativa e relacionamento em escala</h2>
              <p style={styles.moduleText}>
                Esta área permite que sua empresa se comunique com prefeituras de forma estruturada, usando a própria conta de e-mail da empresa e audiências segmentadas dentro do sistema.
              </p>
            </div>

            <div className="grid grid-3" style={styles.grid3}>
              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Campanhas</h3>
                <p style={styles.cardText}>Organizam a criação, revisão e disparo dos e-mails.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>assunto</li>
                  <li style={styles.li}>conteúdo</li>
                  <li style={styles.li}>audiência</li>
                  <li style={styles.li}>conta de envio</li>
                </ul>
              </article>

              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Audiências</h3>
                <p style={styles.cardText}>Definem para quem os e-mails serão enviados.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>segmentação por estado</li>
                  <li style={styles.li}>município</li>
                  <li style={styles.li}>porte</li>
                  <li style={styles.li}>secretaria ou área</li>
                </ul>
              </article>

              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Contas de envio</h3>
                <p style={styles.cardText}>São as contas SMTP da sua empresa utilizadas para realizar os disparos.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>Gmail</li>
                  <li style={styles.li}>Outlook</li>
                  <li style={styles.li}>servidor próprio</li>
                  <li style={styles.li}>teste a conexão antes de disparar qualquer campanha</li>
                </ul>
              </article>

              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Templates</h3>
                <p style={styles.cardText}>Facilitam a produção do conteúdo das campanhas.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>criação manual</li>
                  <li style={styles.li}>apoio de IA</li>
                  <li style={styles.li}>modelos para prospecção e relacionamento</li>
                </ul>
              </article>

              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Histórico</h3>
                <p style={styles.cardText}>Registra os envios realizados e o status de execução das campanhas.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>campanhas já enviadas</li>
                  <li style={styles.li}>quantidade de envios</li>
                  <li style={styles.li}>status de envio</li>
                </ul>
              </article>

              <article className="feature-card amber-top" style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Estatísticas</h3>
                <p style={styles.cardText}>Mostram o desempenho das campanhas enviadas.</p>
                <ul style={styles.ul}>
                  <li style={styles.li}>taxa de abertura</li>
                  <li style={styles.li}>cliques</li>
                  <li style={styles.li}>engajamento das campanhas</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="operacao" style={styles.section}>
            <div className="section-label" style={styles.sectionLabel}>Como operar o CM Pro na prática</div>
            <div className="module-header" style={styles.moduleHeader}>
              <h2 style={styles.h2}>Fluxo real de uso no dia a dia</h2>
              <p style={styles.moduleText}>
                Depois da configuração inicial, o CM Pro pode ser usado por dois caminhos principais: quando a oportunidade já existe e quando sua empresa quer atuar de forma antecipada no mercado.
              </p>
            </div>

            <div className="journey" style={styles.journey}>
              <article className="flow-card purple-top" style={{ ...styles.card, ...topBorder(colors.purple) }}>
                <h3 style={styles.h3}>Caminho 1: Captação de Oportunidades</h3>
                <p style={styles.cardText}>Quando sua empresa identifica uma licitação relevante e quer levar isso para a operação comercial.</p>
                <ol className="timeline-list" style={styles.listReset}>
                  <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}><span className="num" style={timelineNum(colors.purple)}>1</span><div><strong>Acesse Oportunidades:</strong> filtre por alta aderência.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.purple)}>2</span><div><strong>Analise a licitação:</strong> valor, prazo, escopo e órgão responsável.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.purple)}>3</span><div><strong>Leve para o CRM:</strong> localize ou adicione a prefeitura e registre contatos.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.purple)}>4</span><div><strong>Crie uma proposta:</strong> organize a negociação e acompanhe no funil.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.purple)}>5</span><div><strong>Registre ações:</strong> follow-ups, tarefas e próximos passos.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.purple)}>6</span><div><strong>Converta em contrato:</strong> quando o negócio for fechado.</div></li>
                </ol>
              </article>

              <article className="flow-card amber-top" style={{ ...styles.card, ...topBorder(colors.amber) }}>
                <h3 style={styles.h3}>Caminho 2: Prospecção Ativa</h3>
                <p style={styles.cardText}>Quando sua empresa quer gerar relacionamento antes mesmo da licitação acontecer.</p>
                <ol className="timeline-list" style={styles.listReset}>
                  <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}><span className="num" style={timelineNum(colors.amber)}>1</span><div><strong>Configure e teste a conta SMTP:</strong> acesse Contas de envio, preencha os dados e clique em Testar Conexão antes de avançar.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.amber)}>2</span><div><strong>Monte a audiência:</strong> segmentando por região, município ou secretaria.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.amber)}>3</span><div><strong>Crie a campanha:</strong> com conteúdo manual ou com apoio de IA.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.amber)}>4</span><div><strong>Revise e dispare:</strong> validando conta, público e mensagem.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.amber)}>5</span><div><strong>Acompanhe as estatísticas:</strong> abertura, cliques e engajamento.</div></li>
                  <li style={styles.stepLi}><span className="num" style={timelineNum(colors.amber)}>6</span><div><strong>Ajuste sua abordagem:</strong> com base no que performou melhor.</div></li>
                </ol>
              </article>
            </div>

            <div className="grid" style={{ ...styles.grid, marginTop: 18 }}>
              <article className="note-card" style={styles.card}>
                <h3 style={styles.h3}>Rotina recomendada</h3>
                <div className="grid grid-3" style={{ ...styles.grid3, marginTop: 10 }}>
                  <div>
                    <strong style={{ display: "block", marginBottom: 8, color: "#0f172a" }}>Diário</strong>
                    <ul style={styles.ul}>
                      <li style={styles.li}>verificar oportunidades com alta aderência</li>
                      <li style={styles.li}>atualizar funil de vendas</li>
                      <li style={styles.li}>revisar Minhas Ações</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 8, color: "#0f172a" }}>Semanal</strong>
                    <ul style={styles.ul}>
                      <li style={styles.li}>ajustar o Perfil Estratégico se necessário</li>
                      <li style={styles.li}>rodar campanhas segmentadas</li>
                      <li style={styles.li}>avaliar desempenho comercial</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 8, color: "#0f172a" }}>Mensal</strong>
                    <ul style={styles.ul}>
                      <li style={styles.li}>revisar estratégia de atuação</li>
                      <li style={styles.li}>analisar resultados do período</li>
                      <li style={styles.li}>ajustar palavras-chave, regiões e foco</li>
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section style={styles.section}>
            <div className="footer-help" style={styles.footerHelp}>
              <div style={{ fontSize: 24, lineHeight: 1 }}>?</div>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>Precisa de ajuda?</h3>
                <p style={styles.footerHelpText}>Se sua equipe precisar de apoio para configurar o sistema ou organizar a operação, entre em contato com a equipe do CM Pro pelo WhatsApp: (11) 3280-7010.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
