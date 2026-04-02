export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Voltar
        </a>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: abril de 2026</p>

        <div className="mt-10 space-y-10 text-slate-700">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Quem somos</h2>
            <p className="text-sm leading-relaxed">
              O <strong>CM Pro</strong> é uma plataforma SaaS de inteligência comercial e CRM voltada para
              empresas que vendem para municípios brasileiros, operada por{' '}
              <strong>[DADO A PREENCHER — Razão Social]</strong>, CNPJ{' '}
              <strong>[DADO A PREENCHER]</strong>, com sede em{' '}
              <strong>[DADO A PREENCHER — Endereço completo]</strong>{' '}
              ("CM Pro", "nós" ou "nos").
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os
              dados pessoais de nossos usuários, em conformidade com a Lei Geral de Proteção de Dados
              Pessoais (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Dados que coletamos</h2>
            <p className="text-sm leading-relaxed mb-2">Coletamos as seguintes categorias de dados:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li>
                <strong>Dados de cadastro:</strong> nome, e-mail corporativo, razão social da empresa,
                CNPJ, telefone.
              </li>
              <li>
                <strong>Dados de acesso:</strong> endereço IP, tipo de navegador, sistema operacional,
                data e hora de login.
              </li>
              <li>
                <strong>Dados de uso:</strong> interações com a plataforma, filtros aplicados,
                campanhas criadas, contatos cadastrados, licitações visualizadas.
              </li>
              <li>
                <strong>Dados de pagamento:</strong> informações de faturamento processadas via
                gateway Asaas. Dados de cartão de crédito são tokenizados pelo gateway e nunca
                armazenados em nossos servidores.
              </li>
              <li>
                <strong>Dados de e-mail marketing:</strong> registros de disparo, abertura e clique
                em campanhas enviadas pela plataforma.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Como usamos seus dados</h2>
            <p className="text-sm leading-relaxed mb-2">
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li>Prestação dos serviços contratados (acesso à plataforma, CRM, campanhas, inteligência).</li>
              <li>Comunicações transacionais: confirmação de cadastro, aviso de vencimento do trial, faturas.</li>
              <li>Suporte ao cliente e resolução de problemas técnicos.</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
              <li>Segurança da plataforma e prevenção a fraudes.</li>
              <li>Melhoria dos serviços com base em métricas de uso agregadas e anonimizadas.</li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              Não utilizamos seus dados para fins publicitários de terceiros nem os vendemos a nenhuma
              empresa.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Armazenamento e segurança</h2>
            <p className="text-sm leading-relaxed">
              Os dados são armazenados na plataforma <strong>Supabase</strong> (PostgreSQL), hospedada
              em infraestrutura AWS, com servidores na região <strong>us-east-1</strong>. Adotamos as
              seguintes medidas de segurança:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm leading-relaxed">
              <li>Criptografia em trânsito via TLS 1.2+.</li>
              <li>Criptografia em repouso para dados sensíveis (senhas SMTP, tokens).</li>
              <li>Isolamento de dados por empresa (Row Level Security — RLS).</li>
              <li>Controle de acesso baseado em funções (RBAC).</li>
              <li>Autenticação segura gerenciada pelo Supabase Auth.</li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              Os dados são retidos enquanto a conta estiver ativa. Após o encerramento, podem ser
              mantidos por até <strong>90 dias</strong> para fins de backup, sendo então excluídos de
              forma permanente, salvo obrigação legal que exija retenção por período maior.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              5. Compartilhamento de dados
            </h2>
            <p className="text-sm leading-relaxed mb-2">
              Compartilhamos dados pessoais apenas com os seguintes fornecedores, na medida necessária
              para a prestação dos serviços:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li><strong>Supabase Inc.</strong> — banco de dados e autenticação.</li>
              <li><strong>Vercel Inc.</strong> — hospedagem e entrega da aplicação.</li>
              <li><strong>Asaas Gestão Financeira S.A.</strong> — processamento de pagamentos.</li>
              <li><strong>Resend Inc.</strong> — envio de e-mails transacionais.</li>
              <li><strong>Google LLC (Gemini API)</strong> — geração de conteúdo com IA.</li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              Todos os fornecedores são tratados como operadores de dados e estão sujeitos a obrigações
              contratuais de proteção de dados compatíveis com a LGPD.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              6. Seus direitos como titular (LGPD)
            </h2>
            <p className="text-sm leading-relaxed mb-2">
              Nos termos da LGPD, você tem os seguintes direitos:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
              <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e acessá-los.</li>
              <li><strong>Correção:</strong> solicitar correção de dados incompletos ou incorretos.</li>
              <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou
                tratados em desconformidade com a lei.</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong>Eliminação:</strong> solicitar a exclusão dos dados tratados com base em
                consentimento.</li>
              <li><strong>Informação:</strong> ser informado sobre compartilhamentos realizados.</li>
              <li><strong>Revogação do consentimento</strong> a qualquer tempo.</li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed">
              Para exercer seus direitos, envie solicitação para{' '}
              <a
                href="mailto:privacidade@comprasmunicipais.com.br"
                className="text-blue-600 underline"
              >
                privacidade@comprasmunicipais.com.br
              </a>
              . Respondemos em até 15 dias úteis.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Cookies</h2>
            <p className="text-sm leading-relaxed">
              Utilizamos cookies de sessão estritamente necessários para autenticação e manutenção da
              sessão do usuário. Não utilizamos cookies de rastreamento ou publicidade de terceiros.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              8. Alterações nesta política
            </h2>
            <p className="text-sm leading-relaxed">
              Esta Política pode ser atualizada periodicamente. Notificaremos os usuários ativos por
              e-mail sobre alterações materiais com antecedência mínima de 15 dias. O uso continuado
              da plataforma após esse prazo constitui aceite das novas condições.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Contato</h2>
            <p className="text-sm leading-relaxed">
              Dúvidas sobre esta Política de Privacidade:
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed">
              <li>
                <strong>E-mail:</strong>{' '}
                <a
                  href="mailto:privacidade@comprasmunicipais.com.br"
                  className="text-blue-600 underline"
                >
                  privacidade@comprasmunicipais.com.br
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
