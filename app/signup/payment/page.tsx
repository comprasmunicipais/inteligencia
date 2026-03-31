'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';
type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

interface PendingPlan {
  planId: string;
  billingCycle: BillingCycle;
}

interface PlanData {
  id: string;
  name: string;
  price_monthly: number;
  price_semiannual: number;
  price_annual: number;
}

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Cobrança mensal',
  semiannual: 'Cobrança semestral · Economia de 10%',
  annual: 'Cobrança anual · Economia de 22%',
};

const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  monthly: '/mês',
  semiannual: '/semestre',
  annual: '/ano',
};

function getPlanPrice(plan: PlanData, cycle: BillingCycle): number {
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

export default function SignupPaymentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pending, setPending]       = useState<PendingPlan | null>(null);
  const [plan, setPlan]             = useState<PlanData | null>(null);
  const [userEmail, setUserEmail]   = useState('');
  const [userName, setUserName]     = useState('');
  const [loading, setLoading]       = useState(true);

  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [cpfCnpj, setCpfCnpj]         = useState('');
  const [cardForm, setCardForm]       = useState({
    holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '',
    postalCode: '', addressNumber: '', phone: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    (async () => {
      // 1. Check localStorage
      const raw = typeof window !== 'undefined'
        ? localStorage.getItem('cm_pending_plan')
        : null;

      if (!raw) {
        router.replace('/signup/plan');
        return;
      }

      let parsed: PendingPlan;
      try {
        parsed = JSON.parse(raw);
      } catch {
        router.replace('/signup/plan');
        return;
      }

      // 2. Check session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/signup/plan');
        return;
      }

      setUserEmail(user.email ?? '');
      setUserName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        ''
      );
      setPending(parsed);

      // 3. Fetch plan data
      try {
        const res = await fetch('/api/plans');
        const data = await res.json();
        const found: PlanData | undefined = (data.plans ?? []).find(
          (p: PlanData) => p.id === parsed.planId
        );
        if (found) {
          setPlan(found);
        } else {
          router.replace('/signup/plan');
          return;
        }
      } catch {
        router.replace('/signup/plan');
        return;
      }

      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || !plan) return;
    setError('');
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        planId: pending.planId,
        billingCycle: pending.billingCycle,
        billingType,
        email: userEmail,
        name: userName,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      };

      if (billingType === 'CREDIT_CARD') {
        body.creditCard = {
          holderName: cardForm.holderName,
          number: cardForm.number.replace(/\s/g, ''),
          expiryMonth: cardForm.expiryMonth,
          expiryYear: cardForm.expiryYear,
          ccv: cardForm.ccv,
        };
        body.creditCardHolderInfo = {
          name: cardForm.holderName,
          email: userEmail,
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          postalCode: cardForm.postalCode.replace(/\D/g, ''),
          addressNumber: cardForm.addressNumber,
          ...(cardForm.phone ? { phone: cardForm.phone } : {}),
        };
      }

      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao processar pagamento. Tente novamente.');
        return;
      }

      // Success
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cm_pending_plan');
      }
      router.push('/dashboard?welcome=1');
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!plan || !pending) return null;

  const price = getPlanPrice(plan, pending.billingCycle);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

        .pay-root {
          min-height: 100vh;
          background-color: #080c14;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .pay-halo-top {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,0.14) 0%, transparent 70%);
          pointer-events: none;
        }

        .pay-halo-br {
          position: absolute;
          bottom: -120px;
          right: -120px;
          width: 500px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(37,99,235,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .pay-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 1;
        }

        .pay-topbar {
          height: 3px;
          background: linear-gradient(90deg, #059669, #10b981, #34d399, transparent);
        }

        .pay-body {
          padding: 36px 36px 32px;
        }

        /* Brand */
        .pay-brand {
          text-align: center;
          margin-bottom: 24px;
          animation: payFadeUp 0.4s ease both;
        }

        .pay-brand-name {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #f0f4ff;
          letter-spacing: -0.5px;
        }

        .pay-brand-name span { color: #10b981; }

        .pay-brand-sub {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.55);
          margin-top: 4px;
        }

        /* Order summary */
        .pay-summary {
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.16);
          border-radius: 14px;
          padding: 16px 18px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          animation: payFadeUp 0.4s ease both;
          animation-delay: 0.06s;
        }

        .pay-summary-left {}

        .pay-summary-plan {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #f0f4ff;
        }

        .pay-summary-cycle {
          font-size: 12px;
          color: rgba(148,163,184,0.60);
          margin-top: 2px;
        }

        .pay-summary-price {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #10b981;
          white-space: nowrap;
        }

        .pay-summary-price-sub {
          font-size: 11px;
          font-weight: 500;
          color: rgba(148,163,184,0.55);
          text-align: right;
        }

        /* Section label */
        .pay-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.60);
          margin-bottom: 10px;
        }

        /* Method toggle */
        .pay-methods {
          display: flex;
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 22px;
          animation: payFadeUp 0.4s ease both;
          animation-delay: 0.10s;
        }

        .pay-method-btn {
          flex: 1;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          background: transparent;
          color: rgba(148,163,184,0.60);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
          border-right: 1px solid rgba(255,255,255,0.06);
        }

        .pay-method-btn:last-child {
          border-right: none;
        }

        .pay-method-btn.active {
          background: rgba(16,185,129,0.14);
          color: #34d399;
        }

        /* Fields */
        .pay-fields {
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: payFadeUp 0.4s ease both;
          animation-delay: 0.14s;
        }

        .pay-field-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.80);
          margin-bottom: 6px;
          display: block;
        }

        .pay-input {
          width: 100%;
          height: 46px;
          padding: 0 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #e2e8f0;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .pay-input::placeholder { color: rgba(100,116,139,0.50); }

        .pay-input:focus {
          border-color: rgba(16,185,129,0.45);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.10);
        }

        .pay-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pay-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .pay-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 4px 0;
        }

        /* Error */
        .pay-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.20);
          border-radius: 10px;
          font-size: 13px;
          color: #fca5a5;
          line-height: 1.5;
          animation: payFadeUp 0.3s ease both;
        }

        /* Submit */
        .pay-submit-wrap {
          margin-top: 22px;
          animation: payFadeUp 0.4s ease both;
          animation-delay: 0.18s;
        }

        .pay-btn {
          width: 100%;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #059669, #10b981);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(16,185,129,0.30);
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }

        .pay-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 32px rgba(16,185,129,0.40);
          transform: translateY(-1px);
        }

        .pay-btn:disabled {
          opacity: 0.60;
          cursor: not-allowed;
        }

        /* Footer */
        .pay-footer {
          margin-top: 20px;
          text-align: center;
          animation: payFadeUp 0.4s ease both;
          animation-delay: 0.24s;
        }

        .pay-footer p {
          font-size: 11px;
          color: rgba(100,116,139,0.50);
          line-height: 1.6;
        }

        .pay-footer a {
          color: rgba(100,116,139,0.70);
          text-decoration: none;
          transition: color 0.2s;
        }

        .pay-footer a:hover { color: #34d399; }

        .pay-ssl {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          padding: 4px 10px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.16);
          border-radius: 20px;
          font-size: 10px;
          color: #34d399;
          letter-spacing: 0.04em;
        }

        @keyframes payFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pay-root">
        <div className="pay-halo-top" />
        <div className="pay-halo-br" />

        <div className="pay-card">
          <div className="pay-topbar" />

          <div className="pay-body">
            {/* Brand */}
            <div className="pay-brand">
              <div className="pay-brand-name">CM <span>PRO</span></div>
              <div className="pay-brand-sub">Finalizar assinatura</div>
            </div>

            {/* Order summary */}
            <div className="pay-summary">
              <div className="pay-summary-left">
                <div className="pay-summary-plan">{plan.name}</div>
                <div className="pay-summary-cycle">{CYCLE_LABELS[pending.billingCycle]}</div>
              </div>
              <div>
                <div className="pay-summary-price">{formatCurrency(price)}</div>
                <div className="pay-summary-price-sub">{CYCLE_SUFFIX[pending.billingCycle]}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="pay-fields">

                {/* Payment method */}
                <div>
                  <span className="pay-section-label">Forma de pagamento</span>
                  <div className="pay-methods">
                    {(['PIX', 'BOLETO', 'CREDIT_CARD'] as BillingType[]).map((m) => {
                      const labels: Record<BillingType, string> = { PIX: 'PIX', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão' };
                      const icons: Record<BillingType, React.ReactElement> = {
                        PIX: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ),
                        BOLETO: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M6 9v6M10 9v6M14 9v3M18 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        ),
                        CREDIT_CARD: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        ),
                      };
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBillingType(m)}
                          className={`pay-method-btn${billingType === m ? ' active' : ''}`}
                        >
                          {icons[m]}
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CPF/CNPJ — always required */}
                <div>
                  <label className="pay-field-label">CPF / CNPJ do titular</label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={e => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="pay-input"
                  />
                </div>

                {/* Card fields */}
                {billingType === 'CREDIT_CARD' && (
                  <>
                    <div className="pay-divider" />

                    <div>
                      <label className="pay-field-label">Nome no cartão</label>
                      <input
                        type="text"
                        required
                        value={cardForm.holderName}
                        onChange={e => setCardForm(f => ({ ...f, holderName: e.target.value }))}
                        placeholder="Como impresso no cartão"
                        className="pay-input"
                      />
                    </div>

                    <div>
                      <label className="pay-field-label">Número do cartão</label>
                      <input
                        type="text"
                        required
                        value={cardForm.number}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const masked = digits.replace(/(.{4})/g, '$1 ').trim();
                          setCardForm(f => ({ ...f, number: masked }));
                        }}
                        placeholder="0000 0000 0000 0000"
                        className="pay-input"
                        style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      />
                    </div>

                    <div className="pay-grid-3">
                      <div>
                        <label className="pay-field-label">Mês</label>
                        <input
                          type="text"
                          required
                          value={cardForm.expiryMonth}
                          onChange={e => setCardForm(f => ({ ...f, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                          placeholder="MM"
                          className="pay-input"
                        />
                      </div>
                      <div>
                        <label className="pay-field-label">Ano</label>
                        <input
                          type="text"
                          required
                          value={cardForm.expiryYear}
                          onChange={e => setCardForm(f => ({ ...f, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          placeholder="AAAA"
                          className="pay-input"
                        />
                      </div>
                      <div>
                        <label className="pay-field-label">CVV</label>
                        <input
                          type="password"
                          required
                          value={cardForm.ccv}
                          onChange={e => setCardForm(f => ({ ...f, ccv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          placeholder="···"
                          className="pay-input"
                        />
                      </div>
                    </div>

                    <div className="pay-divider" />

                    <div className="pay-grid-2">
                      <div>
                        <label className="pay-field-label">CEP</label>
                        <input
                          type="text"
                          required
                          value={cardForm.postalCode}
                          onChange={e => setCardForm(f => ({ ...f, postalCode: e.target.value }))}
                          placeholder="00000-000"
                          className="pay-input"
                        />
                      </div>
                      <div>
                        <label className="pay-field-label">Número</label>
                        <input
                          type="text"
                          required
                          value={cardForm.addressNumber}
                          onChange={e => setCardForm(f => ({ ...f, addressNumber: e.target.value }))}
                          placeholder="123"
                          className="pay-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="pay-field-label">Telefone (opcional)</label>
                      <input
                        type="text"
                        value={cardForm.phone}
                        onChange={e => setCardForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="pay-input"
                      />
                    </div>
                  </>
                )}

                {/* PIX / Boleto info */}
                {billingType !== 'CREDIT_CARD' && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'rgba(148,163,184,0.65)',
                    lineHeight: 1.6,
                  }}>
                    {billingType === 'PIX'
                      ? 'Após confirmar, você receberá o QR Code do PIX por e-mail e no painel. O acesso é liberado em instantes após o pagamento.'
                      : 'O boleto será gerado e enviado para seu e-mail. O acesso é liberado em até 1 dia útil após a compensação.'
                    }
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="pay-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </div>
                )}

              </div>

              {/* Submit */}
              <div className="pay-submit-wrap">
                <button type="submit" disabled={submitting} className="pay-btn">
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando…
                    </>
                  ) : (
                    <>
                      Finalizar assinatura
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="pay-footer">
              <p>
                <a href="/signup/plan">← Alterar plano ou ciclo</a>
              </p>
              <div className="pay-ssl">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(16,185,129,0.12)"/>
                </svg>
                Pagamento seguro · Cancele quando quiser
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
