'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function maskCnpjCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

const SEGMENTS = [
  { key: 'TI', label: 'TI', icon: '💻' },
  { key: 'Saúde', label: 'Saúde', icon: '🏥' },
  { key: 'Obras', label: 'Obras', icon: '🏗️' },
  { key: 'Limpeza', label: 'Limpeza', icon: '🧹' },
  { key: 'Consultoria', label: 'Consultoria', icon: '📋' },
  { key: 'Alimentação', label: 'Alimentação', icon: '🍽️' },
  { key: 'Segurança', label: 'Segurança', icon: '🔒' },
  { key: 'Outro', label: 'Outro', icon: '➕' },
];

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

function useAnimatedCount(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
      else prevRef.current = target;
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') ?? '';

  const supabase = useRef(createClient()).current;

  const [step, setStep] = useState<1 | 2>(1);
  const [segment, setSegment] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [oppCount, setOppCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [cnpjCpf, setCnpjCpf] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const animatedCount = useAnimatedCount(oppCount);

  // Fetch opportunity count whenever states change
  useEffect(() => {
    if (selectedStates.length === 0) {
      setOppCount(0);
      return;
    }

    const controller = new AbortController();
    setLoadingCount(true);

    fetch(`/api/signup/opportunities-count?states=${selectedStates.join(',')}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === 'number') setOppCount(d.count); })
      .catch(() => {})
      .finally(() => setLoadingCount(false));

    return () => controller.abort();
  }, [selectedStates]);

  const toggleState = (uf: string) => {
    setSelectedStates((prev) =>
      prev.includes(uf) ? prev.filter((s) => s !== uf) : [...prev, uf]
    );
  };

  const handleCTA = async () => {
    if (!userId) {
      setError('Sessão não encontrada. Volte ao cadastro.');
      return;
    }
    if (selectedStates.length === 0) {
      setError('Selecione ao menos um estado.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/signup/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, segment, states: selectedStates }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar perfil.');
        return;
      }

      // Salvar dados opcionais da empresa se preenchidos
      if (cnpjCpf || address || phone) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .single();

        if (profile?.company_id) {
          const update: Record<string, string> = {};
          if (cnpjCpf) update.cnpj_cpf = cnpjCpf;
          if (address) update.address = address;
          if (phone) update.phone = phone;

          await supabase.from('companies').update(update).eq('id', profile.company_id);
        }
      }

      router.push('/signup/plan');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

        .ob-root {
          min-height: 100vh;
          background-color: #080c14;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .ob-halo-top {
          position: absolute;
          top: -180px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 440px;
          background: radial-gradient(ellipse at center, rgba(37,99,235,0.13) 0%, transparent 70%);
          pointer-events: none;
        }

        .ob-halo-br {
          position: absolute;
          bottom: -140px;
          right: -140px;
          width: 560px;
          height: 560px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,0.09) 0%, transparent 70%);
          pointer-events: none;
        }

        .ob-card {
          position: relative;
          width: 100%;
          max-width: 580px;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(37,99,235,0.18);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 1;
        }

        .ob-card-topbar {
          height: 3px;
          background: linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa, transparent);
        }

        .ob-body {
          padding: 36px 40px 40px;
        }

        /* Steps indicator */
        .ob-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          animation: fadeInUp 0.4s ease both;
        }

        .ob-step-dot {
          width: 28px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.10);
          transition: background 0.3s;
        }

        .ob-step-dot.active {
          background: #3b82f6;
        }

        .ob-step-dot.done {
          background: #10b981;
        }

        .ob-step-label {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(100,116,139,0.70);
          margin-left: 4px;
        }

        /* Title */
        .ob-title {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #f0f4ff;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.06s;
        }

        .ob-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: rgba(148,163,184,0.65);
          margin-bottom: 28px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.10s;
        }

        /* Chips */
        .ob-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 32px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.14s;
        }

        .ob-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(203,213,225,0.80);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          user-select: none;
        }

        .ob-chip:hover {
          border-color: rgba(37,99,235,0.35);
          color: #e2e8f0;
        }

        .ob-chip.selected {
          background: rgba(37,99,235,0.16);
          border-color: rgba(37,99,235,0.50);
          color: #93c5fd;
          font-weight: 600;
        }

        .ob-chip.state {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          min-width: 46px;
          justify-content: center;
        }

        /* States grid */
        .ob-states-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
          gap: 8px;
          margin-bottom: 28px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.14s;
        }

        /* Count banner */
        .ob-count-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(37,99,235,0.08);
          border: 1px solid rgba(37,99,235,0.20);
          border-radius: 12px;
          margin-bottom: 28px;
          min-height: 54px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.18s;
        }

        .ob-count-number {
          font-family: 'Sora', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #60a5fa;
          line-height: 1;
          min-width: 60px;
          text-align: right;
          flex-shrink: 0;
        }

        .ob-count-text {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: rgba(148,163,184,0.80);
          line-height: 1.4;
        }

        .ob-count-text strong {
          color: #e2e8f0;
        }

        /* Buttons */
        .ob-btn-row {
          display: flex;
          gap: 12px;
          animation: fadeInUp 0.4s ease both;
          animation-delay: 0.22s;
        }

        .ob-btn-back {
          flex-shrink: 0;
          height: 50px;
          padding: 0 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          color: rgba(148,163,184,0.75);
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ob-btn-back:hover {
          background: rgba(255,255,255,0.09);
        }

        .ob-btn-primary {
          flex: 1;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(37,99,235,0.30);
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }

        .ob-btn-primary:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 32px rgba(37,99,235,0.40);
          transform: translateY(-1px);
        }

        .ob-btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ob-btn-arrow {
          transition: transform 0.2s;
        }

        .ob-btn-primary:hover:not(:disabled) .ob-btn-arrow {
          transform: translateX(3px);
        }

        /* Error */
        .ob-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.20);
          border-radius: 10px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="ob-root">
        <div className="ob-halo-top" />
        <div className="ob-halo-br" />

        <div className="ob-card">
          <div className="ob-card-topbar" />

          <div className="ob-body">
            {/* Step indicators */}
            <div className="ob-steps">
              <div className={`ob-step-dot ${step === 1 ? 'active' : 'done'}`} />
              <div className={`ob-step-dot ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`} />
              <span className="ob-step-label">Passo {step} de 2</span>
            </div>

            {/* ── STEP 1: Segment ── */}
            {step === 1 && (
              <>
                <div className="ob-title">Qual o segmento da sua empresa?</div>
                <div className="ob-subtitle">
                  Isso nos ajuda a encontrar as melhores licitações para você.
                </div>

                <div className="ob-chips">
                  {SEGMENTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`ob-chip${segment === s.key ? ' selected' : ''}`}
                      onClick={() => setSegment(s.key)}
                    >
                      <span>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="ob-btn-row">
                  <button
                    className="ob-btn-primary"
                    disabled={!segment}
                    onClick={() => setStep(2)}
                  >
                    Continuar
                    <svg className="ob-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: States ── */}
            {step === 2 && (
              <>
                <div className="ob-title">Em quais estados você quer vender?</div>
                <div className="ob-subtitle">
                  Selecione um ou mais estados. Você pode ajustar isso depois.
                </div>

                <div className="ob-states-grid">
                  {STATES.map((uf) => (
                    <button
                      key={uf}
                      type="button"
                      className={`ob-chip state${selectedStates.includes(uf) ? ' selected' : ''}`}
                      onClick={() => toggleState(uf)}
                    >
                      {uf}
                    </button>
                  ))}
                </div>

                {/* Live count banner */}
                <div className="ob-count-banner">
                  {loadingCount ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: '#60a5fa', flexShrink: 0 }} />
                  ) : (
                    <div className="ob-count-number">
                      {selectedStates.length > 0 ? animatedCount.toLocaleString('pt-BR') : '—'}
                    </div>
                  )}
                  <div className="ob-count-text">
                    {selectedStates.length === 0 ? (
                      'Selecione estados para ver o número de licitações disponíveis.'
                    ) : (
                      <>
                        <strong>licitações ativas</strong> aguardam sua empresa nos estados selecionados.
                      </>
                    )}
                  </div>
                </div>

                {/* Dados opcionais da empresa */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.70)', marginBottom: 4 }}>
                    Dados da empresa (opcional)
                  </div>
                  <input
                    type="text"
                    placeholder="CNPJ ou CPF"
                    value={cnpjCpf}
                    onChange={(e) => setCnpjCpf(maskCnpjCpf(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: 'Outfit, sans-serif',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Endereço completo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: 'Outfit, sans-serif',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Telefone"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: 'Outfit, sans-serif',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div className="ob-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {error}
                  </div>
                )}

                <div className="ob-btn-row">
                  <button
                    type="button"
                    className="ob-btn-back"
                    onClick={() => { setStep(1); setError(''); }}
                  >
                    ← Voltar
                  </button>
                  <button
                    className="ob-btn-primary"
                    disabled={saving || selectedStates.length === 0}
                    onClick={handleCTA}
                  >
                    {saving ? (
                      <><Loader2 size={18} className="animate-spin" /> Salvando…</>
                    ) : (
                      <>
                        Quero essas oportunidades
                        <svg className="ob-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
