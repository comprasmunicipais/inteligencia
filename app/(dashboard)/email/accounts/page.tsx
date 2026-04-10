'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useIsReadOnly } from '@/hooks/useIsReadOnly';

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
  spf_status: boolean | null;
  dkim_status: boolean | null;
  dkim_selector: string | null;
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

function accountToForm(account: SendingAccount): FormState {
  return {
    name: account.name,
    sender_name: account.sender_name,
    sender_email: account.sender_email,
    reply_to_email: account.reply_to_email || '',
    smtp_host: account.smtp_host,
    smtp_port: account.smtp_port,
    smtp_secure: account.smtp_secure,
    smtp_username: account.smtp_username,
    smtp_password: '', // nunca preenche senha no edit
    daily_limit: account.daily_limit,
    hourly_limit: account.hourly_limit,
    is_active: account.is_active,
  };
}

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SendingAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/email/sending-accounts', { method: 'GET' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao carregar contas de envio.');
      setAccounts(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas de envio.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAccounts(); }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreate() {
    setEditingAccount(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
    setShowModal(true);
  }

  function openEdit(account: SendingAccount) {
    setEditingAccount(account);
    setForm(accountToForm(account));
    setError(null);
    setMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingAccount(null);
    setForm(initialForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (editingAccount) {
        // PATCH — senha só vai se preenchida
        const payload: Record<string, unknown> = {
          account_id: editingAccount.id,
          name: form.name,
          sender_name: form.sender_name,
          sender_email: form.sender_email,
          reply_to_email: form.reply_to_email,
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_secure: form.smtp_secure,
          smtp_username: form.smtp_username,
          daily_limit: form.daily_limit,
          hourly_limit: form.hourly_limit,
          is_active: form.is_active,
        };
        if (form.smtp_password.trim()) payload.smtp_password = form.smtp_password;

        const response = await fetch('/api/email/sending-accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao atualizar conta de envio.');
        setMessage('Conta de envio atualizada com sucesso.');
      } else {
        // POST
        const response = await fetch('/api/email/sending-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao salvar conta de envio.');
        setMessage('Conta de envio cadastrada com sucesso.');
      }

      closeModal();
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar conta de envio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(accountId: string) {
    try {
      setDeletingId(accountId);
      const response = await fetch('/api/email/sending-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao excluir conta.');
      toast.success('Conta de envio excluída.');
      setConfirmDeleteId(null);
      await loadAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir conta.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTestConnection(accountId: string) {
    setTestingId(accountId);
    const toastId = toast.loading('Testando SMTP e DNS...');
    try {
      const [smtpRes, dnsRes] = await Promise.all([
        fetch('/api/email/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId }),
        }),
        fetch(`/api/email/check-dns?account_id=${accountId}`),
      ]);

      const smtpResult = await smtpRes.json();
      if (!smtpRes.ok) throw new Error(smtpResult.error || 'Falha ao testar conexão SMTP.');

      const dnsResult = dnsRes.ok ? await dnsRes.json() : null;
      const dnsMsg = dnsResult
        ? dnsResult.spf && dnsResult.dkim
          ? 'SPF e DKIM OK.'
          : !dnsResult.spf && !dnsResult.dkim
          ? 'SPF e DKIM não encontrados.'
          : !dnsResult.spf
          ? 'SPF não encontrado.'
          : 'DKIM não encontrado.'
        : '';

      toast.success(`SMTP OK. ${dnsMsg}`, { id: toastId });
      await loadAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao testar.', { id: toastId });
      await loadAccounts();
    } finally {
      setTestingId(null);
    }
  }

  function formatTestedAt(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const isEditing = !!editingAccount;
  const isReadOnly = useIsReadOnly();

  if (isReadOnly) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-6 flex items-center justify-center">
        <div className="max-w-sm w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-50">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Funcionalidade disponível após contratação</h2>
          <p className="mt-2 text-sm text-gray-500">
            Configure contas SMTP e dispare campanhas reais com o plano completo do CM Pro.
          </p>
          <a
            href="/contato"
            className="mt-6 inline-block rounded-lg bg-[#0f49bd] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0a3690] transition-colors"
          >
            Quero contratar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#0f172a]">Contas de envio</h1>
            <p className="text-sm text-slate-600">
              Cadastre e gerencie as contas SMTP utilizadas nos disparos de e-mail.{' '}
              <a
                href="https://inteligencia-sooty.vercel.app/help/email-auth.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0f49bd] hover:underline"
              >
                Como configurar SPF e DKIM
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
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
            <div className="p-6 text-sm text-slate-600">Nenhuma conta cadastrada até o momento.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Remetente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SMTP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Limites</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Saúde</th>
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
                        account.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {account.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div className="flex flex-col gap-1">
                        {/* SMTP */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-xs text-slate-400">SMTP</span>
                          {account.last_test_status === 'success' && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">OK</span>
                          )}
                          {account.last_test_status === 'error' && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Falhou</span>
                          )}
                          {!account.last_test_status && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">?</span>
                          )}
                        </div>
                        {/* SPF */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-xs text-slate-400">SPF</span>
                          {account.spf_status === true && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">OK</span>
                          )}
                          {account.spf_status === false && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Ausente</span>
                          )}
                          {account.spf_status === null && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">?</span>
                          )}
                        </div>
                        {/* DKIM */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-10 text-xs text-slate-400">DKIM</span>
                          {account.dkim_status === true && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700" title={account.dkim_selector ? `selector: ${account.dkim_selector}` : undefined}>OK</span>
                          )}
                          {account.dkim_status === false && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Ausente</span>
                          )}
                          {account.dkim_status === null && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">?</span>
                          )}
                        </div>
                        {account.last_tested_at && (
                          <div className="text-xs text-slate-400 mt-0.5">{formatTestedAt(account.last_tested_at)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={testingId === account.id}
                          onClick={() => handleTestConnection(account.id)}
                          className="rounded-lg border border-[#0f49bd] px-3 py-1.5 text-xs font-bold text-[#0f49bd] hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testingId === account.id ? 'Testando...' : 'Testar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(account.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal criar / editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0f172a]">
                  {isEditing ? 'Editar conta de envio' : 'Nova conta de envio'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isEditing
                    ? 'Atualize os dados da conta SMTP. Deixe a senha em branco para mantê-la.'
                    : 'Cadastre uma nova conta SMTP para usar nas campanhas.'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-700">
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Senha SMTP{isEditing && <span className="ml-1 text-xs font-normal text-slate-400">(deixe em branco para manter)</span>}
                  </label>
                  <input type="password" value={form.smtp_password} onChange={(e) => updateField('smtp_password', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={isEditing ? '••••••••' : 'Senha SMTP'} />
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

              {/* DNS status section — only when editing */}
              {isEditing && editingAccount && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Configuração DNS</h3>
                  <div className="mb-3 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">SPF</span>
                      {editingAccount.spf_status === true && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Configurado</span>}
                      {editingAccount.spf_status === false && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Não encontrado</span>}
                      {editingAccount.spf_status === null && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Não verificado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">DKIM</span>
                      {editingAccount.dkim_status === true && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Configurado {editingAccount.dkim_selector ? `(selector: ${editingAccount.dkim_selector})` : ''}</span>}
                      {editingAccount.dkim_status === false && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Não encontrado</span>}
                      {editingAccount.dkim_status === null && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Não verificado</span>}
                    </div>
                  </div>
                  {(editingAccount.spf_status === false || editingAccount.dkim_status === false) && (
                    <div className="space-y-2 text-xs text-slate-600">
                      {editingAccount.spf_status === false && (
                        <div>
                          <p className="font-medium text-slate-700">Como configurar SPF:</p>
                          <p>Adicione um registro <code className="rounded bg-slate-200 px-1">TXT</code> no DNS do domínio <strong>{editingAccount.sender_email.split('@')[1]}</strong>:</p>
                          <code className="mt-1 block rounded bg-slate-200 px-2 py-1 font-mono">v=spf1 include:meuprovedor.com.br ~all</code>
                          <p className="mt-1 text-slate-500">Substitua pelo include correto do seu provedor SMTP.</p>
                        </div>
                      )}
                      {editingAccount.dkim_status === false && (
                        <div className="mt-2">
                          <p className="font-medium text-slate-700">Como configurar DKIM:</p>
                          <p>Acesse o painel do seu provedor de e-mail, copie a chave pública DKIM e adicione:</p>
                          <code className="mt-1 block rounded bg-slate-200 px-2 py-1 font-mono">TXT default._domainkey.{editingAccount.sender_email.split('@')[1]}</code>
                          <p className="mt-1 text-slate-500">O valor será fornecido pelo seu provedor. Clique em &ldquo;Testar&rdquo; para verificar após configurar.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a3690] disabled:opacity-60 transition-colors">
                  {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#0f172a]">Excluir conta de envio</h2>
            <p className="mt-2 text-sm text-slate-600">
              Essa ação é permanente. A conta será removida e não poderá ser recuperada.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingId === confirmDeleteId}
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deletingId === confirmDeleteId ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
