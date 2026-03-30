'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_semiannual: number;
  price_annual: number;
  emails_per_month: number;
  max_users: number;
  extra_users_allowed: boolean;
}

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const CYCLE_SAVINGS: Record<BillingCycle, string | null> = {
  monthly: null,
  semiannual: 'Economize ~10%',
  annual: 'Economize ~22%',
};

function getPlanPrice(plan: Plan, cycle: BillingCycle): number {
  if (cycle === 'semiannual') return plan.price_semiannual;
  if (cycle === 'annual') return plan.price_annual;
  return plan.price_monthly;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatEmails(count: number): string {
  return new Intl.NumberFormat('pt-BR').format(count);
}

export default function SignupPlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) setPlans(data.plans);
        else setError('Não foi possível carregar os planos.');
      })
      .catch(() => setError('Erro de conexão ao carregar planos.'))
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    // Payment integration coming next — log selection for now
    console.log('Plano selecionado:', { plan, cycle, price: getPlanPrice(plan, cycle) });
  };

  const isProfessional = (plan: Plan) => plan.name === 'Profissional';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

        .plan-root {
          min-height: 100vh;
          background-color: #080c14;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .plan-halo-top {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(37,99,235,0.14) 0%, transparent 70%);
          pointer-events: none;
        }

        .plan-halo-br {
          position: absolute;
          bottom: -150px;
          right: -150px;
          width: 600px;
          height: 600px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,0.09) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Header */
        .plan-header {
          text-align: center;
          margin-bottom: 36px;
          z-index: 1;
          animation: fadeInUp 0.5s ease both;
        }

        .plan-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: rgba(16,185,129,0.10);
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: #34d399;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .plan-title {
          font-family: 'Sora', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #f0f4ff;
          letter-spacing: -0.5px;
          margin-bottom: 10px;
        }

        .plan-title span {
          color: #3b82f6;
        }

        .plan-subtitle {
          font-size: 15px;
          color: rgba(148,163,184,0.70);
          max-width: 480px;
          line-height: 1.6;
        }

        /* Cycle toggle */
        .cycle-toggle {
          display: inline-flex;
          align-items: center;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 4px;
          gap: 2px;
          margin-bottom: 40px;
          z-index: 1;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.10s;
        }

        .cycle-btn {
          position: relative;
          padding: 8px 18px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: rgba(148,163,184,0.65);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
          white-space: nowrap;
        }

        .cycle-btn.active {
          background: rgba(37,99,235,0.18);
          color: #93c5fd;
          font-weight: 600;
        }

        .cycle-savings {
          font-size: 10px;
          font-weight: 600;
          color: #34d399;
          letter-spacing: 0.04em;
          display: block;
          margin-top: 1px;
        }

        /* Cards grid */
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          max-width: 980px;
          z-index: 1;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.18s;
        }

        @media (max-width: 768px) {
          .plan-grid {
            grid-template-columns: 1fr;
            max-width: 420px;
          }
        }

        .plan-card {
          position: relative;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
          backdrop-filter: blur(20px);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .plan-card:hover {
          border-color: rgba(37,99,235,0.30);
          box-shadow: 0 8px 40px rgba(37,99,235,0.10);
        }

        .plan-card.featured {
          border-color: rgba(37,99,235,0.35);
          box-shadow: 0 4px 32px rgba(37,99,235,0.15);
        }

        .plan-card-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 20px 20px 0 0;
          background: linear-gradient(90deg, rgba(37,99,235,0.3), transparent);
        }

        .plan-card.featured .plan-card-topbar {
          background: linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa);
        }

        .plan-popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 14px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          border-radius: 20px;
          font-family: 'Sora', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 2px 12px rgba(37,99,235,0.40);
        }

        .plan-name {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f0f4ff;
          margin-bottom: 4px;
          margin-top: 8px;
        }

        .plan-desc {
          font-size: 12px;
          color: rgba(100,116,139,0.80);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .plan-price-block {
          margin-bottom: 6px;
        }

        .plan-price {
          font-family: 'Sora', sans-serif;
          font-size: 34px;
          font-weight: 800;
          color: #f0f4ff;
          line-height: 1;
        }

        .plan-price-period {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: rgba(100,116,139,0.70);
          margin-bottom: 20px;
        }

        .plan-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 18px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .plan-feature {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: rgba(203,213,225,0.85);
          line-height: 1.4;
        }

        .plan-feature-icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          margin-top: 1px;
          color: #10b981;
        }

        .plan-btn {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 12px;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.02em;
        }

        .plan-btn-default {
          background: rgba(37,99,235,0.12);
          border: 1px solid rgba(37,99,235,0.25);
          color: #93c5fd;
        }

        .plan-btn-default:hover {
          background: rgba(37,99,235,0.20);
          transform: translateY(-1px);
        }

        .plan-btn-featured {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          box-shadow: 0 4px 20px rgba(37,99,235,0.30);
        }

        .plan-btn-featured:hover {
          opacity: 0.92;
          box-shadow: 0 6px 28px rgba(37,99,235,0.40);
          transform: translateY(-1px);
        }

        /* Loading / Error states */
        .plan-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 260px;
          color: rgba(148,163,184,0.60);
          font-size: 14px;
          z-index: 1;
        }

        /* Footer */
        .plan-footer {
          margin-top: 32px;
          text-align: center;
          z-index: 1;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.28s;
        }

        .plan-footer p {
          font-size: 12px;
          color: rgba(100,116,139,0.55);
          line-height: 1.7;
        }

        .plan-footer a {
          color: rgba(100,116,139,0.75);
          text-decoration: none;
          transition: color 0.2s;
        }

        .plan-footer a:hover { color: #60a5fa; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="plan-root">
        <div className="plan-halo-top" />
        <div className="plan-halo-br" />

        {/* Header */}
        <div className="plan-header">
          <div className="plan-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            7 dias grátis em qualquer plano
          </div>
          <h1 className="plan-title">Escolha seu <span>plano</span></h1>
          <p className="plan-subtitle">
            Comece com 7 dias grátis. Cancele a qualquer momento, sem fidelidade.
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="cycle-toggle">
          {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((c) => (
            <button
              key={c}
              className={`cycle-btn${cycle === c ? ' active' : ''}`}
              onClick={() => setCycle(c)}
            >
              {CYCLE_LABELS[c]}
              {CYCLE_SAVINGS[c] && (
                <span className="cycle-savings">{CYCLE_SAVINGS[c]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Plans */}
        {loadingPlans ? (
          <div className="plan-state">
            <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
            <span>Carregando planos…</span>
          </div>
        ) : error ? (
          <div className="plan-state">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#f87171' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ color: '#fca5a5' }}>{error}</span>
          </div>
        ) : (
          <div className="plan-grid">
            {plans.map((plan) => {
              const featured = isProfessional(plan);
              const price = getPlanPrice(plan, cycle);
              const usersLabel = plan.max_users === 0 ? 'Usuários ilimitados' : `${plan.max_users} usuário${plan.max_users > 1 ? 's' : ''}`;

              return (
                <div key={plan.id} className={`plan-card${featured ? ' featured' : ''}`}>
                  <div className="plan-card-topbar" />

                  {featured && (
                    <div className="plan-popular-badge">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                      Mais popular
                    </div>
                  )}

                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-desc">
                    {plan.name === 'Essencial' && 'Para empresas iniciando no mercado público.'}
                    {plan.name === 'Profissional' && 'Para equipes que disputam licitações ativamente.'}
                    {plan.name === 'Elite' && 'Para grandes operações com volume máximo.'}
                  </div>

                  <div className="plan-price-block">
                    <div className="plan-price">{formatCurrency(price)}</div>
                  </div>
                  <div className="plan-price-period">
                    {cycle === 'monthly' && 'por mês'}
                    {cycle === 'semiannual' && 'por semestre (à vista)'}
                    {cycle === 'annual' && 'por ano (à vista)'}
                  </div>

                  <div className="plan-divider" />

                  <ul className="plan-features">
                    <li className="plan-feature">
                      <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {formatEmails(plan.emails_per_month)} e-mails/mês
                    </li>
                    <li className="plan-feature">
                      <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {usersLabel}
                    </li>
                    <li className="plan-feature">
                      <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Inteligência de licitações PNCP
                    </li>
                    <li className="plan-feature">
                      <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      CRM e gestão de propostas
                    </li>
                    {plan.extra_users_allowed && (
                      <li className="plan-feature">
                        <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                          <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Usuários adicionais disponíveis
                      </li>
                    )}
                    <li className="plan-feature">
                      <svg className="plan-feature-icon" viewBox="0 0 24 24" fill="none">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Suporte por e-mail
                    </li>
                  </ul>

                  <button
                    className={`plan-btn ${featured ? 'plan-btn-featured' : 'plan-btn-default'}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    Assinar {plan.name}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="plan-footer">
          <p>
            7 dias grátis em qualquer plano · Cancele quando quiser · Sem fidelidade<br />
            <a href="/login">Já tenho conta</a> · <a href="#">Termos de Uso</a> · <a href="#">Privacidade</a>
          </p>
        </div>
      </div>
    </>
  );
}
