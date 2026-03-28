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
} from 'lucide-react';
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
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'Assinatura') {
      setLoadingSubscription(true);
      fetch('/api/billing/subscription')
        .then(r => r.json())
        .then(data => setSubscriptionData(data))
        .catch(console.error)
        .finally(() => setLoadingSubscription(false));
    }
  }, [activeTab]);

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
        );

      case 'Assinatura': {
        if (loadingSubscription) {
          return (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
            </div>
          );
        }

        const planName     = subscriptionData?.current_plan?.name ?? 'Essencial';
        const status       = subscriptionData?.subscription?.status ?? 'trial';
        const trialEndsAt  = subscriptionData?.subscription?.trial_ends_at ?? subscriptionData?.company?.trial_ends_at ?? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const emailsUsed   = subscriptionData?.company?.emails_used_this_month ?? 0;
        const emailsLimit  = subscriptionData?.current_plan?.emails_per_month ?? 10000;
        const billingCycle = subscriptionData?.subscription?.billing_cycle ?? 'monthly';
        const price        = subscriptionData?.current_plan?.price_monthly ?? 297;

        const fallbackPlans = [
          { name: 'Essencial',    emails: 10000, users: '1 usuário',          price: 297 },
          { name: 'Profissional', emails: 25000, users: '3 usuários',          price: 497, popular: true },
          { name: 'Elite',        emails: 50000, users: 'Usuários ilimitados', price: 797 },
        ];
        const plans = subscriptionData?.all_plans?.length
          ? subscriptionData.all_plans.map((p: any, i: number) => ({
              id: p.id,
              name: p.name,
              emails: p.emails_per_month,
              users: p.max_users === 0 ? 'Usuários ilimitados' : `${p.max_users} usuário${p.max_users !== 1 ? 's' : ''}`,
              price: p.price_monthly,
              popular: i === 1,
            }))
          : fallbackPlans;

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
              <p className="text-sm text-gray-500 mb-4">R$ {price}/mês · ciclo {billingCycle === 'monthly' ? 'mensal' : billingCycle}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                const isCurrent = plan.name === planName;
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
                    <p className="text-2xl font-black text-gray-900">R$ {plan.price}<span className="text-sm font-bold text-gray-400">/mês</span></p>
                    <ul className="text-xs text-gray-500 space-y-1 flex-1">
                      <li>✉️ {plan.emails.toLocaleString('pt-BR')} e-mails/mês</li>
                      <li>👤 {plan.users}</li>
                    </ul>
                    <button
                      disabled={isCurrent}
                      className={cn(
                        'mt-2 w-full py-2 rounded-lg text-sm font-bold transition-all',
                        isCurrent
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {isCurrent ? 'Plano atual' : 'Assinar'}
                    </button>
                  </div>
                );
              })}
            </div>

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
