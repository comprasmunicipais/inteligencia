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
    marginBottom: 40,
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
    marginBottom: 20,
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
    marginBottom: 14,
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
    marginBottom: 14,
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
  confirm: {
    marginTop: 18,
    padding: "14px 16px",
    borderRadius: 12,
    fontSize: 14,
    border: "1px solid",
    background: "#e3faf0",
    borderColor: "rgba(14, 159, 110, 0.25)",
    color: "#065f46",
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
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
  pillarGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    marginTop: 14,
  },
  pillar: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: "16px 18px",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    boxShadow: colors.shadow,
  },
  pillarIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 1,
  },
  pillarLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  pillarDesc: {
    fontSize: 13,
    color: colors.muted,
    margin: 0,
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
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={styles.page}>
        <header style={styles.hero}>
          <div style={styles.container}>
            <span style={styles.badge}>Guia de uso</span>
            <h1 style={styles.heroTitle}>Como usar o CM Pro</h1>
            <p style={styles.heroText}>
              Um guia passo a passo para você começar a usar o sistema, mesmo que nunca tenha usado uma ferramenta desse tipo antes.
            </p>
            <nav style={styles.nav}>
              <a href="#antes" style={styles.navLink}>Antes de tudo</a>
              <a href="#primeiros-passos" style={styles.navLink}>Primeiros passos</a>
              <a href="#crm" style={styles.navLink}>CRM</a>
              <a href="#inteligencia" style={styles.navLink}>Inteligência</a>
              <a href="#email" style={styles.navLink}>Disparos de E-mail</a>
              <a href="#dia-a-dia" style={styles.navLink}>Dia a dia</a>
            </nav>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.container}>

            {/* ANTES DE TUDO */}
            <section id="antes" style={styles.section}>
              <div style={styles.sectionLabel}>Antes de tudo</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>O que é o CM Pro e para que ele serve</h2>
                <p style={styles.moduleText}>
                  Antes de abrir qualquer tela, entenda o que você vai encontrar aqui.
                </p>
              </div>

              <div style={styles.introCard}>
                <h3 style={{ ...styles.h3, marginBottom: 10 }}>O CM Pro não é um sistema de alertas</h3>
                <p style={{ ...styles.cardText, marginBottom: 0 }}>
                  Você provavelmente já recebe alertas de licitações por e-mail ou WhatsApp. O CM Pro começa onde o alerta termina: ele te ajuda a organizar o que fazer depois que você recebe a oportunidade. Aqui você gerencia o relacionamento com as prefeituras, acompanha suas propostas, dispara e-mails de prospecção e decide para onde direcionar sua energia comercial.
                </p>
              </div>

              <div style={styles.pillarGrid}>
                <div style={styles.pillar}>
                  <div style={styles.pillarIcon}>🎯</div>
                  <div>
                    <div style={styles.pillarLabel}>Captação de oportunidades</div>
                    <p style={styles.pillarDesc}>Veja quais licitações têm mais a ver com a sua empresa</p>
                  </div>
                </div>
                <div style={styles.pillar}>
                  <div style={styles.pillarIcon}>🏛</div>
                  <div>
                    <div style={styles.pillarLabel}>Gestão de prefeituras</div>
                    <p style={styles.pillarDesc}>Acompanhe negociações, contatos e contratos com cada município</p>
                  </div>
                </div>
                <div style={styles.pillar}>
                  <div style={styles.pillarIcon}>📧</div>
                  <div>
                    <div style={styles.pillarLabel}>Disparo de e-mail</div>
                    <p style={styles.pillarDesc}>Envie campanhas direto para dezenas de milhares de prefeituras</p>
                  </div>
                </div>
              </div>
            </section>

            {/* PRIMEIROS PASSOS */}
            <section id="primeiros-passos" style={styles.section}>
              <div style={styles.sectionLabel}>Etapa obrigatória</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>Primeiros passos</h2>
                <p style={styles.moduleText}>
                  Faça isso antes de usar qualquer outra parte do sistema. Sem essa configuração, o CM Pro não sabe o que sua empresa vende e não consegue te mostrar as oportunidades certas.
                </p>
              </div>

              {/* Passo 1 */}
              <article style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <div style={{ ...styles.stepIcon, ...blueTheme.icon }}>⚙</div>
                  <div>
                    <div style={{ ...styles.stepMeta, ...blueTheme.meta }}>Passo 1 — Obrigatório</div>
                    <h3 style={styles.h3}>Configure o Perfil Estratégico</h3>
                    <p style={styles.cardText}>
                      O Perfil Estratégico é o coração do sistema. É como se você estivesse preenchendo um cadastro que diz ao CM Pro: "minha empresa vende isso, atua nessas regiões e aceita essas modalidades." Com base nisso, o sistema passa a filtrar e pontuar as licitações para você.
                    </p>
                  </div>
                </div>
                <div style={styles.stepBody}>
                  <ol style={styles.listReset}>
                    <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>1</span>
                      <div>
                        <strong>Abra o menu lateral</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>No lado esquerdo da tela, clique em "Perfil Estratégico".</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>2</span>
                      <div>
                        <strong>Informe os dados da empresa</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Razão social, CNPJ e o segmento principal do que você vende (ex: tecnologia, saúde, obras, limpeza).</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>3</span>
                      <div>
                        <strong>Digite palavras-chave positivas</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>São os termos que aparecem em licitações que interessam a sua empresa. Exemplos: "software", "licença de uso", "sistema de gestão". Quanto mais específico, melhor.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>4</span>
                      <div>
                        <strong>Digite palavras-chave negativas</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>São termos que aparecem em licitações que não têm nada a ver com você. Isso ajuda a eliminar resultados irrelevantes. Exemplo: se você vende software, pode adicionar "pavimentação" como palavra negativa.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>5</span>
                      <div>
                        <strong>Defina o valor mínimo e máximo das licitações</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Qual é o menor contrato que compensa para sua empresa participar? E o maior que você consegue atender? Isso filtra oportunidades fora do seu porte.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>6</span>
                      <div>
                        <strong>Escolha os estados onde você atua</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Se sua empresa não consegue atender o Acre, não precisa ver licitações do Acre. Marque apenas os estados onde você realmente opera.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>7</span>
                      <div>
                        <strong>Selecione as modalidades que você participa</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Modalidades são os tipos de processo de compra pública (pregão eletrônico, dispensa, etc.). Se tiver dúvida, deixe todas marcadas por enquanto e ajuste depois.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...blueTheme.num }}>8</span>
                      <div>
                        <strong>Clique em Salvar</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>O sistema grava suas preferências e já começa a usar essa configuração.</span>
                      </div>
                    </li>
                  </ol>
                  <div style={styles.confirm}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
                    <div><strong>Como saber que deu certo:</strong> após salvar, o sistema não exibe erro. Se quiser confirmar, reabra o Perfil Estratégico — seus dados devem aparecer preenchidos.</div>
                  </div>
                </div>
              </article>

              {/* Passo 2 */}
              <article style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <div style={{ ...styles.stepIcon, ...greenTheme.icon }}>◎</div>
                  <div>
                    <div style={{ ...styles.stepMeta, ...greenTheme.meta }}>Passo 2 — Obrigatório</div>
                    <h3 style={styles.h3}>Recalcule o Score das Oportunidades</h3>
                    <p style={styles.cardText}>
                      Depois de salvar o Perfil Estratégico, o sistema ainda não aplicou suas preferências nas licitações. Você precisa pedir para ele fazer isso agora. É um processo automático que leva alguns segundos.
                    </p>
                  </div>
                </div>
                <div style={styles.stepBody}>
                  <ol style={styles.listReset}>
                    <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}>
                      <span style={{ ...styles.num, ...greenTheme.num }}>1</span>
                      <div>
                        <strong>Acesse o menu "Oportunidades"</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Clique em "Oportunidades" no menu lateral esquerdo.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...greenTheme.num }}>2</span>
                      <div>
                        <strong>Localize o botão "Recalcular Score"</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Ele fica no canto superior direito da tela. Se não encontrar, role a página para cima.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...greenTheme.num }}>3</span>
                      <div>
                        <strong>Clique no botão e aguarde</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>O sistema vai analisar todas as licitações ativas com base no que você configurou. Isso leva alguns segundos.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, ...greenTheme.num }}>4</span>
                      <div>
                        <strong>Veja as oportunidades com pontuação</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Agora cada licitação terá um score (de 0 a 100%). Use o filtro "Alta Aderência" para ver só as que mais combinam com sua empresa.</span>
                      </div>
                    </li>
                  </ol>
                  <div style={styles.confirm}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
                    <div><strong>Como saber que deu certo:</strong> as oportunidades vão exibir uma porcentagem ao lado de cada item. Score acima de 70% indica boa compatibilidade com sua empresa.</div>
                  </div>
                  <div style={{ ...styles.tip, ...greenTheme.tip, marginTop: 14 }}>
                    Toda vez que você alterar o Perfil Estratégico, repita esse processo. É isso que mantém o sistema atualizado com o foco atual da sua empresa.
                  </div>
                </div>
              </article>
            </section>

            {/* CRM */}
            <section id="crm" style={styles.section}>
              <div style={styles.sectionLabel}>CRM Operacional</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>Onde você organiza o relacionamento com as prefeituras</h2>
                <p style={styles.moduleText}>
                  O CRM é a parte do sistema onde você registra e acompanha tudo que acontece com cada prefeitura: contatos feitos, propostas enviadas, negociações em andamento e contratos fechados.
                </p>
              </div>

              <div style={{ ...styles.card, marginBottom: 14 }}>
                <h3 style={{ ...styles.h3, marginBottom: 16 }}>O que você vai encontrar no CRM</h3>
                <div style={styles.grid2}>
                  {[
                    {
                      title: "Dashboard",
                      desc: "A tela inicial com um resumo de tudo: quantas propostas estão em aberto, quantos contratos registrados e as oportunidades mais recentes. É o ponto de partida para entender como está a operação.",
                    },
                    {
                      title: "Funil de Vendas",
                      desc: "Mostra em que fase está cada negociação com as prefeituras. Pense nele como uma lista que vai de \"primeiro contato\" até \"contrato assinado\". Ajuda você a saber o que precisa de atenção agora.",
                    },
                    {
                      title: "Prefeituras",
                      desc: "É o cadastro de cada município com quem você se relaciona. Aqui fica o histórico completo: o que já foi feito, quem são os contatos, quais propostas foram enviadas.",
                    },
                    {
                      title: "Contatos",
                      desc: "São as pessoas dentro das prefeituras: secretários, responsáveis por compras, equipes técnicas. Você registra nome, cargo, telefone e e-mail de quem já teve contato com sua empresa.",
                    },
                    {
                      title: "Propostas",
                      desc: "Registro das negociações em andamento. Cada proposta fica vinculada a uma prefeitura e você acompanha se foi aceita, recusada ou ainda está em análise.",
                    },
                    {
                      title: "Contratos",
                      desc: "Quando uma negociação é fechada, você registra o contrato aqui. Serve como histórico de vendas e controle do que está ativo.",
                    },
                  ].map((item) => (
                    <div key={item.title}>
                      <strong style={{ display: "block", marginBottom: 6, fontSize: 15 }}>{item.title}</strong>
                      <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...styles.card, ...topBorder(colors.blue) }}>
                <h3 style={styles.h3}>Minhas Ações</h3>
                <p style={styles.cardText}>
                  É a sua lista de tarefas dentro do CM Pro. Sempre que precisar fazer alguma coisa depois (ligar para alguém, enviar um documento, fazer um follow-up), registre aqui. Assim nenhuma negociação fica esquecida.
                </p>
                <ul style={styles.ul}>
                  <li style={styles.li}>Registre o que precisa ser feito e quando</li>
                  <li style={styles.li}>Vincule a ação a uma prefeitura específica</li>
                  <li style={styles.li}>Marque como concluído quando fizer</li>
                </ul>
                <div style={{ ...styles.tip, ...{ background: colors.blueSoft, borderColor: "rgba(26, 86, 219, 0.18)" } }}>
                  Dica: revise suas ações abertas toda manhã antes de começar o dia. É o jeito mais simples de não deixar nenhuma negociação sem resposta.
                </div>
              </div>
            </section>

            {/* INTELIGÊNCIA */}
            <section id="inteligencia" style={styles.section}>
              <div style={styles.sectionLabel}>Inteligência</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>Onde você encontra as oportunidades</h2>
                <p style={styles.moduleText}>
                  A área de Inteligência é onde o sistema mostra as licitações disponíveis, já filtradas e pontuadas de acordo com o seu Perfil Estratégico.
                </p>
              </div>

              <div style={styles.grid2}>
                {[
                  {
                    title: "Oportunidades",
                    desc: "A lista de licitações ativas, com pontuação de aderência ao lado de cada uma.",
                    items: [
                      "Use o filtro \"Alta Aderência\" para ver primeiro as mais relevantes",
                      "Clique em qualquer oportunidade para ver o detalhamento completo",
                      "O sistema mostra o motivo pelo qual aquela licitação foi pontuada assim",
                      "Score acima de 70% indica boa compatibilidade com sua empresa",
                    ],
                  },
                  {
                    title: "Análise de Mercado",
                    desc: "Uma visão geral do que está acontecendo no mercado de licitações para prefeituras.",
                    items: [
                      "Volume total de oportunidades disponíveis",
                      "Distribuição por estado",
                      "Ajuda a identificar onde há mais demanda para o que você vende",
                    ],
                  },
                  {
                    title: "Perfil Estratégico",
                    desc: "O mesmo que você configurou nos primeiros passos. Você pode voltar aqui a qualquer momento para ajustar palavras-chave, regiões ou ticket.",
                    items: [],
                  },
                  {
                    title: "Relatórios",
                    desc: "Resumos do que o sistema encontrou ao longo do tempo: quantas oportunidades foram analisadas, como se distribuem as aderências, evolução mês a mês.",
                    items: [],
                  },
                ].map((item) => (
                  <div key={item.title} style={{ ...styles.featureCard, ...topBorder(colors.purple) }}>
                    <h3 style={styles.h3}>{item.title}</h3>
                    <p style={styles.cardText}>{item.desc}</p>
                    {item.items.length > 0 && (
                      <ul style={styles.ul}>
                        {item.items.map((li) => (
                          <li key={li} style={styles.li}>{li}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* EMAIL */}
            <section id="email" style={styles.section}>
              <div style={styles.sectionLabel}>Disparos de E-mail</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>Como enviar e-mails para prefeituras</h2>
                <p style={styles.moduleText}>
                  Uma das funcionalidades mais poderosas do CM Pro: você envia e-mails de prospecção diretamente para dezenas de milhares de prefeituras, segmentando por estado, porte, secretaria e mais. Tudo pela sua própria conta de e-mail.
                </p>
              </div>

              <article style={{ ...styles.stepCard, marginBottom: 14 }}>
                <div style={styles.stepHead}>
                  <div style={{ ...styles.stepIcon, background: "#fef3c7", color: colors.amber }}>✉</div>
                  <div>
                    <div style={{ ...styles.stepMeta, color: colors.amber, background: "#fef3c7", border: "1px solid rgba(227, 160, 8, 0.25)" }}>Como funciona na prática</div>
                    <h3 style={styles.h3}>Antes de enviar qualquer e-mail, configure três coisas</h3>
                    <p style={styles.cardText}>Siga essa ordem e o disparo vai funcionar sem problemas.</p>
                  </div>
                </div>
                <div style={styles.stepBody}>
                  <ol style={styles.listReset}>
                    <li style={{ ...styles.stepLi, borderTop: 0, paddingTop: 0 }}>
                      <span style={{ ...styles.num, background: colors.amber }}>1</span>
                      <div>
                        <strong>Conta de envio</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>É o e-mail da sua empresa que vai ser usado para disparar as mensagens (Gmail, Outlook ou servidor próprio). Acesse "Contas de envio", preencha os dados e clique em "Testar Conexão" para confirmar que está funcionando antes de avançar.</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, background: colors.amber }}>2</span>
                      <div>
                        <strong>Audiência</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>Para quem você quer enviar. Você pode filtrar por estado, município, porte da prefeitura (pequena, média, grande) ou secretaria (saúde, educação, compras, etc.).</span>
                      </div>
                    </li>
                    <li style={styles.stepLi}>
                      <span style={{ ...styles.num, background: colors.amber }}>3</span>
                      <div>
                        <strong>Campanha</strong><br />
                        <span style={{ fontSize: 14, color: colors.muted }}>O e-mail em si: assunto, conteúdo e qual conta vai enviar. Você pode criar o conteúdo manualmente ou usar o apoio de IA para gerar um texto de prospecção.</span>
                      </div>
                    </li>
                  </ol>
                  <div style={{ ...styles.tip, background: colors.blueSoft, borderColor: "rgba(26, 86, 219, 0.18)", marginTop: 14 }}>
                    Sempre teste a conexão da conta de envio antes de disparar qualquer campanha. Um e-mail enviado de uma conta com problema não chega ao destinatário.
                  </div>
                </div>
              </article>

              <div style={styles.grid3}>
                {[
                  { title: "Templates", desc: "Modelos prontos de e-mail que você pode reutilizar. Economizam tempo quando você vai fazer campanhas frequentes com conteúdo parecido." },
                  { title: "Histórico", desc: "Todas as campanhas que já foram enviadas, com data, quantidade de destinatários e status de envio." },
                  { title: "Estatísticas", desc: "Desempenho das campanhas: quantos abriram, quantos clicaram. Serve para entender qual abordagem funciona melhor." },
                ].map((item) => (
                  <div key={item.title} style={{ ...styles.featureCard, ...topBorder(colors.amber) }}>
                    <h3 style={{ ...styles.h3, fontSize: 17 }}>{item.title}</h3>
                    <p style={{ ...styles.cardText, marginBottom: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* DIA A DIA */}
            <section id="dia-a-dia" style={styles.section}>
              <div style={styles.sectionLabel}>Como operar na prática</div>
              <div style={styles.moduleHeader}>
                <h2 style={styles.h2}>O que fazer depois que tudo está configurado</h2>
                <p style={styles.moduleText}>
                  Com o Perfil Estratégico salvo e o score calculado, o CM Pro passa a funcionar como sua central de operação comercial. Existem dois caminhos principais de uso:
                </p>
              </div>

              <div style={styles.journey}>
                <div style={{ ...styles.card, ...topBorder(colors.purple) }}>
                  <h3 style={styles.h3}>Quando você recebe um alerta de licitação</h3>
                  <p style={{ ...styles.cardText }}>Use esse fluxo quando uma oportunidade aparece e você quer agir sobre ela.</p>
                  <ol style={styles.listReset}>
                    {[
                      ["Abra Oportunidades", "filtre por alta aderência"],
                      ["Analise a licitação", "valor estimado, prazo, escopo e qual prefeitura abriu"],
                      ["Vá para o CRM", "localize ou adicione essa prefeitura"],
                      ["Crie uma proposta", "vincule à prefeitura e mova para o funil"],
                      ["Registre as ações", "follow-ups, tarefas e próximos passos"],
                      ["Quando fechar", "converta a proposta em contrato"],
                    ].map(([bold, rest], i) => (
                      <li key={i} style={{ ...styles.stepLi, ...(i === 0 ? { borderTop: 0, paddingTop: 0 } : {}) }}>
                        <span style={timelineNum(colors.purple)}>{i + 1}</span>
                        <div><strong>{bold}:</strong> {rest}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div style={{ ...styles.card, ...topBorder(colors.amber) }}>
                  <h3 style={styles.h3}>Quando você quer prospectar antes da licitação</h3>
                  <p style={{ ...styles.cardText }}>Use esse fluxo para gerar relacionamento com prefeituras antes de uma licitação aparecer.</p>
                  <ol style={styles.listReset}>
                    {[
                      ["Configure e teste", "sua conta de e-mail em \"Contas de envio\""],
                      ["Monte a audiência", "escolha os estados, porte e secretaria que quer atingir"],
                      ["Crie a campanha", "com assunto e conteúdo (manual ou com IA)"],
                      ["Revise", "conta, público e mensagem antes de disparar"],
                      ["Acompanhe as estatísticas", "abertura, cliques e engajamento"],
                      ["Ajuste a abordagem", "com base no que performou melhor"],
                    ].map(([bold, rest], i) => (
                      <li key={i} style={{ ...styles.stepLi, ...(i === 0 ? { borderTop: 0, paddingTop: 0 } : {}) }}>
                        <span style={timelineNum(colors.amber)}>{i + 1}</span>
                        <div><strong>{bold}:</strong> {rest}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div style={{ ...styles.card, marginTop: 18 }}>
                <h3 style={styles.h3}>Rotina recomendada</h3>
                <p style={styles.cardText}>Se você nunca usou um sistema assim, comece com essa rotina simples:</p>
                <div style={styles.grid3}>
                  {[
                    {
                      label: "Todo dia",
                      items: [
                        "Veja as oportunidades com alta aderência",
                        "Revise suas ações abertas em \"Minhas Ações\"",
                        "Atualize o funil com o que avançou",
                      ],
                    },
                    {
                      label: "Toda semana",
                      items: [
                        "Dispare uma campanha de e-mail segmentada",
                        "Verifique as estatísticas da semana anterior",
                        "Ajuste palavras-chave do perfil se necessário",
                      ],
                    },
                    {
                      label: "Todo mês",
                      items: [
                        "Revise os relatórios de oportunidades",
                        "Analise quais estados geraram mais resultado",
                        "Ajuste a estratégia com base nos dados",
                      ],
                    },
                  ].map((col) => (
                    <div key={col.label}>
                      <strong style={{ display: "block", marginBottom: 10, color: colors.text }}>{col.label}</strong>
                      <ul style={{ ...styles.ul, listStyle: "none", paddingLeft: 0 }}>
                        {col.items.map((item) => (
                          <li key={item} style={{ ...styles.li, paddingLeft: 12, borderLeft: `2px solid ${colors.border}` }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <section style={styles.section}>
              <div style={styles.footerHelp}>
                <div style={{ fontSize: 24, lineHeight: 1 }}>?</div>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>Precisa de ajuda?</h3>
                  <p style={styles.footerHelpText}>
                    Se tiver dúvida em qualquer passo, entre em contato com a equipe do CM Pro pelo WhatsApp: (11) 3280-7010. Podemos ajudar você a configurar o sistema e organizar a operação.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  )
}
