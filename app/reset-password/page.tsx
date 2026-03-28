'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Supabase sends the token in the URL hash; the client picks it up automatically
  // on SIGNED_IN with the PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success('Senha atualizada com sucesso!');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar a senha. Tente novamente.');
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

        .login-body {
          padding: 40px 40px 36px;
        }

        .login-brand {
          text-align: center;
          margin-bottom: 32px;
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

        .login-brand-name span { color: #3b82f6; }

        .login-brand-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.7);
        }

        .login-form { display: flex; flex-direction: column; gap: 20px; }

        .login-field { display: flex; flex-direction: column; gap: 8px; }

        .login-label {
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

        .login-input::placeholder { color: rgba(100,116,139,0.6); }

        .login-input:focus {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
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
          box-shadow: 0 4px 24px rgba(37,99,235,0.35);
          transition: opacity 0.2s, transform 0.15s;
        }

        .login-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div className="login-root">
        <div className="login-halo-top" />

        <div className="login-card">
          <div className="login-card-topbar" />
          <div className="login-body">
            <div className="login-brand">
              <div className="login-brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="login-brand-name">CM <span>PRO</span></div>
              <div className="login-brand-sub">Redefinição de Senha</div>
            </div>

            {!ready ? (
              <div style={{ textAlign: 'center', color: 'rgba(148,163,184,0.7)', fontFamily: "'Outfit', sans-serif", fontSize: '14px' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#3b82f6' }} />
                Verificando link de redefinição…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    className="login-input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#f87171', margin: 0 }}>
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="login-btn">
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Salvando…</>
                  ) : (
                    'Salvar nova senha'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
