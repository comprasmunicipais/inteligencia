'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/shared/Header';
import {
  User,
  Shield,
  Bell,
  Database,
  Globe,
  CreditCard,
  HelpCircle,
  Loader2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  email: string;
  role: string;
  companyName: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Perfil');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, 'PIX' | 'BOLETO' | 'CREDIT_CARD'>>({});
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semiannual' | 'annual'>('monthly');
  const [cardModal, setCardModal] = useState<{ plan: any } | null>(null);
  const [cardForm, setCardForm] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', cpfCnpj: '', postalCode: '', addressNumber: '', phone: '' });
  const [submittingCard, setSubmittingCard] = useState(false);

  // Team management state (Organização tab)
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; email: string; role: string }[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'company_admin'>('user');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('email, role, company_id')
          .eq('id', user.id)
          .single();

        let companyName = '';
        if (profile?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .single();
          companyName = company?.name ?? '';
        }

        setUserProfile({
          email: profile?.email ?? user.email ?? '',
          role: profile?.role ?? '',
          companyName,
        });
        setCompanyId(profile?.company_id ?? null);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getPaymentMethod = (planName: string): 'PIX' | 'BOLETO' | 'CREDIT_CARD' =>
    paymentMethods[planName] ?? 'PIX';

  const handleSubscribe = async (plan: any, billingType: string) => {
    setSubscribingPlan(plan.name);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, billingCycle, billingType, email: userProfile?.email ?? '', name: userProfile?.companyName ?? '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Erro ao assinar plano.', 'error');
      } else {
        showToast('Plano atualizado com sucesso!', 'success');
        loadSubscription();
      }
    } catch {
      showToast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setSubscribingPlan(null);
    }
  };

  const handleSubscribeClick = (plan: any) => {
    const method = getPaymentMethod(plan.name);
    if (method === 'CREDIT_CARD') {
      setCardModal({ plan });
    } else {
      handleSubscribe(plan, method);
    }
  };

  const handleSubmitCard = async () => {
    if (!cardModal) return;
    setSubmittingCard(true);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: cardModal.plan.id,
          billingCycle,
          billingType: 'CREDIT_CARD',
          email: userProfile?.email ?? '',
          name: userProfile?.companyName ?? '',
          creditCard: {
            holderName: cardForm.holderName,
            number: cardForm.number.replace(/\s/g, ''),
            expiryMonth: cardForm.expiryMonth,
            expiryYear: cardForm.expiryYear,
            ccv: cardForm.ccv,
          },
          creditCardHolderInfo: {
            name: cardForm.holderName,
            email: userProfile?.email ?? '',
            cpfCnpj: cardForm.cpfCnpj.replace(/\D/g, ''),
            postalCode: cardForm.postalCode.replace(/\D/g, ''),
            addressNumber: cardForm.addressNumber,
            ...(cardForm.phone ? { phone: cardForm.phone } : {}),
          },
        }),
      });
      const data = await res.json();
      setCardModal(null);
      setCardForm({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', cpfCnpj: '', postalCode: '', addressNumber: '', phone: '' });
      if (!res.ok) {
        showToast(data.error || 'Erro ao processar cartão.', 'error');
      } else {
        showToast('Assinatura com cartão confirmada!', 'success');
        loadSubscription();
      }
    } catch {
      setCardModal(null);
      showToast('Erro de conexão. Tente novamente.', 'error');
    } finally {
      setSubmittingCard(false);
    }
  };

  const loadSubscription = () => {
    setLoadingSubscription(true);
    setSubscriptionError(false);
    fetch('/api/billing/subscription')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => setSubscriptionData(data))
      .catch(() => setSubscriptionError(true))
      .finally(() => setLoadingSubscription(false));
  };

  useEffect(() => {
    if (activeTab === 'Assinatura') {
      loadSubscription();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'Organização' || !companyId) return;
    const supabase = createClient();
    setLoadingTeam(true);
    supabase
      .from('profiles')
      .select('id, email, role')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setTeamMembers(data ?? []))
      .finally(() => setLoadingTeam(false));
  }, [activeTab, companyId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError('Informe o e-mail.'); return; }
    setInviting(true);
    setInviteError('');
    try {
      const res = await fetch('/api/settings/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Erro ao enviar convite.');
      } else {
        toast.success('Convite enviado com sucesso!');
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteRole('user');
        // Reload team list
        if (companyId) {
          const supabase = createClient();
          const { data: members } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });
          setTeamMembers(members ?? []);
        }
      }
    } catch {
      setInviteError('Erro de conexão. Tente novamente.');
    } finally {
      setInviting(false);
    }
  };

  const tabs = [
    { name: 'Perfil', icon: User },
    { name: 'Organização', icon: Globe },
    { name: 'Segurança', icon: Shield },
    { name: 'Notificações', icon: Bell },
    { name: 'Integrações', icon: Database },
    { name: 'Assinatura', icon: CreditCard },
  ];

  const initials = userProfile?.email
    ? userProfile.email.slice(0, 2).toUpperCase()
    : '??';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Perfil':
        return (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Informações do Perfil</h3>
            {loadingProfile ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 text-[#0f49bd] animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="size-20 rounded-full bg-[#0f49bd] flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{initials}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      defaultValue={userProfile?.email ?? ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Perfil de Acesso</label>
                    <input
                      type="text"
                      defaultValue={userProfile?.role ?? ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</label>
                    <input
                      type="text"
                      defaultValue={userProfile?.companyName ?? ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</label>
                    <input
                      type="text"
                      defaultValue=""
                      placeholder="Não informado"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
                    <input
                      type="text"
                      defaultValue=""
                      placeholder="Não informado"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'Organização':
        return (
          <div className="space-y-6">
            {/* Team members */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-gray-900">Membros da equipe</h3>
                </div>
                {userProfile?.role === 'company_admin' || userProfile?.role === 'platform_admin' ? (
                  <button
                    type="button"
                    onClick={() => { setShowInviteForm((v) => !v); setInviteError(''); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f49bd] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0c3c9c] transition"
                  >
                    <UserPlus className="size-3.5" />
                    Convidar membro
                  </button>
                ) : null}
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="email@empresa.com.br"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'user' | 'company_admin')}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
                    >
                      <option value="user">Membro</option>
                      <option value="company_admin">Administrador</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={inviting}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-bold text-white hover:bg-[#0c3c9c] disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {inviting && <Loader2 className="size-3.5 animate-spin" />}
                      {inviting ? 'Enviando…' : 'Enviar convite'}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="mt-2 text-xs text-red-600">{inviteError}</p>
                  )}
                </div>
              )}

              {/* Members list */}
              {loadingTeam ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 text-[#0f49bd] animate-spin" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  Nenhum membro encontrado.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {teamMembers.map((member) => (
                    <li key={member.id} className="flex items-center justify-between px-6 py-3">
                      <span className="text-sm text-slate-800">{member.email}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.role === 'company_admin' || member.role === 'platform_admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {member.role === 'company_admin' || member.role === 'platform_admin'
                          ? 'Admin'
                          : 'Membro'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Org preferences (kept as-is) */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Preferências da Organização</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Moeda Padrão</p>
                    <p className="text-xs text-gray-500">Real Brasileiro (BRL)</p>
                  </div>
                  <button className="text-xs font-bold text-[#0f49bd] hover:underline">Alterar</button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Fuso Horário</p>
                    <p className="text-xs text-gray-500">(GMT-03:00) Brasília</p>
                  </div>
                  <button className="text-xs font-bold text-[#0f49bd] hover:underline">Alterar</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Assinatura': {
        if (loadingSubscription) {
          return (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
            </div>
          );
        }

        if (subscriptionError) {
          return (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
              <p className="text-sm font-bold text-gray-900 mb-2">Não foi possível carregar dados da assinatura</p>
              <p className="text-xs text-gray-500 mb-6">Verifique sua conexão e tente novamente.</p>
              <button
                onClick={loadSubscription}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Tentar novamente
              </button>
            </div>
          );
        }

        if (!subscriptionData) return null;

        const planName     = subscriptionData.current_plan?.name ?? '';
        const status       = subscriptionData.subscription?.status ?? subscriptionData.company?.status ?? '';
        const trialEndsAt  = subscriptionData.subscription?.trial_ends_at ?? subscriptionData.company?.trial_ends_at ?? null;
        const emailsUsed   = subscriptionData.company?.emails_used_this_month ?? 0;
        const emailsLimit  = subscriptionData.current_plan?.emails_per_month ?? 0;
        const currentCycle = subscriptionData.subscription?.billing_cycle ?? 'monthly';
        const price        = subscriptionData.current_plan?.price_monthly ?? 0;
        const plans = subscriptionData?.all_plans?.length
          ? subscriptionData.all_plans.map((p: any, i: number) => ({
              id: p.id,
              name: p.name,
              emails: p.emails_per_month,
              users: p.max_users === 0 ? 'Usuários ilimitados' : `${p.max_users} usuário${p.max_users !== 1 ? 's' : ''}`,
              price_monthly: p.price_monthly,
              price_semiannual: p.price_semiannual,
              price_annual: p.price_annual,
              popular: i === 1,
            }))
          : [];

        const trialDaysLeft = status === 'trial' && trialEndsAt
          ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null;
        const emailProgress = Math.round((emailsUsed / emailsLimit) * 100);

        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Plano Atual</h3>
                <span className={cn(
                  'text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider',
                  status === 'active'   ? 'bg-green-100 text-green-700' :
                  status === 'trial'    ? 'bg-amber-100 text-amber-700' :
                  status === 'past_due' ? 'bg-red-100 text-red-700'     :
                                         'bg-gray-100 text-gray-600'
                )}>
                  {status === 'trial' ? 'Trial' : status === 'active' ? 'Ativo' : status === 'past_due' ? 'Inadimplente' : status}
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mb-1">{planName}</p>
              <p className="text-sm text-gray-500 mb-4">R$ {price}/mês · ciclo {currentCycle === 'monthly' ? 'mensal' : currentCycle}</p>
              {trialDaysLeft !== null && (
                <p className="text-sm text-amber-700 font-bold mb-4">⏳ {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''} do período de trial</p>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>E-mails utilizados</span>
                  <span>{emailsUsed.toLocaleString('pt-BR')} / {emailsLimit.toLocaleString('pt-BR')}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', emailProgress >= 90 ? 'bg-red-500' : emailProgress >= 70 ? 'bg-amber-500' : 'bg-blue-600')}
                    style={{ width: `${emailProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">{emailProgress}% utilizado</p>
              </div>
            </div>

            {/* Billing cycle toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                {(['monthly', 'semiannual', 'annual'] as const).map((c) => {
                  const labels = { monthly: 'Mensal', semiannual: 'Semestral', annual: 'Anual' };
                  const savings: Record<string, string | null> = { monthly: null, semiannual: '-10%', annual: '-22%' };
                  return (
                    <button
                      key={c}
                      onClick={() => setBillingCycle(c)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center min-w-[72px]',
                        billingCycle === c ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      {labels[c]}
                      {savings[c] && <span className="text-[10px] text-green-600 font-bold leading-none mt-0.5">{savings[c]}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                const isCurrent = plan.name === planName;
                const displayPrice = billingCycle === 'semiannual'
                  ? plan.price_semiannual
                  : billingCycle === 'annual'
                  ? plan.price_annual
                  : plan.price_monthly;
                const cycleSuffix = billingCycle === 'monthly' ? '/mês' : billingCycle === 'semiannual' ? '/sem.' : '/ano';
                return (
                  <div key={plan.name} className={cn(
                    'relative bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-3',
                    plan.popular ? 'border-blue-600' : 'border-gray-200'
                  )}>
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                        Mais Popular
                      </span>
                    )}
                    <p className="text-sm font-black text-gray-900">{plan.name}</p>
                    <p className="text-2xl font-black text-gray-900">R$ {displayPrice}<span className="text-sm font-bold text-gray-400">{cycleSuffix}</span></p>
                    <ul className="text-xs text-gray-500 space-y-1 flex-1">
                      <li>✉️ {plan.emails.toLocaleString('pt-BR')} e-mails/mês</li>
                      <li>👤 {plan.users}</li>
                    </ul>
                    {!isCurrent && (
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-bold">
                        {(['PIX', 'BOLETO', 'CREDIT_CARD'] as const).map((method) => {
                          const label = method === 'CREDIT_CARD' ? 'Cartão' : method === 'BOLETO' ? 'Boleto' : 'PIX';
                          const selected = getPaymentMethod(plan.name) === method;
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethods(prev => ({ ...prev, [plan.name]: method }))}
                              className={cn('flex-1 py-1.5 transition-all', selected ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button
                      disabled={isCurrent || subscribingPlan !== null}
                      onClick={() => !isCurrent && handleSubscribeClick(plan)}
                      className={cn(
                        'mt-2 w-full py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2',
                        isCurrent
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : subscribingPlan === plan.name
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {subscribingPlan === plan.name && <Loader2 className="size-3.5 animate-spin" />}
                      {isCurrent ? 'Plano atual' : subscribingPlan === plan.name ? 'Aguarde...' : 'Assinar'}
                    </button>
                  </div>
                );
              })}
            </div>

            {status !== 'cancelled' && status !== 'trial' && (
              <div className="text-center">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors"
                >
                  Cancelar assinatura
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Pacote Extra de E-mails</h3>
              <p className="text-xs text-gray-500 mb-4">Precisa enviar mais e-mails este mês? Adquira um pacote adicional sem mudar de plano.</p>
              <button className="px-5 py-2.5 rounded-lg text-sm font-bold border border-blue-600 text-blue-600 hover:bg-blue-50 transition-all">
                Comprar 5.000 e-mails por R$ 80
              </button>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
            <div className="size-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-6">
              <Database className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{activeTab}</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Esta funcionalidade está sendo preparada para sua organização. Em breve você poderá gerenciar suas configurações de {activeTab.toLowerCase()}.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all',
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        )}>
          {toast.message}
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancelar assinatura</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Tem certeza? Você perderá acesso ao final do período atual. Seus dados ficam preservados por 30 dias.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
              >
                Voltar
              </button>
              <button
                disabled={cancelling}
                onClick={async () => {
                  setCancelling(true);
                  try {
                    const res = await fetch('/api/billing/cancel', { method: 'POST' });
                    const data = await res.json();
                    setShowCancelModal(false);
                    if (!res.ok) {
                      setToast({ message: data.error || 'Erro ao cancelar.', type: 'error' });
                    } else {
                      setToast({ message: 'Assinatura cancelada.', type: 'success' });
                      loadSubscription();
                    }
                    setTimeout(() => setToast(null), 4000);
                  } catch {
                    setShowCancelModal(false);
                    setToast({ message: 'Erro de conexão. Tente novamente.', type: 'error' });
                    setTimeout(() => setToast(null), 4000);
                  } finally {
                    setCancelling(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                {cancelling && <Loader2 className="size-3.5 animate-spin" />}
                {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
      {cardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-1">Pagamento com Cartão</h3>
            <p className="text-xs text-gray-500 mb-5">Plano <strong>{cardModal.plan.name}</strong> · R$ {billingCycle === 'semiannual' ? cardModal.plan.price_semiannual : billingCycle === 'annual' ? cardModal.plan.price_annual : cardModal.plan.price_monthly}/{billingCycle === 'monthly' ? 'mês' : billingCycle === 'semiannual' ? 'sem.' : 'ano'}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome no cartão</label>
                <input
                  type="text"
                  value={cardForm.holderName}
                  onChange={e => setCardForm(f => ({ ...f, holderName: e.target.value }))}
                  placeholder="Como impresso no cartão"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Número do cartão</label>
                <input
                  type="text"
                  value={cardForm.number}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const masked = digits.replace(/(.{4})/g, '$1 ').trim();
                    setCardForm(f => ({ ...f, number: masked }));
                  }}
                  placeholder="0000 0000 0000 0000"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mês</label>
                  <input
                    type="text"
                    value={cardForm.expiryMonth}
                    onChange={e => setCardForm(f => ({ ...f, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder="MM"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ano</label>
                  <input
                    type="text"
                    value={cardForm.expiryYear}
                    onChange={e => setCardForm(f => ({ ...f, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="AAAA"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CVV</label>
                  <input
                    type="password"
                    value={cardForm.ccv}
                    onChange={e => setCardForm(f => ({ ...f, ccv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="···"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CPF / CNPJ do titular</label>
                <input
                  type="text"
                  value={cardForm.cpfCnpj}
                  onChange={e => setCardForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CEP</label>
                  <input
                    type="text"
                    value={cardForm.postalCode}
                    onChange={e => setCardForm(f => ({ ...f, postalCode: e.target.value }))}
                    placeholder="00000-000"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Número</label>
                  <input
                    type="text"
                    value={cardForm.addressNumber}
                    onChange={e => setCardForm(f => ({ ...f, addressNumber: e.target.value }))}
                    placeholder="123"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone (opcional)</label>
                <input
                  type="text"
                  value={cardForm.phone}
                  onChange={e => setCardForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCardModal(null); setCardForm({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', cpfCnpj: '', postalCode: '', addressNumber: '', phone: '' }); }}
                disabled={submittingCard}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitCard}
                disabled={submittingCard}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {submittingCard && <Loader2 className="size-3.5 animate-spin" />}
                {submittingCard ? 'Processando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Header title="Configurações" subtitle="Gerencie as preferências da sua conta e da organização." />
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-1">
            {tabs.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === item.name ? "bg-white text-[#0f49bd] shadow-sm border border-gray-200" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <item.icon className="size-4" />
                {item.name}
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <Link
                href="/help"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                <HelpCircle className="size-4" />
                Ajuda
              </Link>
            </div>
          </aside>

          <div className="flex-1 space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
}
