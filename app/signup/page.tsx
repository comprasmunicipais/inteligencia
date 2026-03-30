'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, company_name: companyName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta. Tente novamente.');
        return;
      }

      router.push(`/signup/onboarding?userId=${data.userId}`);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

        .signup-root {
          min-height: 100vh;
          background-color: #080c14;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .signup-halo-top {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,0.14) 0%, transparent 70%);
          pointer-events: none;
        }

        .signup-halo-br {
          position: absolute;
          bottom: -120px;
          right: -120px;
          width: 500px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(37,99,235,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .signup-card {
          position: relative;
          width: 100%;
          max-width: 460px;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 1;
        }

        .signup-card-topbar {
          height: 3px;
          background: linear-gradient(90deg, #059669, #10b981, #34d399, transparent);
        }

        .signup-card-accent {
          position: absolute;
          top: 0;
          right: 0;
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, rgba(16,185,129,0.10) 0%, transparent 60%);
          pointer-events: none;
        }

        .signup-body {
          padding: 40px 40px 36px;
        }

        .signup-brand {
          text-align: center;
          margin-bottom: 28px;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.05s;
        }

        .signup-brand-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.22);
          margin-bottom: 14px;
        }

        .signup-brand-name {
          font-family: 'Sora', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #f0f4ff;
          letter-spacing: -0.5px;
          line-height: 1;
          margin-bottom: 6px;
        }

        .signup-brand-name span {
          color: #10b981;
        }

        .signup-brand-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.65);
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .signup-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .signup-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          animation: fadeInUp 0.5s ease both;
        }

        .signup-field:nth-child(1) { animation-delay: 0.10s; }
        .signup-field:nth-child(2) { animation-delay: 0.16s; }
        .signup-field:nth-child(3) { animation-delay: 0.22s; }
        .signup-field:nth-child(4) { animation-delay: 0.28s; }

        .signup-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.85);
        }

        .signup-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #e2e8f0;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .signup-input::placeholder {
          color: rgba(100,116,139,0.55);
        }

        .signup-input:focus {
          border-color: rgba(16,185,129,0.45);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.10);
        }

        .signup-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: #fca5a5;
          animation: fadeInUp 0.3s ease both;
        }

        .signup-btn-wrap {
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.34s;
        }

        .signup-btn {
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
          box-shadow: 0 4px 24px rgba(16,185,129,0.30), 0 1px 0 rgba(255,255,255,0.08) inset;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
        }

        .signup-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 32px rgba(16,185,129,0.40);
          transform: translateY(-1px);
        }

        .signup-btn:disabled {
          opacity: 0.60;
          cursor: not-allowed;
        }

        .signup-btn-arrow {
          transition: transform 0.2s;
        }

        .signup-btn:hover:not(:disabled) .signup-btn-arrow {
          transform: translateX(3px);
        }

        .signup-footer {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.40s;
        }

        .signup-login-link {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: rgba(100,116,139,0.75);
          text-align: center;
        }

        .signup-login-link a {
          color: #34d399;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .signup-login-link a:hover {
          color: #10b981;
        }

        .signup-ssl-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.18);
          border-radius: 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: #34d399;
          letter-spacing: 0.03em;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="signup-root">
        <div className="signup-halo-top" />
        <div className="signup-halo-br" />

        <div className="signup-card">
          <div className="signup-card-topbar" />
          <div className="signup-card-accent" />

          <div className="signup-body">
            {/* Brand */}
            <div className="signup-brand">
              <div className="signup-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="signup-brand-name">CM <span>PRO</span></div>
              <div className="signup-brand-sub">Crie sua conta</div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="signup-row">
                <div className="signup-field">
                  <label className="signup-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Nome completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="João Silva"
                    className="signup-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Empresa
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Ltda"
                    className="signup-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="signup-field">
                <label className="signup-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="joao@suaempresa.com.br"
                  className="signup-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="signup-field">
                <label className="signup-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Senha
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="signup-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="signup-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="signup-btn-wrap">
                <button type="submit" disabled={loading} className="signup-btn">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Criando conta…
                    </>
                  ) : (
                    <>
                      Começar gratuitamente
                      <svg className="signup-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="signup-footer">
              <p className="signup-login-link">
                Já tem conta?{' '}
                <a href="/login">Entrar</a>
              </p>
              <div className="signup-ssl-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(16,185,129,0.12)"/>
                </svg>
                Conexão Segura · Cancele quando quiser
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
