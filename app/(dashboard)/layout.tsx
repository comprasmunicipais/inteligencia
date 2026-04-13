'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/shared/Sidebar';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { useCompany } from '@/components/providers/CompanyProvider';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, companyId, loading, signOut, isDemo } = useCompany();
  const isDevUser = user?.email === 'feddamico@hotmail.com';
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  // undefined = still loading | null = no plan | string = has plan
  const [planId, setPlanId] = useState<string | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoleLoading(false); return; }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? null);
        setRoleLoading(false);
      });
  }, [user, supabase]);

  useEffect(() => {
    if (!companyId) { setPlanId(undefined); return; }
    supabase
      .from('companies')
      .select('plan_id')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        setPlanId(data?.plan_id ?? null);
      });
  }, [companyId, supabase]);

  // Redirect when there is no plan
  useEffect(() => {
    if (roleLoading || role === 'platform_admin' || isDemo || isDevUser) return;
    if (!loading && user && companyId && planId === null) {
      router.replace('/signup/plan?error=plan_required');
    }
  }, [loading, user, companyId, planId, role, roleLoading, router]);

  // User authenticated but not linked to a company
  if (!loading && !roleLoading && user && !companyId && role !== 'platform_admin' && !isDemo && !isDevUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="size-7 text-amber-500" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-slate-900">Conta incompleta</h1>
          <p className="mb-6 text-sm text-slate-600">
            Sua conta não está vinculada a uma empresa. Entre em contato com o suporte.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="https://wa.me/551132807010"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-[#0f49bd] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
            >
              Falar com suporte
            </a>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for plan check — render nothing to avoid flash before redirect
  if (!loading && !roleLoading && user && companyId && planId === undefined && role !== 'platform_admin') {
    return null;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f6f6f8] overflow-hidden">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
