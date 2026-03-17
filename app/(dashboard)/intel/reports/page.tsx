'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import { 
  FileBarChart, 
  Download, 
  Filter,
  Calendar,
  TrendingUp,
  PieChart as PieIcon,
  Map as MapIcon,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateReportPDF } from '@/lib/pdf/report-generator';
import { useRouter } from 'next/navigation';

const reports = [
  { id: '1', name: 'Relatório de Performance Mensal', type: 'Vendas', lastGenerated: '2023-10-01' },
  { id: '2', name: 'Análise de Concorrência - TI', type: 'Inteligência', lastGenerated: '2023-09-15' },
  { id: '3', name: 'Mapa de Oportunidades por Estado', type: 'Mercado', lastGenerated: '2023-10-10' },
  { id: '4', name: 'Previsão de Faturamento Q4', type: 'Financeiro', lastGenerated: '2023-10-20' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [activeReportTab, setActiveReportTab] = useState('Performance');
  
  const handleGenerateReport = async (report: any) => {
    toast.promise(generateReportPDF(report), {
      loading: 'Gerando relatório profissional...',
      success: 'Relatório exportado com sucesso!',
      error: 'Erro ao gerar relatório.'
    });
  };

  return (
    <>
      <Header title="Relatórios Estratégicos" subtitle="Gere e visualize relatórios detalhados para tomada de decisão." />
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Performance', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { name: 'Distribuição', icon: PieIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
              { name: 'Geográfico', icon: MapIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { name: 'Financeiro', icon: FileBarChart, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((cat) => (
              <button 
                key={cat.name} 
                onClick={() => setActiveReportTab(cat.name)}
                className={cn(
                  "bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group",
                  activeReportTab === cat.name ? "border-[#0f49bd] ring-2 ring-blue-50" : "border-gray-200"
                )}
              >
                <div className={cn("p-4 rounded-full mb-4 group-hover:scale-110 transition-transform", cat.bg)}>
                  <cat.icon className={cn("size-8", cat.color)} />
                </div>
                <h3 className="font-bold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Gerar novo relatório</p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Relatórios de {activeReportTab}</h3>
              <button 
                onClick={() => router.push('/intel/reports')}
                className="text-sm font-bold text-[#0f49bd] hover:underline"
              >
                Ver Todos
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {reports.filter(r => activeReportTab === 'Performance' || r.type.includes(activeReportTab) || activeReportTab === 'Financeiro' && r.type === 'Financeiro').map((r) => (
                <div key={r.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileBarChart className="size-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.type} • Gerado em {r.lastGenerated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleGenerateReport(r)}
                      className="p-2 text-gray-400 hover:text-[#0f49bd] hover:bg-blue-50 rounded-lg transition-all"
                      title="Baixar PDF"
                    >
                      <Download className="size-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                      <ChevronRight className="size-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
