export default function AppLandingPage() {
  const WA = 'https://wa.me/551132807010';

  const s = {
    page: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#0d0d0d',
      color: '#fff',
      minHeight: '100vh',
    } as React.CSSProperties,

    // NAV
    nav: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 40px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      background: '#0d0d0d',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    } as React.CSSProperties,
    logo: {
      fontSize: '22px',
      fontWeight: 900,
      color: '#9d7bff',
      letterSpacing: '-0.5px',
    } as React.CSSProperties,
    navBtn: {
      padding: '10px 20px',
      background: '#9d7bff',
      color: '#fff',
      borderRadius: '8px',
      fontWeight: 700,
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
    } as React.CSSProperties,

    // HERO
    hero: {
      textAlign: 'center',
      padding: '100px 24px 80px',
      maxWidth: '820px',
      margin: '0 auto',
    } as React.CSSProperties,
    heroTitle: {
      fontSize: 'clamp(32px, 5vw, 56px)',
      fontWeight: 900,
      lineHeight: 1.1,
      letterSpacing: '-1px',
      marginBottom: '24px',
    } as React.CSSProperties,
    heroSub: {
      fontSize: '18px',
      color: 'rgba(255,255,255,0.6)',
      lineHeight: 1.7,
      marginBottom: '40px',
      maxWidth: '620px',
      margin: '0 auto 40px',
    } as React.CSSProperties,
    heroBtns: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,
    btnPrimary: {
      padding: '16px 32px',
      background: '#9d7bff',
      color: '#fff',
      borderRadius: '10px',
      fontWeight: 800,
      fontSize: '15px',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
    } as React.CSSProperties,
    btnGhost: {
      padding: '16px 32px',
      background: 'transparent',
      color: '#fff',
      borderRadius: '10px',
      fontWeight: 700,
      fontSize: '15px',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
    } as React.CSSProperties,

    // SECTIONS
    section: {
      padding: '80px 24px',
    } as React.CSSProperties,
    sectionInner: {
      maxWidth: '960px',
      margin: '0 auto',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: 'clamp(24px, 3vw, 36px)',
      fontWeight: 900,
      marginBottom: '40px',
      letterSpacing: '-0.5px',
    } as React.CSSProperties,

    // DOR
    dorSection: {
      padding: '80px 24px',
      background: '#111',
    } as React.CSSProperties,
    dorList: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    } as React.CSSProperties,
    dorItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      fontSize: '17px',
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 1.5,
    } as React.CSSProperties,
    dorDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#9d7bff',
      flexShrink: 0,
      marginTop: '8px',
    } as React.CSSProperties,
    dorFinal: {
      fontSize: '18px',
      fontWeight: 800,
      color: '#9d7bff',
      marginTop: '8px',
    } as React.CSSProperties,

    // PILARES
    grid2x2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
    } as React.CSSProperties,
    card: {
      background: '#111',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '28px',
    } as React.CSSProperties,
    cardIcon: {
      width: '40px',
      height: '40px',
      marginBottom: '16px',
      color: '#9d7bff',
    } as React.CSSProperties,
    cardTitle: {
      fontSize: '17px',
      fontWeight: 800,
      marginBottom: '10px',
    } as React.CSSProperties,
    cardDesc: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.55)',
      lineHeight: 1.65,
    } as React.CSSProperties,

    // DIFERENCIAL
    difSection: {
      padding: '80px 24px',
      background: '#9d7bff',
    } as React.CSSProperties,
    difTitle: {
      fontSize: 'clamp(26px, 3.5vw, 40px)',
      fontWeight: 900,
      marginBottom: '32px',
      letterSpacing: '-0.5px',
    } as React.CSSProperties,
    difList: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '14px',
    } as React.CSSProperties,
    difItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '16px',
      fontWeight: 600,
    } as React.CSSProperties,
    difCheck: {
      width: '20px',
      height: '20px',
      background: 'rgba(255,255,255,0.25)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: '11px',
    } as React.CSSProperties,
    difClose: {
      fontSize: '17px',
      fontWeight: 700,
      opacity: 0.9,
    } as React.CSSProperties,

    // PARA QUEM
    paraQuemGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
    } as React.CSSProperties,
    paraQuemCard: {
      background: '#111',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '28px',
    } as React.CSSProperties,
    paraQuemTitle: {
      fontSize: '16px',
      fontWeight: 800,
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    } as React.CSSProperties,
    paraQuemList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    } as React.CSSProperties,
    paraQuemItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.7)',
      lineHeight: 1.5,
    } as React.CSSProperties,

    // PLANOS
    planosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      alignItems: 'start',
    } as React.CSSProperties,
    planoCard: {
      background: '#111',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '32px 28px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      position: 'relative',
    } as React.CSSProperties,
    planoCardPopular: {
      background: '#1a1a1a',
      border: '1px solid #9d7bff',
      borderRadius: '16px',
      padding: '32px 28px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      position: 'relative',
    } as React.CSSProperties,
    planoBadge: {
      position: 'absolute',
      top: '-13px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#9d7bff',
      color: '#fff',
      fontSize: '10px',
      fontWeight: 900,
      padding: '4px 14px',
      borderRadius: '20px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    planoName: {
      fontSize: '20px',
      fontWeight: 900,
    } as React.CSSProperties,
    planoFeatureList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
      flex: 1,
    } as React.CSSProperties,
    planoFeature: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      color: 'rgba(255,255,255,0.7)',
    } as React.CSSProperties,
    planoBtn: {
      display: 'block',
      textAlign: 'center' as const,
      padding: '13px',
      background: '#9d7bff',
      color: '#fff',
      borderRadius: '10px',
      fontWeight: 700,
      fontSize: '14px',
      textDecoration: 'none',
      marginTop: '8px',
    } as React.CSSProperties,
    planoBtnGhost: {
      display: 'block',
      textAlign: 'center' as const,
      padding: '13px',
      background: 'transparent',
      color: '#9d7bff',
      borderRadius: '10px',
      fontWeight: 700,
      fontSize: '14px',
      textDecoration: 'none',
      border: '1px solid #9d7bff',
      marginTop: '8px',
    } as React.CSSProperties,

    // CTA FINAL
    ctaSection: {
      padding: '100px 24px',
      textAlign: 'center',
      background: '#111',
    } as React.CSSProperties,
    ctaTitle: {
      fontSize: 'clamp(24px, 3.5vw, 40px)',
      fontWeight: 900,
      letterSpacing: '-0.5px',
      marginBottom: '40px',
      maxWidth: '700px',
      margin: '0 auto 40px',
      lineHeight: 1.2,
    } as React.CSSProperties,
    ctaBtns: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,

    // FOOTER
    footer: {
      padding: '32px 40px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'center',
      fontSize: '13px',
      color: 'rgba(255,255,255,0.35)',
    } as React.CSSProperties,
  };

  const pilares = [
    {
      title: 'Direcionamento inteligente',
      desc: 'Saiba exatamente onde focar sua energia. O CM Pro aponta as oportunidades com maior probabilidade de conversão para o seu perfil.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s.cardIcon}>
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      title: 'Organização comercial',
      desc: 'Pipeline, follow-ups e histórico de contatos centralizados. Chega de depender de planilhas e anotações soltas.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s.cardIcon}>
          <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      title: 'Prospecção ativa com base pronta',
      desc: 'Base completa de contatos de prefeituras do Brasil. Envie campanhas segmentadas sem precisar construir listas do zero.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s.cardIcon}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      title: 'Execução com apoio de IA',
      desc: 'Propostas, análises e abordagens geradas por inteligência artificial. Produza mais em menos tempo com qualidade profissional.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s.cardIcon}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <div style={s.page}>

      {/* NAV */}
      <nav style={s.nav}>
        <span style={s.logo}>CM PRO</span>
        <a href={WA} target="_blank" rel="noopener noreferrer" style={s.navBtn}>
          Falar com especialista
        </a>
      </nav>

      {/* HERO */}
      <section style={{ ...s.section, paddingTop: '100px', paddingBottom: '80px' }}>
        <div style={s.hero}>
          <h1 style={s.heroTitle}>
            Venda mais para prefeituras com organização, inteligência e direção clara
          </h1>
          <p style={s.heroSub}>
            O CM PRO identifica oportunidades, organiza sua operação comercial e te mostra onde focar para aumentar suas chances de fechar contratos.
          </p>
          <div style={s.heroBtns}>
            <a href="/signup" style={s.btnPrimary}>
              Começar gratuitamente
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={s.btnGhost}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* DOR */}
      <section style={s.dorSection}>
        <div style={s.sectionInner}>
          <h2 style={s.sectionTitle}>
            Se você vende para prefeituras, provavelmente já passou por isso:
          </h2>
          <ul style={s.dorList}>
            {[
              'Não sabe por onde começar',
              'Perde oportunidades por falta de organização',
              'Não tem clareza de onde focar',
              'Depende de planilhas e anotações soltas',
              'Não tem uma rotina comercial estruturada',
            ].map((item) => (
              <li key={item} style={s.dorItem}>
                <span style={s.dorDot} />
                {item}
              </li>
            ))}
          </ul>
          <p style={s.dorFinal}>O problema não é o mercado. É a falta de método.</p>
        </div>
      </section>

      {/* 4 PILARES */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <h2 style={s.sectionTitle}>Como o CM Pro resolve isso</h2>
          <div style={s.grid2x2}>
            {pilares.map((p) => (
              <div key={p.title} style={s.card}>
                {p.icon}
                <p style={s.cardTitle}>{p.title}</p>
                <p style={s.cardDesc}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section style={s.difSection}>
        <div style={s.sectionInner}>
          <h2 style={s.difTitle}>Você não começa do zero</h2>
          <ul style={s.difList}>
            {[
              'Base completa de prefeituras do Brasil',
              'Estrutura comercial pronta para uso',
              'Campanhas de abordagem já configuradas',
              'Direcionamento do que priorizar',
            ].map((item) => (
              <li key={item} style={s.difItem}>
                <span style={s.difCheck}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p style={s.difClose}>
            Enquanto a maioria ainda está tentando organizar, você já está executando.
          </p>
        </div>
      </section>

      {/* PARA QUEM É / NÃO É */}
      <section style={s.section}>
        <div style={s.sectionInner}>
          <h2 style={s.sectionTitle}>Para quem é o CM Pro</h2>
          <div style={s.paraQuemGrid}>
            <div style={s.paraQuemCard}>
              <p style={{ ...s.paraQuemTitle, color: '#9d7bff' }}>
                <span>✓</span> Para quem é
              </p>
              <ul style={s.paraQuemList}>
                {[
                  'Empresas que vendem ou querem vender para prefeituras',
                  'Times comerciais B2G que precisam de método e organização',
                  'Gestores que querem clareza sobre onde focar esforços',
                  'Quem quer usar IA para vender mais sem aumentar a equipe',
                ].map((item) => (
                  <li key={item} style={s.paraQuemItem}>
                    <span style={{ color: '#9d7bff', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={s.paraQuemCard}>
              <p style={{ ...s.paraQuemTitle, color: 'rgba(255,255,255,0.4)' }}>
                <span>✕</span> Para quem não é
              </p>
              <ul style={s.paraQuemList}>
                {[
                  'Quem busca resultados sem qualquer esforço comercial',
                  'Empresas sem interesse no mercado público municipal',
                  'Quem não quer seguir nenhuma estrutura de processo',
                  'Negócios que já têm um método bem consolidado e não querem mudar',
                ].map((item) => (
                  <li key={item} style={s.paraQuemItem}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section style={{ ...s.section, background: '#111' }}>
        <div style={s.sectionInner}>
          <h2 style={{ ...s.sectionTitle, textAlign: 'center' }}>Planos</h2>

          {/* Recursos comuns */}
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#9d7bff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Todos os planos incluem:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {[
                'Base completa de prefeituras do Brasil',
                'CRM comercial (pipeline, contatos, propostas, contratos)',
                'Monitoramento de oportunidades públicas',
                'Geração de propostas com IA',
                'Perfil estratégico com IA',
                'Análise de mercado',
                'Campanhas de e-mail marketing',
              ].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ color: '#9d7bff', flexShrink: 0 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={s.planosGrid}>
            {/* Essencial */}
            <div style={s.planoCard}>
              <p style={s.planoName}>Essencial</p>
              <ul style={s.planoFeatureList}>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> 10.000 e-mails/mês</li>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> 1 usuário</li>
                <li style={s.planoFeature}><span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span> Ideal para começar</li>
              </ul>
              <a href="/signup" style={s.planoBtnGhost}>
                Criar conta grátis
              </a>
            </div>

            {/* Profissional — popular */}
            <div style={s.planoCardPopular}>
              <span style={s.planoBadge}>Mais Popular</span>
              <p style={s.planoName}>Profissional</p>
              <ul style={s.planoFeatureList}>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> 25.000 e-mails/mês</li>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> 3 usuários</li>
                <li style={s.planoFeature}><span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span> Para equipes em crescimento</li>
              </ul>
              <a href="/signup" style={s.planoBtn}>
                Criar conta grátis
              </a>
            </div>

            {/* Elite */}
            <div style={s.planoCard}>
              <p style={s.planoName}>Elite</p>
              <ul style={s.planoFeatureList}>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> 50.000 e-mails/mês</li>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> Usuários ilimitados</li>
                <li style={s.planoFeature}><span style={{ color: '#9d7bff' }}>✓</span> Suporte prioritário</li>
                <li style={s.planoFeature}><span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span> Para operações de alto volume</li>
              </ul>
              <a href="/signup" style={s.planoBtnGhost}>
                Criar conta grátis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={s.ctaSection}>
        <div style={s.sectionInner}>
          <h2 style={s.ctaTitle}>
            O CM PRO não é um sistema. É uma forma organizada de vender para prefeituras.
          </h2>
          <div style={s.ctaBtns}>
            <a href="/signup" style={s.btnPrimary}>
              Começar gratuitamente
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={s.btnGhost}>
              Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        CM Pro © 2026 — Plataforma B2G
      </footer>

    </div>
  );
}
