export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Voltar
        </a>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: abril de 2026</p>

        <div className="mt-10 space-y-10 text-slate-700">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Objeto</h2>
            <p className="text-sm leading-relaxed">
              Estes Termos de Uso ("Termos") regulam o acesso e uso da plataforma{' '}
              <strong>CM Pro</strong>, um sistema SaaS de inteligência comercial e CRM voltado para
              empresas que vendem produtos e serviços para municípios brasileiros, operado por{' '}
              <strong>[DADO A PREENCHER — Razão Social]</strong>, CNPJ{' '}
              <strong>[DADO A PREENCHER]</strong> ("CM Pro", "nós").
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Ao criar uma conta ou acessar a plataforma, o usuário ("Contratante" ou "Usuário")
              declara ter lido, entendido e concordado com todos os termos e condições aqui descritos.
              Caso discorde de qualquer disposição, não utilize a plataforma.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Cadastro e conta</h2>
            <p className="text-sm leading-relaxed mb-2">
              Para acessar a plataforma, o Usuário deve:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li>
                Fornecer informações verídicas, completas e atualizadas no momento do cadastro,
                incluindo nome, e-mail corporativo, CNPJ e demais dados solicitados.
              </li>
              <li>
                Ser maior de 18 anos e ter capacidade jurídica para contratar em nome da empresa
                cadastrada.
              </li>
              <li>
                Manter a confidencialidade de suas credenciais de acesso. O Usuário é responsável
                por toda atividade realizada em sua conta.
              </li>
              <li>
                Notificar imediatamente o CM Pro em caso de acesso não autorizado à sua conta via{' '}
                <a href="mailto:suporte@comprasmunicipais.com.br" className="text-blue-600 underline">
                  suporte@comprasmunicipais.com.br
                </a>
                .
              </li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              O CM Pro reserva-se o direito de suspender ou encerrar contas com informações falsas ou
              que violem estes Termos.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              3. Planos, trial e pagamento
            </h2>
            <p className="text-sm leading-relaxed">
              <strong>Período de trial:</strong> Novos usuários têm acesso gratuito por{' '}
              <strong>7 dias</strong> com limite de 500 e-mails. Ao término do trial, é necessário
              contratar um dos planos disponíveis para manter o acesso.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>Planos pagos:</strong> Os planos Essencial, Profissional e Elite são cobrados
              de acordo com o ciclo escolhido (mensal, semestral ou anual). Os preços vigentes estão
              disponíveis na página de planos da plataforma.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>Pagamento:</strong> As cobranças são processadas via Asaas por PIX, boleto
              bancário ou cartão de crédito. A inadimplência por mais de <strong>5 dias úteis</strong>{' '}
              resultará na suspensão do acesso.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>Reembolsos:</strong> Não são concedidos reembolsos proporcionais por cancelamento
              antecipado de planos pagos, exceto nos casos previstos no Código de Defesa do
              Consumidor (CDC — Lei nº 8.078/1990).
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              <strong>Reajuste:</strong> Os preços podem ser reajustados com aviso prévio de{' '}
              <strong>30 dias</strong> por e-mail. O uso continuado após esse prazo constitui aceite
              dos novos valores.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              4. Obrigações do usuário
            </h2>
            <p className="text-sm leading-relaxed mb-2">O Usuário compromete-se a:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li>
                Utilizar a plataforma exclusivamente para fins lícitos e em conformidade com a
                legislação brasileira aplicável.
              </li>
              <li>
                Não utilizar os recursos de e-mail marketing para envio de spam, conteúdo enganoso
                ou mensagens não solicitadas em desacordo com a Lei nº 12.965/2014 (Marco Civil da
                Internet).
              </li>
              <li>
                Não tentar acessar áreas restritas da plataforma, realizar engenharia reversa ou
                comprometer a segurança do sistema.
              </li>
              <li>
                Não utilizar a plataforma para armazenar dados pessoais de terceiros sem a devida
                base legal exigida pela LGPD.
              </li>
              <li>
                Manter atualizados os dados cadastrais da empresa.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              5. Propriedade intelectual
            </h2>
            <p className="text-sm leading-relaxed">
              Todo o código-fonte, design, marca, logotipos, textos e demais elementos da plataforma
              CM Pro são de propriedade exclusiva do CM Pro ou de seus licenciadores. O uso da
              plataforma não transfere ao Usuário nenhum direito de propriedade intelectual.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Os dados inseridos pelo Usuário (contatos, propostas, contratos, etc.) permanecem de
              propriedade do Usuário. O CM Pro os utiliza exclusivamente para prestação dos serviços
              contratados.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              6. Disponibilidade e SLA
            </h2>
            <p className="text-sm leading-relaxed">
              O CM Pro envidará os melhores esforços para manter a plataforma disponível{' '}
              <strong>24/7</strong>, mas não garante disponibilidade ininterrupta. Janelas de
              manutenção serão comunicadas com antecedência sempre que possível.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              O CM Pro não se responsabiliza por indisponibilidades causadas por força maior, falhas
              em provedores de infraestrutura terceiros (AWS, Vercel, Supabase) ou ataques
              cibernéticos.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              7. Limitação de responsabilidade
            </h2>
            <p className="text-sm leading-relaxed">
              O CM Pro não se responsabiliza por:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm leading-relaxed">
              <li>
                Decisões comerciais tomadas com base nas informações e oportunidades exibidas na
                plataforma. Os dados do PNCP são de fonte pública e podem conter imprecisões.
              </li>
              <li>
                Resultados de campanhas de e-mail marketing enviadas pelo Usuário.
              </li>
              <li>
                Lucros cessantes, danos indiretos ou consequenciais decorrentes do uso ou
                impossibilidade de uso da plataforma.
              </li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              A responsabilidade máxima do CM Pro em qualquer hipótese fica limitada ao valor pago
              pelo Usuário nos últimos <strong>3 meses</strong> antes do evento gerador.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Rescisão</h2>
            <p className="text-sm leading-relaxed">
              O Usuário pode cancelar sua conta a qualquer momento por meio da aba "Assinatura" em
              Configurações. O acesso permanece ativo até o final do período já pago.
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              O CM Pro pode rescindir o contrato imediatamente, sem aviso prévio, nos seguintes casos:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1.5 text-sm leading-relaxed">
              <li>Violação destes Termos ou da Política de Privacidade.</li>
              <li>Uso fraudulento ou ilegal da plataforma.</li>
              <li>Inadimplência superior a 30 dias.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              9. Alterações nos Termos
            </h2>
            <p className="text-sm leading-relaxed">
              Estes Termos podem ser atualizados a qualquer momento. Usuários ativos serão
              notificados por e-mail com antecedência mínima de <strong>15 dias</strong> para
              alterações materiais. O uso continuado após esse prazo constitui aceite dos novos
              Termos.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              10. Lei aplicável e foro
            </h2>
            <p className="text-sm leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
              foro da <strong>Comarca de São Paulo — SP</strong> para dirimir quaisquer controvérsias
              decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais
              privilegiado que seja.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Contato</h2>
            <p className="text-sm leading-relaxed">
              Dúvidas sobre estes Termos:
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed">
              <li>
                <strong>E-mail:</strong>{' '}
                <a
                  href="mailto:juridico@comprasmunicipais.com.br"
                  className="text-blue-600 underline"
                >
                  juridico@comprasmunicipais.com.br
                </a>
              </li>
              <li><strong>Empresa:</strong> [DADO A PREENCHER — Razão Social]</li>
              <li><strong>CNPJ:</strong> [DADO A PREENCHER]</li>
              <li><strong>Endereço:</strong> [DADO A PREENCHER]</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
