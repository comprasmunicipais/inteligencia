'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SendingAccount = {
  id: string;
  name: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
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

const initialForm: FormState = {
  name: '',
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

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/email/sending-accounts', {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar contas de envio.');
      }

      setAccounts(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas de envio.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/email/sending-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar conta de envio.');
      }

      setMessage('Conta de envio cadastrada com sucesso.');
      setShowModal(false);
      resetForm();
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar conta de envio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(accountId: string) {
    setTestingId(accountId);
    const toastId = toast.loading('Testando conexão SMTP...');

    try {
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao testar conexão.');
      }

      toast.success('Conexão SMTP validada com sucesso!', { id: toastId });
      await loadAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao testar conexão SMTP.', { id: toastId });
      await loadAccounts();
    } finally {
      setTestingId(null);
    }
  }

  function formatTestedAt(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#0f172a]">Contas de envio</h1>
            <p className="text-sm text-slate-600">
              Cadastre e gerencie as contas SMTP utilizadas nos disparos de e-mail.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setShowModal(true);
            }}
            className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a3690] transition-colors"
          >
            Nova conta
          </button>
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Carregando contas de envio...</div>
          ) : accounts.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Nenhuma conta cadastrada até o momento.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Remetente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SMTP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Limites</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Último teste</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{account.name}</div>
                      <div className="text-xs text-slate-500">Usuário SMTP: {account.smtp_username}</div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div>{account.sender_name}</div>
                      <div className="text-xs text-slate-500">{account.sender_email}</div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div>{account.smtp_host}</div>
                      <div className="text-xs text-slate-500">
                        Porta {account.smtp_port} • {account.smtp_secure ? 'Seguro' : 'Não seguro'}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div>Hora: {account.hourly_limit}</div>
                      <div className="text-xs text-slate-500">Dia: {account.daily_limit}</div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        account.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {account.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {account.last_test_status === 'success' && (
                        <div>
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                            OK
                          </span>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatTestedAt(account.last_tested_at)}
                          </div>
                        </div>
                      )}
                      {account.last_test_status === 'error' && (
                        <div>
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                            Falhou
                          </span>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatTestedAt(account.last_tested_at)}
                          </div>
                        </div>
                      )}
                      {!account.last_test_status && (
                        <span className="text-xs text-slate-400">Não testado</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <button
                        type="button"
                        disabled={testingId === account.id}
                        onClick={() => handleTestConnection(account.id)}
                        className="rounded-lg border border-[#0f49bd] px-3 py-1.5 text-xs font-bold text-[#0f49bd] hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testingId === account.id ? 'Testando...' : 'Testar conexão'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0f172a]">Nova conta de envio</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Cadastre uma nova conta SMTP para usar nas campanhas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateAccount}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nome da conta</label>
                  <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ex.: Comercial principal" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nome do remetente</label>
                  <input type="text" value={form.sender_name} onChange={(e) => updateField('sender_name', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ex.: Compras Municipais" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">E-mail do remetente</label>
                  <input type="email" value={form.sender_email} onChange={(e) => updateField('sender_email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="contato@empresa.com.br" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Reply-To</label>
                  <input type="email" value={form.reply_to_email} onChange={(e) => updateField('reply_to_email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="resposta@empresa.com.br" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Host SMTP</label>
                  <input type="text" value={form.smtp_host} onChange={(e) => updateField('smtp_host', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="smtp.empresa.com.br" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Porta SMTP</label>
                  <input type="number" value={form.smtp_port} onChange={(e) => updateField('smtp_port', Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Usuário SMTP</label>
                  <input type="text" value={form.smtp_username} onChange={(e) => updateField('smtp_username', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Usuário SMTP" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Senha SMTP</label>
                  <input type="password" value={form.smtp_password} onChange={(e) => updateField('smtp_password', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Senha SMTP" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Limite por hora</label>
                  <input type="number" value={form.hourly_limit} onChange={(e) => updateField('hourly_limit', Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Limite por dia</label>
                  <input type="number" value={form.daily_limit} onChange={(e) => updateField('daily_limit', Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.smtp_secure} onChange={(e) => updateField('smtp_secure', e.target.checked)} />
                    Usar conexão segura (SSL/TLS)
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} />
                    Conta ativa para envio
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a3690] disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
