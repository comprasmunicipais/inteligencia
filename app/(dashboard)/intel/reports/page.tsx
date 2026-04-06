'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { Target, BarChart2, Activity, Trophy, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/components/providers/CompanyProvider';

type Period = 30 | 60 | 90;

// ─── helpers ────────────────────────────────────────────────────────────────

function periodStart(days: Period): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function Badge({ active }: { active: boolean }) {
  return active
    ? <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Com proposta</span>
    : <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sem proposta</span>;
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#0f49bd]/8 rounded-lg">
          <Icon className="size-5 text-[#0f49bd]" />
        </div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg?: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{msg ?? 'Nenhum dado no período.'}</p>;
}

function Spinner() {
  return <div className="flex justify-center py-8"><Loader2 className="size-6 text-[#0f49bd] animate-spin" /></div>;
}

// ─── types ───────────────────────────────────────────────────────────────────

interface HighMatchOpp { id: string; title: string; score: number; hasProposal: boolean; }
interface StageData { id: string; title: string; color: string; position: number; dealCount: number; totalValue: number; }
interface StaleDeal { id: string; title: string; estimated_value: number; created_at: string; }
interface ActivityData { contacts: number; proposals: number; contracts: number; tasks: number; recentProposals: { id: string; title: string; municipality: string; value: number; status: string; }[]; }
interface ResultsData { contractCount: number; contractTotal: number; proposalCount: number; recentContracts: { id: string; title: string; value: number; status: string; }[]; }

