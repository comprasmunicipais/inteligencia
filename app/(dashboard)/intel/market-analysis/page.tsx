'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/shared/Header';
import {
  TrendingUp,
  Building2,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/components/providers/CompanyProvider';

interface MarketKPIs {
  totalVolume: number;
  organCount: number;
  totalOpportunities: number;
}

export default function MarketAnalysisPage() {
  const { companyId } = useCompany();
  const [kpis, setKpis] = useState<MarketKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase
      .from('opportunities')
      .select('estimated_value, organ_name')
      .eq('company_id', companyId)
      .neq('internal_status', 'expired')
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const totalVolume = data.reduce((acc, o) => acc + Number(o.estimated_value || 0), 0);
        const organCount = new Set(data.map(o => o.organ_name).filter(Boolean)).size;
        setKpis({ totalVolume, organCount, totalOpportunities: data.length });
        setLoading(false);
      });
  }, [companyId]);

  return (
    <>
      <Header
        title="Análise de Mercado"
        subtitle="Inteligência competitiva e tendências de compras públicas por setor e região."
      />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Market Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="size-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Volume Total de Licitações</h3>
              {loading ? (
                <div className="h-8 w-32 bg-gray-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-black text-gray-900">{kpis ? formatCurrency(kpis.totalVolume) : '—'}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Oportunidades ativas no seu perfil</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Building2 className="size-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Órgãos Compradores</h3>
              {loading ? (
                <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-black text-gray-900">{kpis?.organCount ?? '—'}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Órgãos únicos nas suas oportunidades</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="size-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Licitações Ativas</h3>
              {loading ? (
                <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-black text-gray-900">{kpis?.totalOpportunities ?? '—'}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Oportunidades em aberto no seu perfil</p>
            </div>
          </div>

          {/* Charts — Em breve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ComingSoonCard title="Oportunidades por Categoria" />
            <ComingSoonCard title="Modalidades de Contratação" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ComingSoonCard title="Análise de Competitividade" />
            <div className="lg:col-span-2">
              <ComingSoonCard title="Top Órgãos Compradores" />
            </div>
          </div>

          {/* Reports — Em breve */}
          <ComingSoonCard title="Relatórios de Inteligência" />
        </div>
      </div>
    </>
  );
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="p-3 bg-gray-50 rounded-full">
          <Clock className="size-6 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-400">Em breve</p>
        <p className="text-xs text-gray-300 max-w-xs">Esta análise estará disponível em uma próxima atualização.</p>
      </div>
    </div>
  );
}
