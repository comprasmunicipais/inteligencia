'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Period = 30 | 60 | 90;

function periodStart(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

interface ReportData {
  companyName: string;
  period: number;
  highMatchTotal: number;
  proposalCount: number;
  top5: { title: string; score: number; hasProposal: boolean }[];
  stages: { title: string; dealCount: number; totalValue: number }[];
  staleDeals: { title: string; estimated_value: number }[];
  activity: { contacts: number; proposals: number; contracts: number; tasks: number; recentProposals: { title: string; municipality: string; value: number; status: string }[] };
  results: { contractCount: number; contractTotal: number; proposalCount: number; recentContracts: { title: string; value: number; status: string }[] };
}

export default function PrintPage() {
  const params = useSearchParams();
  const rawPeriod = Number(params.get('period') || '30') as Period;
  const period: Period = [30, 60, 90].includes(rawPeriod) ? rawPeriod : 30;

  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // Auth — nunca usa company_id da URL
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Não autenticado.'); return; }

      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) { setError('Empresa não identificada.'); return; }
      const companyId = profile.company_id;

      const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).single();
      const companyName = company?.name || 'Empresa';

      const since = periodStart(period);

      // ── Relatório 1 ─────────────────────────────────────────────────────────
      const { data: scoreRows } = await supabase
        .from('company_opportunity_scores')
        .select('opportunity_id, match_score')
        .eq('company_id', companyId)
        .gte('match_score', 80);

      const oppIds = (scoreRows || []).map(s => s.opportunity_id);
      const scoreMap = new Map((scoreRows || []).map(s => [s.opportunity_id, s.match_score]));

      let top5: ReportData['top5'] = [];
      let proposalCount = 0;

      if (oppIds.length > 0) {
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id, title, created_at')
          .in('id', oppIds)
          .gte('created_at', since)
          .neq('internal_status', 'expired');

        const filteredIds = (opps || []).map(o => o.id);
        let proposalIds = new Set<string>();
        if (filteredIds.length > 0) {
          const { data: props } = await supabase
            .from('proposals')
            .select('opportunity_id')
            .eq('company_id', companyId)
            .in('opportunity_id', filteredIds);
          proposalIds = new Set((props || []).map(p => p.opportunity_id).filter(Boolean));
          proposalCount = proposalIds.size;
        }
        top5 = (opps || [])
          .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
          .slice(0, 5)
          .map(o => ({ title: o.title, score: scoreMap.get(o.id) || 0, hasProposal: proposalIds.has(o.id) }));
      }

      // ── Relatório 2 ─────────────────────────────────────────────────────────
      const [{ data: stagesRaw }, { data: dealsRaw }] = await Promise.all([
        supabase.from('pipeline_stages').select('id, title, color, position').eq('company_id', companyId).order('position'),
        supabase.from('deals').select('id, title, status, estimated_value, created_at').eq('company_id', companyId),
      ]);

      const stages = (stagesRaw || []).map(s => {
        const dealsInStage = (dealsRaw || []).filter(d => d.status === s.title);
        return { title: s.title, dealCount: dealsInStage.length, totalValue: dealsInStage.reduce((acc, d) => acc + Number(d.estimated_value || 0), 0) };
      });

      const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const staleDeals = (dealsRaw || [])
        .filter(d => d.created_at <= cutoff30)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, 5)
        .map(d => ({ title: d.title, estimated_value: Number(d.estimated_value || 0) }));

      // ── Relatório 3 ─────────────────────────────────────────────────────────
      const [{ count: cContacts }, { count: cProposals }, { count: cContracts }, { count: cTasks }, { data: recentProps }] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
        supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', since),
        supabase.from('proposals').select('id, title, municipality_id, value, status, municipalities(name)').eq('company_id', companyId).gte('created_at', since).order('created_at', { ascending: false }).limit(5),
      ]);

      // ── Relatório 4 ─────────────────────────────────────────────────────────
      const [{ data: contractsData }, { data: proposalsData }] = await Promise.all([
        supabase.from('contracts').select('id, title, value, status').eq('company_id', companyId).gte('start_date', since.slice(0, 10)),
        supabase.from('proposals').select('id').eq('company_id', companyId).gte('created_at', since),
      ]);

      const contractTotal = (contractsData || []).reduce((acc, c) => acc + Number(c.value || 0), 0);

      setData({
        companyName,
        period,
        highMatchTotal: oppIds.length,
        proposalCount,
        top5,
        stages,
        staleDeals,
        activity: {
          contacts: cContacts || 0,
          proposals: cProposals || 0,
          contracts: cContracts || 0,
          tasks: cTasks || 0,
          recentProposals: (recentProps || []).map((p: any) => ({
            title: p.title,
            municipality: p.municipalities?.name || '—',
            value: Number(p.value || 0),
            status: p.status || '—',
          })),
        },
        results: {
          contractCount: (contractsData || []).length,
          contractTotal,
          proposalCount: (proposalsData || []).length,
          recentContracts: (contractsData || []).slice(0, 5).map(c => ({ title: c.title, value: Number(c.value || 0), status: c.status || '—' })),
        },
      });
    };

    load();
  }, [period]);

  if (error) return <div style={{ padding: 40, fontFamily: 'Arial', color: 'red' }}>{error}</div>;
  if (!data) return <div style={{ padding: 40, fontFamily: 'Arial' }}>Carregando relatório...</div>;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 2cm; size: A4; }
          body { font-family: Arial, sans-serif; color: #1a1a1a; }
          .page-break { page-break-before: always; }
          thead { display: table-header-group; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
        th { background: #f3f6fb; color: #0f49bd; font-weight: bold; padding: 8px 10px; text-align: left; border-bottom: 2px solid #0f49bd; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:last-child td { border-bottom: none; }
        .section-title { color: #0f49bd; font-size: 15px; font-weight: bold; margin: 28px 0 4px; border-bottom: 2px solid #0f49bd; padding-bottom: 4px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0 20px; }
        .kpi-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
        .kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .kpi-value { font-size: 22px; font-weight: 900; color: #111827; }
        .kpi-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
        footer { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
      `}</style>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#0f49bd', letterSpacing: '-0.5px' }}>CM PRO</span>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Plataforma B2G</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{data.companyName}</div>
        </div>
      </div>
      <hr style={{ borderColor: '#0f49bd', borderWidth: 2, margin: '10px 0' }} />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Relatório Estratégico — Vendas a Governo</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          Período: {data.period} dias&nbsp;&nbsp;|&nbsp;&nbsp;Gerado em: {dateStr} {timeStr}
        </div>
      </div>

      {/* Seção 1 */}
      <div className="section-title">1. Oportunidades de Alta Aderência</div>
      <div className="kpi-grid">
        <div className="kpi-box"><div className="kpi-label">Score ≥ 80</div><div className="kpi-value">{data.highMatchTotal}</div></div>
        <div className="kpi-box"><div className="kpi-label">Viraram proposta</div><div className="kpi-value">{data.proposalCount}</div></div>
        <div className="kpi-box"><div className="kpi-label">Taxa de aproveitamento</div><div className="kpi-value">{pct(data.proposalCount, data.top5.length || data.highMatchTotal)}</div></div>
      </div>
      {data.top5.length > 0 && (
        <table>
          <thead><tr><th>Licitação</th><th>Score</th><th>Proposta</th></tr></thead>
          <tbody>
            {data.top5.map((o, i) => (
              <tr key={i}>
                <td>{o.title}</td>
                <td><strong>{o.score}pts</strong></td>
                <td>{o.hasProposal ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Seção 2 */}
      <div className="page-break" />
      <div className="section-title">2. Funil de Vendas</div>
      {data.stages.length > 0 ? (
        <table>
          <thead><tr><th>Etapa</th><th>Deals</th><th>Valor Total</th></tr></thead>
          <tbody>
            {data.stages.map((s, i) => (
              <tr key={i}>
                <td>{s.title}</td>
                <td>{s.dealCount}</td>
                <td>{fmt(s.totalValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{ color: '#9ca3af', fontSize: 13 }}>Nenhum estágio configurado.</p>}

      {data.staleDeals.length > 0 && (
        <>
          <div style={{ marginTop: 16, fontWeight: 700, fontSize: 13, color: '#374151' }}>Deals parados ({'>'}30 dias)</div>
          <table>
            <thead><tr><th>Título</th><th>Valor</th></tr></thead>
            <tbody>
              {data.staleDeals.map((d, i) => <tr key={i}><td>{d.title}</td><td>{fmt(d.estimated_value)}</td></tr>)}
            </tbody>
          </table>
        </>
      )}

      {/* Seção 3 */}
      <div className="page-break" />
      <div className="section-title">3. Atividade Comercial</div>
      <div className="kpi-grid">
        <div className="kpi-box"><div className="kpi-label">Contatos criados</div><div className="kpi-value">{data.activity.contacts}</div></div>
        <div className="kpi-box"><div className="kpi-label">Propostas enviadas</div><div className="kpi-value">{data.activity.proposals}</div></div>
        <div className="kpi-box"><div className="kpi-label">Contratos iniciados</div><div className="kpi-value">{data.activity.contracts}</div></div>
        <div className="kpi-box"><div className="kpi-label">Tarefas criadas</div><div className="kpi-value">{data.activity.tasks}</div></div>
      </div>
      {data.activity.recentProposals.length > 0 && (
        <table>
          <thead><tr><th>Proposta</th><th>Município</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {data.activity.recentProposals.map((p, i) => (
              <tr key={i}><td>{p.title}</td><td>{p.municipality}</td><td>{fmt(p.value)}</td><td>{p.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Seção 4 */}
      <div className="page-break" />
      <div className="section-title">4. Resultados Comerciais</div>
      <div className="kpi-grid">
        <div className="kpi-box">
          <div className="kpi-label">Contratos fechados</div>
          <div className="kpi-value">{data.results.contractCount}</div>
          <div className="kpi-sub">{fmt(data.results.contractTotal)}</div>
        </div>
        <div className="kpi-box">
          <div className="kpi-label">Ticket médio</div>
          <div className="kpi-value" style={{ fontSize: 16 }}>{data.results.contractCount ? fmt(data.results.contractTotal / data.results.contractCount) : '—'}</div>
        </div>
        <div className="kpi-box"><div className="kpi-label">Propostas enviadas</div><div className="kpi-value">{data.results.proposalCount}</div></div>
        <div className="kpi-box"><div className="kpi-label">Taxa de vitória</div><div className="kpi-value">{pct(data.results.contractCount, data.results.proposalCount)}</div></div>
      </div>
      {data.results.recentContracts.length > 0 && (
        <table>
          <thead><tr><th>Contrato</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {data.results.recentContracts.map((c, i) => (
              <tr key={i}><td>{c.title}</td><td>{fmt(c.value)}</td><td>{c.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Rodapé */}
      <footer>
        <span>CM Pro — Plataforma B2G | comprasmunicipais.com.br</span>
        <span>Gerado em {dateStr} às {timeStr}</span>
      </footer>
    </>
  );
}