// ─── page ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { companyId } = useCompany();
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);

  const [highMatchOpps, setHighMatchOpps] = useState<HighMatchOpp[]>([]);
  const [highMatchTotal, setHighMatchTotal] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);

  const [stages, setStages] = useState<StageData[]>([]);
  const [staleDeals, setStaleDeals] = useState<StaleDeal[]>([]);

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const supabase = createClient();
    const since = periodStart(period);

    // ── Relatório 1: Alta Aderência ──────────────────────────────────────────
    const { data: scoreRows } = await supabase
      .from('company_opportunity_scores')
      .select('opportunity_id, match_score')
      .eq('company_id', companyId)
      .gte('match_score', 80);

    const oppIds = (scoreRows || []).map(s => s.opportunity_id);
    setHighMatchTotal(oppIds.length);

    let top5: HighMatchOpp[] = [];
    if (oppIds.length > 0) {
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, title, created_at')
        .in('id', oppIds)
        .gte('created_at', since)
        .neq('internal_status', 'expired');

      const filteredIds = (opps || []).map(o => o.id);
      const scoreMap = new Map((scoreRows || []).map(s => [s.opportunity_id, s.match_score]));

      let proposalIds = new Set<string>();
      if (filteredIds.length > 0) {
        const { data: props } = await supabase
          .from('proposals')
          .select('opportunity_id')
          .eq('company_id', companyId)
          .in('opportunity_id', filteredIds);
        proposalIds = new Set((props || []).map(p => p.opportunity_id).filter(Boolean));
        setProposalCount(proposalIds.size);
      } else {
        setProposalCount(0);
      }

      top5 = (opps || [])
        .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
        .slice(0, 5)
        .map(o => ({ id: o.id, title: o.title, score: scoreMap.get(o.id) || 0, hasProposal: proposalIds.has(o.id) }));
    } else {
      setProposalCount(0);
    }
    setHighMatchOpps(top5);

    // ── Relatório 2: Funil de Vendas ─────────────────────────────────────────
    const [{ data: stagesRaw }, { data: dealsRaw }] = await Promise.all([
      supabase.from('pipeline_stages').select('id, title, color, position').eq('company_id', companyId).order('position'),
      supabase.from('deals').select('id, title, status, estimated_value, created_at').eq('company_id', companyId),
    ]);

    const stageList: StageData[] = (stagesRaw || []).map(s => {
      const dealsInStage = (dealsRaw || []).filter(d => d.status === s.title);
      return {
        id: s.id, title: s.title, color: s.color, position: s.position,
        dealCount: dealsInStage.length,
        totalValue: dealsInStage.reduce((acc, d) => acc + Number(d.estimated_value || 0), 0),
      };
    });
    setStages(stageList);

    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const stale = (dealsRaw || [])
      .filter(d => d.created_at <= cutoff30)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, 5)
      .map(d => ({ id: d.id, title: d.title, estimated_value: Number(d.estimated_value || 0), created_at: d.created_at }));
    setStaleDeals(stale);

    // ── Relatório 3: Atividade Comercial ─────────────────────────────────────
    const [{ count: cContacts }, { count: cProposals }, { count: cContracts }, { count: cTasks }, { data: recentProps }] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
      supabase.from('proposals').select('id, title, municipality_id, value, status, municipalities(name)').eq('company_id', companyId).gte('created_at', since).order('created_at', { ascending: false }).limit(5),
    ]);

    setActivity({
      contacts: cContacts || 0,
      proposals: cProposals || 0,
      contracts: cContracts || 0,
      tasks: cTasks || 0,
      recentProposals: (recentProps || []).map((p: any) => ({
        id: p.id, title: p.title,
        municipality: p.municipalities?.name || '—',
        value: Number(p.value || 0),
        status: p.status || '—',
      })),
    });

    // ── Relatório 4: Resultados Comerciais ───────────────────────────────────
    const [{ data: contractsData }, { data: proposalsData }] = await Promise.all([
      supabase.from('contracts').select('id, title, value, status').eq('company_id', companyId).gte('start_date', since.slice(0, 10)),
      supabase.from('proposals').select('id', { count: 'exact' }).eq('company_id', companyId).gte('created_at', since),
    ]);

    const contractTotal = (contractsData || []).reduce((acc, c) => acc + Number(c.value || 0), 0);
    setResults({
      contractCount: (contractsData || []).length,
      contractTotal,
      proposalCount: (proposalsData || []).length,
      recentContracts: (contractsData || []).slice(0, 5).map(c => ({ id: c.id, title: c.title, value: Number(c.value || 0), status: c.status || '—' })),
    });

    setLoading(false);
  }, [companyId, period]);

  useEffect(() => { if (companyId) load(); }, [companyId, period, load]);

  const maxStageValue = Math.max(...stages.map(s => s.totalValue), 1);

  return (
    <>
      <Header title="Relatórios Estratégicos" subtitle="Dados reais por empresa — aderência, funil, atividade e resultados comerciais." />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Filtro de período */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-500">Período:</span>
            {([30, 60, 90] as Period[]).map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${period === d ? 'bg-[#0f49bd] text-white border-[#0f49bd]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0f49bd]/40'}`}
              >
                {d} dias
              </button>
            ))}
          </div>

          {/* Relatório 1 */}
          <SectionCard title="Oportunidades de Alta Aderência" icon={Target}>
            {loading ? <Spinner /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <KpiCard label="Score ≥ 80 no período" value={highMatchTotal} />
                  <KpiCard label="Viraram proposta" value={proposalCount} />
                  <KpiCard label="Taxa de aproveitamento" value={pct(proposalCount, highMatchOpps.length || highMatchTotal)} />
                </div>
                {highMatchOpps.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top 5 por score</p>
                    {highMatchOpps.map(o => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <p className="text-sm text-gray-700 font-medium truncate max-w-[60%]" title={o.title}>{o.title}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#0f49bd]">{o.score}pts</span>
                          <Badge active={o.hasProposal} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <Empty msg="Nenhuma oportunidade com score ≥ 80 no período. Recalcule os scores no módulo de Licitações." />}
              </>
            )}
          </SectionCard>

          {/* Relatório 2 */}
          <SectionCard title="Funil de Vendas" icon={BarChart2}>
            {loading ? <Spinner /> : (
              <>
                {stages.length ? (
                  <div className="space-y-3 mb-6">
                    {stages.map(s => (
                      <div key={s.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{s.title}</span>
                          <span className="text-gray-500">{s.dealCount} deal{s.dealCount !== 1 ? 's' : ''} · {formatCurrency(s.totalValue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{ width: `${Math.round((s.totalValue / maxStageValue) * 100)}%`, backgroundColor: s.color || '#0f49bd' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <Empty msg="Nenhum estágio de funil configurado." />}

                {staleDeals.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Deals parados ({'>'}30 dias sem movimentação)</p>
                    <div className="space-y-2">
                      {staleDeals.map(d => (
                        <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <p className="text-sm text-gray-700 font-medium truncate max-w-[65%]" title={d.title}>{d.title}</p>
                          <span className="text-sm text-gray-500">{formatCurrency(d.estimated_value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </SectionCard>

          {/* Relatório 3 */}
          <SectionCard title="Atividade Comercial" icon={Activity}>
            {loading ? <Spinner /> : activity ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <KpiCard label="Contatos criados" value={activity.contacts} />
                  <KpiCard label="Propostas enviadas" value={activity.proposals} />
                  <KpiCard label="Contratos iniciados" value={activity.contracts} />
                  <KpiCard label="Tarefas criadas" value={activity.tasks} />
                </div>
                {activity.recentProposals.length ? (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Últimas propostas no período</p>
                    <div className="space-y-2">
                      {activity.recentProposals.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-700 truncate max-w-xs" title={p.title}>{p.title}</p>
                            <p className="text-xs text-gray-400">{p.municipality}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">{formatCurrency(p.value)}</span>
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <Empty />}
              </>
            ) : <Empty />}
          </SectionCard>

          {/* Relatório 4 */}
          <SectionCard title="Resultados Comerciais" icon={Trophy}>
            {loading ? <Spinner /> : results ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <KpiCard label="Contratos fechados" value={results.contractCount} sub={formatCurrency(results.contractTotal)} />
                  <KpiCard label="Ticket médio" value={results.contractCount ? formatCurrency(results.contractTotal / results.contractCount) : '—'} />
                  <KpiCard label="Propostas enviadas" value={results.proposalCount} />
                  <KpiCard label="Taxa de vitória" value={pct(results.contractCount, results.proposalCount)} />
                </div>
                {results.recentContracts.length ? (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Últimos contratos no período</p>
                    <div className="space-y-2">
                      {results.recentContracts.map(c => (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <p className="text-sm font-medium text-gray-700 truncate max-w-[65%]" title={c.title}>{c.title}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">{formatCurrency(c.value)}</span>
                            <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{c.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <Empty msg="Nenhum contrato no período selecionado." />}
              </>
            ) : <Empty />}
          </SectionCard>

        </div>
      </div>
    </>
  );
}
