import { createClient } from '@/lib/supabase/client';

export interface DashboardMetrics {
  newOpportunities: number;
  sentProposals: number;
  activeTenders: number;
  activeContracts: number;
  salesPerformance: { name: string; value: number }[];
  recentOpportunities: any[];
  pendingTasks: any[];
}

export const dashboardService = {
  async getMetrics(companyId: string): Promise<DashboardMetrics> {
    const supabase = createClient();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      { count: dealsCount },
      { count: proposalsCount },
      { count: contractsCount },
      { data: recentDeals },
      { data: pendingTasks },
      { data: dealsForChart }
    ] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
      supabase.from('deals')
        .select('*, municipalities(name), pipeline_stages(title)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('tasks')
        .select('*, municipalities(name)')
        .eq('company_id', companyId)
        .eq('status', 'pendente')
        .order('due_date', { ascending: true })
        .limit(3),
      supabase.from('deals')
        .select('estimated_value, created_at')
        .eq('company_id', companyId)
        .gte('created_at', sixMonthsAgo.toISOString())
    ]);

    const mappedRecent = (recentDeals || []).map(d => {
      const stageTitle: string = (d.pipeline_stages as any)?.title || d.status || 'Em andamento';
      const stageLower = stageTitle.toLowerCase();
      return {
        organ: (d.municipalities as any)?.name || 'Município',
        object: d.title,
        value: d.estimated_value,
        status: stageTitle,
        statusColor: stageLower.includes('ganho') || stageLower.includes('won')
          ? 'bg-green-100 text-green-800'
          : stageLower.includes('perdido') || stageLower.includes('lost')
          ? 'bg-red-100 text-red-800'
          : stageLower.includes('proposta') || stageLower.includes('proposal')
          ? 'bg-purple-100 text-purple-800'
          : 'bg-blue-100 text-blue-800',
      };
    });

    const mappedTasks = (pendingTasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || `Tarefa para ${(t.municipalities as any)?.name || 'Município'}`,
      dueDate: t.due_date,
      priority: t.priority
    }));

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const salesByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      salesByMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    (dealsForChart || []).forEach(deal => {
      const d = new Date(deal.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in salesByMonth) {
        salesByMonth[key] += Number(deal.estimated_value || 0);
      }
    });
    const salesPerformance = Object.entries(salesByMonth).map(([key, value]) => {
      const month = parseInt(key.split('-')[1], 10);
      return { name: monthNames[month], value };
    });

    return {
      newOpportunities: dealsCount || 0,
      sentProposals: proposalsCount || 0,
      activeTenders: 0,
      activeContracts: contractsCount || 0,
      salesPerformance,
      recentOpportunities: mappedRecent,
      pendingTasks: mappedTasks
    };
  }
};
