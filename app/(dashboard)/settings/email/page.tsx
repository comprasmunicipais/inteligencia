'use client';

import { useEffect, useState } from 'react';

type SenderSettingsForm = {
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
};

const initialForm: SenderSettingsForm = {
  sender_name: '',
  sender_email: '',
  reply_to_email: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_username: '',
  smtp_password: '',
  daily_limit: 500,
  hourly_limit: 100,
  is_active: true,
};

export default function EmailSettingsPage() {
  const [form, setForm] = useState<SenderSettingsForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExistingSettings() {
      try {
        setLoadingExisting(true);
        setError(null);

        const response = await fetch('/api/email/sender-settings', {
          method: 'GET',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setLoadingExisting(false);
            return;
          }

          const result = await response.json();
          throw new Error(result.error || 'Erro ao carregar configuração.');
        }

        const result = await response.json();

        if (result?.data) {
          setForm((prev) => ({
            ...prev,
            sender_name: result.data.sender_name ?? '',
            sender_email: result.data.sender_email ?? '',
            reply_to_email: result.data.reply_to_email ?? '',
            smtp_host: result.data.smtp_host ?? '',
            smtp_port: result.data.smtp_port ?? 587,
            smtp_secure: result.data.smtp_secure ?? false,
            smtp_username: result.data.smtp_username ?? '',
            smtp_password: '',
            daily_limit: result.data.daily_limit ?? 500,
            hourly_limit: result.data.hourly_limit ?? 100,
            is_active: result.data.is_active ?? true,
          }));
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar configuração.');
      } finally {
        setLoadingExisting(false);
      }
    }

    loadExistingSettings();
  }, []);

  function updateField<K extends keyof SenderSettingsForm>(
    field: K,
    value: SenderSettingsForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/email/sender-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar configuração.');
      }

      setMessage('Configuração SMTP salva com sucesso.');
      setForm((prev) => ({
        ...prev,
        smtp_password: '',
      }));
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configuração.');
    } finally {
      setLoading(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Configuração de E-mail
        </h1>
        <p className="mt-4 text-sm text-slate-600">Carregando configuração...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Configuração de E-mail
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure a conta SMTP que será usada nos disparos da empresa.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nome do remetente
              </label>
              <input
                type="text"
                value={form.sender_name}
                onChange={(e) => updateField('sender_name', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Ex.: Compras Municipais"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                E-mail do remetente
              </label>
              <input
                type="email"
                value={form.sender_email}
                onChange={(e) => updateField('sender_email', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Ex.: contato@empresa.com.br"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reply-To
              </label>
              <input
                type="email"
                value={form.reply_to_email}
                onChange={(e) => updateField('reply_to_email', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Ex.: resposta@empresa.com.br"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Host SMTP
              </label>
              <input
                type="text"
                value={form.smtp_host}
                onChange={(e) => updateField('smtp_host', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Ex.: smtp.empresa.com.br"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Porta SMTP
              </label>
              <input
                type="number"
                value={form.smtp_port}
                onChange={(e) => updateField('smtp_port', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="587"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.smtp_secure}
                  onChange={(e) => updateField('smtp_secure', e.target.checked)}
                />
                Usar conexão segura (SSL/TLS)
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Usuário SMTP
              </label>
              <input
                type="text"
                value={form.smtp_username}
                onChange={(e) => updateField('smtp_username', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Usuário SMTP"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Senha SMTP
              </label>
              <input
                type="password"
                value={form.smtp_password}
                onChange={(e) => updateField('smtp_password', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="Informe a senha SMTP"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Limite por hora
              </label>
              <input
                type="number"
                value={form.hourly_limit}
                onChange={(e) => updateField('hourly_limit', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Limite por dia
              </label>
              <input
                type="number"
                value={form.daily_limit}
                onChange={(e) => updateField('daily_limit', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                />
                Conta ativa para envio
              </label>
            </div>
          </div>

          {message && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
