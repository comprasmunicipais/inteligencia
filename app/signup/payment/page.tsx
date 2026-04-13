'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';
import { CONTRACT_TEXT, CONTRACT_VERSION, hashContract } from '@/lib/contract/contractText';

const ASAAS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/assets/tokenizationLibrary.min.js'
    : 'https://www.asaas.com/assets/tokenizationLibrary.min.js';

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

interface PixData {
  encodedImage: string;
  payload: string;
  expirationDate: string;
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
  const supabase = useRef(createClient()).current;

  const [pending, setPending] = useState<PendingPlan | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cardForm, setCardForm] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    postalCode: '',
    addressNumber: '',
    phone: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const [cardPending, setCardPending] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const [userId, setUserId] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractAccepting, setContractAccepting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
      };

      const raw = typeof window !== 'undefined' ? getCookie('cm_pending_plan') : null;

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/signup/plan');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? '');
      setUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          ''
      );
      setPending(parsed);

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
  }, [router, supabase]);

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
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const AsaasTokenizer = (window as any).AsaasTokenizer;

          if (!AsaasTokenizer) {
            throw new Error('Tokenizador não carregado. Aguarde e tente novamente.');
          }

          const result = await AsaasTokenizer.tokenize({
            holderName: cardForm.holderName,
            number: cardForm.number.replace(/\s/g, ''),
            expiryMonth: cardForm.expiryMonth,
            expiryYear: cardForm.expiryYear,
            ccv: cardForm.ccv,
          });

          const token: string = result.creditCardToken ?? result.token;

          if (!token) {
            throw new Error('Falha ao tokenizar cartão. Verifique os dados e tente novamente.');
          }

          body.creditCardToken = token;
        } catch (tokenErr: unknown) {
          setError(
            tokenErr instanceof Error
              ? tokenErr.message
              : 'Erro ao tokenizar cartão. Verifique os dados e tente novamente.'
          );
          setSubmitting(false);
          return;
        }

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

      if (typeof window !== 'undefined') {
        document.cookie = 'cm_pending_plan=; path=/; max-age=0';
      }

      if (billingType === 'CREDIT_CARD') {
        setCardPending(true);
        return;
      }

      if (billingType === 'PIX' && data.pix) {
        setPixData(data.pix);
        return;
      }

      if (billingType === 'BOLETO' && data.boletoUrl) {
        setBoletoUrl(data.boletoUrl);
        return;
      }

      router.push('/dashboard?payment=pending');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.payload) return;
    navigator.clipboard.writeText(pixData.payload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleScrollContract = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToBottom(true);
    }
  }, []);

  const handleContractAccept = async () => {
    if (!checkboxChecked || !pending) return;

    setContractAccepting(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      const ipData = await fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .catch(() => ({ ip: null }));

      const hash = await hashContract(CONTRACT_TEXT);

      await supabase.from('contract_acceptances').insert({
        company_id: profile?.company_id,
        user_id: userId,
        plan_id: pending.planId,
        ip_address: ipData.ip ?? null,
        contract_hash: hash,
        contract_version: CONTRACT_VERSION,
      });

      setContractAccepted(true);
      setShowContractModal(false);
    } finally {
      setContractAccepting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={32} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!plan || !pending) return null;

  const price = getPlanPrice(plan, pending.billingCycle);

  if (cardPending) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(13,18,30,0.95)',
            border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #059669, #10b981, #34d399, transparent)',
            }}
          />
          <div
            style={{
              padding: '36px 36px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#f0f4ff',
                }}
              >
                CM <span style={{ color: '#10b981' }}>PRO</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.60)', marginTop: 4 }}>
                Cartao em processamento
              </div>
            </div>

            <div
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.16)',
                borderRadius: 10,
                fontSize: 14,
                color: 'rgba(148,163,184,0.70)',
                lineHeight: 1.7,
              }}
            >
              Seu pagamento foi enviado para confirmacao. O acesso sera liberado somente apos a
              confirmacao efetiva do pagamento.
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'rgba(148,163,184,0.65)',
                lineHeight: 1.6,
              }}
            >
              Assim que o gateway confirmar a cobranca, sua assinatura sera ativada
              automaticamente e voce recebera a confirmacao por e-mail.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pixData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(13,18,30,0.95)',
            border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #059669, #10b981, #34d399, transparent)',
            }}
          />
          <div
            style={{
              padding: '36px 36px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#f0f4ff',
                }}
              >
                CM <span style={{ color: '#10b981' }}>PRO</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.60)', marginTop: 4 }}>
                Pagamento via PIX
              </div>
            </div>

            <div style={{ padding: 12, background: '#fff', borderRadius: 12 }}>
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                width={200}
                height={200}
                style={{ display: 'block' }}
              />
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'rgba(148,163,184,0.70)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Escaneie o QR Code com o app do seu banco ou copie o código abaixo.
            </div>

            <div style={{ width: '100%' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'rgba(148,163,184,0.60)',
                  marginBottom: 8,
                }}
              >
                PIX Copia e Cola
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={pixData.payload}
                  style={{
                    flex: 1,
                    height: 42,
                    padding: '0 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  style={{
                    height: 42,
                    padding: '0 16px',
                    background: pixCopied
                      ? 'rgba(16,185,129,0.20)'
                      : 'rgba(16,185,129,0.10)',
                    border: '1px solid rgba(16,185,129,0.30)',
                    borderRadius: 10,
                    color: '#34d399',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                  }}
                >
                  {pixCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.16)',
                borderRadius: 10,
                fontSize: 13,
                color: 'rgba(148,163,184,0.70)',
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              Após o pagamento, seu acesso será liberado automaticamente em instantes. Você
              também receberá uma confirmação por e-mail.
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard?payment=pending')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(100,116,139,0.60)',
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Já paguei, ir para o painel →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (boletoUrl) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(13,18,30,0.95)',
            border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 3,
              background: 'linear-gradient(90deg, #059669, #10b981, #34d399, transparent)',
            }}
          />
          <div
            style={{
              padding: '36px 36px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#f0f4ff',
                }}
              >
                CM <span style={{ color: '#10b981' }}>PRO</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.60)', marginTop: 4 }}>
                Boleto gerado
              </div>
            </div>

            <div
              style={{
                fontSize: 14,
                color: 'rgba(148,163,184,0.70)',
                lineHeight: 1.7,
              }}
            >
              Seu boleto foi gerado com sucesso. Clique abaixo para visualizar e pagar. O acesso
              será liberado em até 1 dia útil após a compensação.
            </div>

            <a
              href={boletoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                borderRadius: 12,
                color: '#fff',
                fontFamily: 'Sora, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Abrir boleto →
            </a>

            <button
              type="button"
              onClick={() => router.push('/dashboard?payment=pending')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(100,116,139,0.60)',
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ir para o painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src={ASAAS_SCRIPT_URL} strategy="afterInteractive" />
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

        .pay-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.60);
          margin-bottom: 10px;
        }

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

        .pay-method-btn:last-child { border-right: none; }

        .pay-method-btn.active {
          background: rgba(16,185,129,0.14);
          color: #34d399;
        }

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

        .contract-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: payFadeUp 0.2s ease both;
        }

        .contract-modal {
          position: relative;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          background: #0d1220;
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .contract-modal-topbar {
          height: 3px;
          background: linear-gradient(90deg, #059669, #10b981, #34d399, transparent);
          flex-shrink: 0;
        }

        .contract-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .contract-modal-title {
          font-family: 'Sora', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #f0f4ff;
        }

        .contract-close-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border: none;
          border-radius: 8px;
          color: rgba(148,163,184,0.70);
          cursor: pointer;
          transition: background 0.2s;
        }

        .contract-close-btn:hover { background: rgba(255,255,255,0.12); }

        .contract-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          min-height: 0;
        }

        .contract-scroll-area::-webkit-scrollbar { width: 6px; }
        .contract-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .contract-scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

        .contract-text {
          font-family: 'Outfit', monospace;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(203,213,225,0.75);
          white-space: pre-wrap;
          margin: 0;
        }

        .contract-modal-footer {
          flex-shrink: 0;
          padding: 18px 24px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .contract-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
        }

        .contract-checkbox-row input[type="checkbox"] {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          accent-color: #10b981;
          flex-shrink: 0;
          cursor: pointer;
        }

        .contract-checkbox-label {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: rgba(203,213,225,0.80);
          line-height: 1.5;
          cursor: pointer;
        }

        .contract-hint {
          font-size: 11px;
          color: rgba(100,116,139,0.55);
          text-align: center;
        }

        .contract-btn-accept {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #059669, #10b981);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .contract-btn-accept:disabled {
          opacity: 0.40;
          cursor: not-allowed;
        }

        .contract-cta-btn {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.30);
          border-radius: 10px;
          color: #34d399;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .contract-cta-btn:hover {
          background: rgba(16,185,129,0.14);
          border-color: rgba(16,185,129,0.50);
        }

        .contract-accepted-badge {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 10px;
          color: #34d399;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>

      <div className="pay-root">
        <div className="pay-halo-top" />
        <div className="pay-halo-br" />

        <div className="pay-card">
          <div className="pay-topbar" />

          <div className="pay-body">
            <div className="pay-brand">
              <div className="pay-brand-name">
                CM <span>PRO</span>
              </div>
              <div className="pay-brand-sub">Finalizar assinatura</div>
            </div>

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
                <div>
                  <span className="pay-section-label">Forma de pagamento</span>
                  <div className="pay-methods">
                    {(['PIX', 'BOLETO', 'CREDIT_CARD'] as BillingType[]).map((m) => {
                      const labels: Record<BillingType, string> = {
                        PIX: 'PIX',
                        BOLETO: 'Boleto',
                        CREDIT_CARD: 'Cartão',
                      };

                      const icons: Record<BillingType, React.ReactElement> = {
                        PIX: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ),
                        BOLETO: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect
                              x="2"
                              y="5"
                              width="20"
                              height="14"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M6 9v6M10 9v6M14 9v3M18 9v6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        ),
                        CREDIT_CARD: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect
                              x="1"
                              y="4"
                              width="22"
                              height="16"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path d="M1 10h22" stroke="currentColor" strokeWidth="2" />
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

                <div>
                  <label className="pay-field-label">CPF / CNPJ do titular</label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="pay-input"
                  />
                </div>

                {billingType === 'CREDIT_CARD' && (
                  <>
                    <div className="pay-divider" />
                    <div>
                      <label className="pay-field-label">Nome no cartão</label>
                      <input
                        type="text"
                        required
                        value={cardForm.holderName}
                        onChange={(e) =>
                          setCardForm((f) => ({ ...f, holderName: e.target.value }))
                        }
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
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const masked = digits.replace(/(.{4})/g, '$1 ').trim();
                          setCardForm((f) => ({ ...f, number: masked }));
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
                          onChange={(e) =>
                            setCardForm((f) => ({
                              ...f,
                              expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2),
                            }))
                          }
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
                          onChange={(e) =>
                            setCardForm((f) => ({
                              ...f,
                              expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4),
                            }))
                          }
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
                          onChange={(e) =>
                            setCardForm((f) => ({
                              ...f,
                              ccv: e.target.value.replace(/\D/g, '').slice(0, 4),
                            }))
                          }
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
                          onChange={(e) =>
                            setCardForm((f) => ({ ...f, postalCode: e.target.value }))
                          }
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
                          onChange={(e) =>
                            setCardForm((f) => ({ ...f, addressNumber: e.target.value }))
                          }
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
                        onChange={(e) => setCardForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="pay-input"
                      />
                    </div>
                  </>
                )}

                {billingType !== 'CREDIT_CARD' && (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: 'rgba(148,163,184,0.65)',
                      lineHeight: 1.6,
                    }}
                  >
                    {billingType === 'PIX'
                      ? 'Após confirmar, você receberá o QR Code do PIX para pagamento. O acesso é liberado em instantes após a confirmação.'
                      : 'O boleto será gerado e enviado para seu e-mail. O acesso é liberado em até 1 dia útil após a compensação.'}
                  </div>
                )}

                {error && (
                  <div className="pay-error">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <line
                        x1="12"
                        y1="8"
                        x2="12"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="12"
                        y1="16"
                        x2="12.01"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {error}
                  </div>
                )}
              </div>

              <div className="pay-submit-wrap" style={{ marginTop: 16 }}>
                {contractAccepted ? (
                  <div className="contract-accepted-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Contrato aceito ✓
                  </div>
                ) : (
                  <button
                    type="button"
                    className="contract-cta-btn"
                    onClick={() => {
                      setScrolledToBottom(false);
                      setCheckboxChecked(false);
                      setShowContractModal(true);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="14 2 14 8 20 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Ler e aceitar o Contrato
                  </button>
                )}
              </div>

              <div className="pay-submit-wrap">
                <button
                  type="submit"
                  disabled={submitting || !contractAccepted}
                  className="pay-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando…
                    </>
                  ) : (
                    <>
                      Finalizar assinatura
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12h14M12 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pay-footer">
              <p>
                <a href="/signup/plan">← Alterar plano ou ciclo</a>
              </p>
              <div className="pay-ssl">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="rgba(16,185,129,0.12)"
                  />
                </svg>
                Pagamento seguro · Cancele quando quiser
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContractModal && (
        <div
          className="contract-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContractModal(false);
          }}
        >
          <div className="contract-modal">
            <div className="contract-modal-topbar" />
            <div className="contract-modal-header">
              <div className="contract-modal-title">
                Contrato de Licença e Prestação de Serviços — CM Pro
              </div>
              <button
                type="button"
                className="contract-close-btn"
                onClick={() => setShowContractModal(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="contract-scroll-area" ref={scrollRef} onScroll={handleScrollContract}>
              <pre className="contract-text">{CONTRACT_TEXT}</pre>
            </div>
            <div className="contract-modal-footer">
              {!scrolledToBottom && (
                <div className="contract-hint">Role até o final para habilitar o aceite</div>
              )}
              <label className="contract-checkbox-row">
                <input
                  type="checkbox"
                  disabled={!scrolledToBottom}
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />
                <span className="contract-checkbox-label">
                  Li e aceito os termos do Contrato de Licença e Prestação de Serviços do CM Pro
                </span>
              </label>
              <button
                type="button"
                className="contract-btn-accept"
                disabled={!checkboxChecked || contractAccepting}
                onClick={handleContractAccept}
              >
                {contractAccepting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Registrando aceite…
                  </>
                ) : (
                  'Confirmar aceite'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
