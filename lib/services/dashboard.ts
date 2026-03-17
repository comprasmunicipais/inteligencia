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

    // In a real app, these would be real queries to Supabase
    // For now, we'll mix some real counts with mock data for the charts
    
    const [
      { count: dealsCount },
      { count: proposalsCount },
      { count: contractsCount },
      { data: recentDeals },
      { data: pendingTasks }
    ] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
      supabase.from('deals')
        .select('*, municipalities(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('tasks')
        .select('*, municipalities(name)')
        .eq('company_id', companyId)
        .eq('status', 'pendente')
        .order('due_date', { ascending: true })
        .limit(3)
    ]);

    const mappedRecent = (recentDeals || []).map(d => ({
      organ: (d.municipalities as any)?.name || 'Município',
      object: d.title,
      value: d.estimated_value,
      status: d.status.charAt(0).toUpperCase() + d.status.slice(1),
      statusColor: d.status === 'ganho' ? 'bg-green-100 text-green-800' : 
                   d.status === 'perdido' ? 'bg-red-100 text-red-800' : 
                   'bg-blue-100 text-blue-800'
    }));

    const mappedTasks = (pendingTasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || `Tarefa para ${(t.municipalities as any)?.name || 'Município'}`,
      dueDate: t.due_date,
      priority: t.priority
    }));

    return {
      newOpportunities: dealsCount || 0,
      sentProposals: proposalsCount || 0,
      activeTenders: 0, 
      activeContracts: contractsCount || 0,
      salesPerformance: [
        { name: 'Jan', value: 2500000 },
        { name: 'Fev', value: 2800000 },
        { name: 'Mar', value: 3200000 },
        { name: 'Abr', value: 3100000 },
        { name: 'Mai', value: 3800000 },
        { name: 'Jun', value: 4200000 },
      ],
      recentOpportunities: mappedRecent.length > 0 ? mappedRecent : [
        { organ: 'Pref. de São Paulo', object: 'Serviços de TI', value: 1200000, status: 'Em Análise', statusColor: 'bg-blue-100 text-blue-800' },
        { organ: 'Gov. do Estado do RJ', object: 'Equipamentos Médicos', value: 450000, status: 'Pendente', statusColor: 'bg-amber-100 text-amber-800' },
        { organ: 'Ministério da Saúde', object: 'Licença de Software', value: 2800000, status: 'Aprovado', statusColor: 'bg-green-100 text-green-800' },
      ],
      pendingTasks: mappedTasks
    };
  }
};
