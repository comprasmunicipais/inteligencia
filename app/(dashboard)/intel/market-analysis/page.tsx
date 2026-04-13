'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/shared/Header';
import { TrendingUp, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/components/providers/CompanyProvider';

interface MarketKPIs {
  totalVolume: number;
  organCount: number;
  totalOpportunities: number;
}

interface CategoryItem { name: string; count: number; volume: number; }
interface ModalityItem { name: string; count: number; }
interface BuyerItem { name: string; volume: number; }

interface AnalysisData {
  kpis: MarketKPIs;
  byCategory: CategoryItem[];
  byModality: ModalityItem[];
  scoreDistribution: { alta: number; media: number; baixa: number };
  topBuyers: BuyerItem[];
}

export default function MarketAnalysisPage() {
  const supabase = useRef(createClient()).current;
  const { companyId } = useCompany();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      // Buscar scores da empresa (apenas onde score > 0)
      const { data: scores } = await supabase
        .from('company_opportunity_scores')
        .select('opportunity_id, match_score')
        .eq('company_id', companyId)
        .gt('match_score', 0);

      if (!scores || scores.length === 0) {
        setData({
          kpis: { totalVolume: 0, organCount: 0, totalOpportunities: 0 },
          byCategory: [],
          byModality: [],
          scoreDistribution: { alta: 0, media: 0, baixa: 0 },
          topBuyers: [],
        });
        setLoading(false);
        return;
      }

      const scoreMap = new Map(scores.map(s => [s.opportunity_id, s.match_score]));
      const oppIds = scores.map(s => s.opportunity_id);

      // Buscar oportunidades globais com score > 0 para esta empresa
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, estimated_value, organ_name, modality')
        .in('id', oppIds)
        .neq('internal_status', 'expired');

      if (!opps || opps.length === 0) {
        setData({
          kpis: { totalVolume: 0, organCount: 0, totalOpportunities: 0 },
          byCategory: [],
          byModality: [],
          scoreDistribution: { alta: 0, media: 0, baixa: 0 },
          topBuyers: [],
        });
        setLoading(false);
        return;
      }

      // KPIs
      const totalVolume = opps.reduce((acc, o) => acc + Number(o.estimated_value || 0), 0);
      const organCount = new Set(opps.map(o => o.organ_name).filter(Boolean)).size;

      // Modalidades
      const modalityMap = new Map<string, number>();
      for (const o of opps) {
        const m = o.modality || 'Não informado';
        modalityMap.set(m, (modalityMap.get(m) || 0) + 1);
      }
      const byModality: ModalityItem[] = [...modalityMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Distribuição de scores
      let alta = 0, media = 0, baixa = 0;
      for (const [oppId] of scoreMap) {
        const s = scoreMap.get(oppId) || 0;
        if (s >= 70) alta++;
        else if (s >= 40) media++;
        else baixa++;
      }

      // Top órgãos compradores
      const buyerMap = new Map<string, number>();
      for (const o of opps) {
        const b = o.organ_name || 'Não informado';
        buyerMap.set(b, (buyerMap.get(b) || 0) + Number(o.estimated_value || 0));
      }
      const topBuyers: BuyerItem[] = [...buyerMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, volume]) => ({ name, volume }));

      // Categorias — buscar target_categories do perfil e cruzar com oportunidades que bateram
      const { data: profileData } = await supabase
        .from('company_opportunity_scores')
        .select('match_reason')
        .eq('company_id', companyId)
        .gt('match_score', 0);

      const catCountMap = new Map<string, { count: number; volume: number }>();
      if (profileData) {
        for (let i = 0; i < profileData.length; i++) {
          const reason = profileData[i].match_reason || '';
          const match = reason.match(/Categoria de interesse identificada: ([^.]+)/);
          if (match) {
            const cats = match[1].split(',').map((c: string) => c.trim()).filter(Boolean);
            const vol = Number(opps[i]?.estimated_value || 0);
            for (const cat of cats) {
              const prev = catCountMap.get(cat) || { count: 0, volume: 0 };
              catCountMap.set(cat, { count: prev.count + 1, volume: prev.volume + vol });
            }
          }
        }
      }
      const byCategory: CategoryItem[] = [...catCountMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(([name, { count, volume }]) => ({ name, count, volume }));

      setData({
        kpis: { totalVolume, organCount, totalOpportunities: opps.length },
        byCategory,
        byModality,
        scoreDistribution: { alta, media, baixa },
        topBuyers,
      });
      setLoading(false);
    };

    load();
  }, [companyId]);

  const kpis = data?.kpis;

  return (
    <>
      <Header
        title="Análise de Mercado"
        subtitle="Inteligência competitiva e tendências de compras públicas por setor e região."
      />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* KPI Cards */}
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
              <p className="text-xs text-gray-400 mt-2">Soma das oportunidades com aderência ao perfil</p>
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
              <p className="text-xs text-gray-400 mt-2">Órgãos únicos com licitações relevantes</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="size-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Licitações com Aderência</h3>
              {loading ? (
                <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-black text-gray-900">{kpis?.totalOpportunities ?? '—'}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Oportunidades com score {'>'} 0 para seu perfil</p>
            </div>
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnalysisCard title="Oportunidades por Categoria">
              {loading ? <Skeleton /> : data?.byCategory.length ? (
                <BarList
                  items={data.byCategory.map(c => ({ label: c.name, value: c.count, sub: formatCurrency(c.volume) }))}
                  max={data.byCategory[0]?.count || 1}
                  color="bg-blue-500"
                />
              ) : <Empty />}
            </AnalysisCard>

            <AnalysisCard title="Modalidades de Contratação">
              {loading ? <Skeleton /> : data?.byModality.length ? (
                <BarList
                  items={data.byModality.map(m => ({ label: m.name, value: m.count }))}
                  max={data.byModality[0]?.count || 1}
                  color="bg-amber-500"
                />
              ) : <Empty />}
            </AnalysisCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <AnalysisCard title="Distribuição de Aderência">
              {loading ? <Skeleton /> : data ? (
                <div className="space-y-4 pt-2">
                  {[
                    { label: 'Alta (≥ 70)', value: data.scoreDistribution.alta, color: 'bg-green-500' },
                    { label: 'Média (40–69)', value: data.scoreDistribution.media, color: 'bg-yellow-400' },
                    { label: 'Baixa (< 40)', value: data.scoreDistribution.baixa, color: 'bg-red-400' },
                  ].map(({ label, value, color }) => {
                    const total = data.scoreDistribution.alta + data.scoreDistribution.media + data.scoreDistribution.baixa;
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{label}</span>
                          <span className="text-gray-500">{value} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <Empty />}
            </AnalysisCard>

            <div className="lg:col-span-2">
              <AnalysisCard title="Top Órgãos Compradores">
                {loading ? <Skeleton /> : data?.topBuyers.length ? (
                  <BarList
                    items={data.topBuyers.map(b => ({ label: b.name, value: b.volume, sub: formatCurrency(b.volume) }))}
                    max={data.topBuyers[0]?.volume || 1}
                    color="bg-purple-500"
                    formatValue={(v) => formatCurrency(v)}
                  />
                ) : <Empty />}
              </AnalysisCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AnalysisCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BarList({ items, max, color, formatValue }: {
  items: { label: string; value: number; sub?: string }[];
  max: number;
  color: string;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="space-y-3">
      {items.map(({ label, value, sub }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700 truncate max-w-[65%]" title={label}>{label}</span>
            <span className="text-gray-500 text-xs">{sub ?? (formatValue ? formatValue(value) : value)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.round((value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 pt-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  );
}

function Empty() {
  return (
    <p className="text-sm text-gray-400 text-center py-8">Nenhum dado disponível. Recalcule os scores no módulo de Licitações.</p>
  );
}
