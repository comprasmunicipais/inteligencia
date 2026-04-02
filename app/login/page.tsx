'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) throw error;
      setForgotOpen(false);
      setForgotEmail('');
      toast.success('Verifique seu e-mail para redefinir a senha.');
    } catch (err: any) {
      setForgotError(err.message || 'Erro ao enviar link de redefinição.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar login');

      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');

        .login-root {
          min-height: 100vh;
          background-color: #080c14;
          background-image:
            linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .login-halo-top {
          position: absolute;
          top: -160px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(37,99,235,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-halo-br {
          position: absolute;
          bottom: -120px;
          right: -120px;
          width: 500px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: rgba(13,18,30,0.95);
          border: 1px solid rgba(37,99,235,0.2);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 1;
        }

        .login-card-topbar {
          height: 3px;
          background: linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa, transparent);
        }

        .login-card-accent {
          position: absolute;
          top: 0;
          right: 0;
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, rgba(37,99,235,0.12) 0%, transparent 60%);
          pointer-events: none;
        }

        .login-body {
          padding: 40px 40px 36px;
        }

        /* Brand */
        .login-brand {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.05s;
        }

        .login-brand-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(37,99,235,0.15);
          border: 1px solid rgba(37,99,235,0.25);
          margin-bottom: 16px;
        }

        .login-brand-name {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #f0f4ff;
          letter-spacing: -0.5px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .login-brand-name span {
          color: #3b82f6;
        }

        .login-brand-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.7);
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: fadeInUp 0.5s ease both;
        }

        .login-field:nth-child(1) { animation-delay: 0.12s; }
        .login-field:nth-child(2) { animation-delay: 0.20s; }

        .login-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.85);
        }

        .login-input {
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

        .login-input::placeholder {
          color: rgba(100,116,139,0.6);
        }

        .login-input:focus {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }

        .login-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.26s;
        }

        .login-forgot {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          color: rgba(100,116,139,0.75);
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-forgot:hover {
          color: #60a5fa;
        }

        /* Button */
        .login-btn-wrap {
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.32s;
        }

        .login-btn {
          width: 100%;
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
          box-shadow: 0 4px 24px rgba(37,99,235,0.35), 0 1px 0 rgba(255,255,255,0.08) inset;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 32px rgba(37,99,235,0.45);
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-btn-arrow {
          transition: transform 0.2s;
        }

        .login-btn:hover:not(:disabled) .login-btn-arrow {
          transform: translateX(3px);
        }

        /* Footer */
        .login-footer {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: fadeInUp 0.5s ease both;
          animation-delay: 0.4s;
        }

        .login-ssl-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: #34d399;
          letter-spacing: 0.03em;
        }

        .login-footer-text {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          color: rgba(100,116,139,0.55);
          text-align: center;
          line-height: 1.6;
        }

        .login-footer-text a {
          color: rgba(100,116,139,0.7);
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-footer-text a:hover {
          color: #60a5fa;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="login-root">
        <div className="login-halo-top" />
        <div className="login-halo-br" />

        <div className="login-card">
          <div className="login-card-topbar" />
          <div className="login-card-accent" />

          <div className="login-body">
            {/* Brand */}
            <div className="login-brand">
              <div className="login-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="login-brand-name">CM <span>PRO</span></div>
              <div className="login-brand-sub">Inteligência Comercial B2G</div>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '12px', color: '#3c4043', fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', transition: 'box-shadow 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.0 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.311 0-9.82-3.322-11.479-7.982l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l6.19 5.238C42.012 35.245 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
              </svg>
              Continuar com Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: 'rgba(100,116,139,0.55)', letterSpacing: '0.05em' }}>ou</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label className="login-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com.br"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="login-field">
                <label className="login-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="login-forgot-row">
                <button type="button" onClick={() => { setForgotOpen(true); setForgotError(''); }} className="login-forgot">
                  Esqueceu a senha?
                </button>
              </div>

              <div className="login-btn-wrap">
                <button type="submit" disabled={loading} className="login-btn">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar na Plataforma
                      <svg className="login-btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="login-footer">
              <div className="login-ssl-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(16,185,129,0.15)"/>
                </svg>
                Conexão Segura · SSL
              </div>
              <p className="login-footer-text">
                Acesso restrito a usuários autorizados.<br />
                <a href="#">Termos de Uso</a> · <a href="#">Privacidade</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="login-card" style={{ maxWidth: '400px' }}>
            <div className="login-card-topbar" />
            <div className="login-body" style={{ padding: '32px' }}>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 700, color: '#f0f4ff', marginBottom: '8px' }}>
                Redefinir senha
              </h2>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: 'rgba(148,163,184,0.75)', marginBottom: '24px' }}>
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-field">
                  <label className="login-label">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com.br"
                    className="login-input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                {forgotError && (
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#f87171' }}>{forgotError}</p>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    style={{ flex: 1, height: '44px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(148,163,184,0.85)', fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={forgotLoading} className="login-btn" style={{ flex: 2, height: '44px' }}>
                    {forgotLoading ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : 'Enviar link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
