'use client';

import React, { useState } from 'react';
import Header from '@/components/shared/Header';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Map as MapIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Download,
  FileText,
  ExternalLink,
  ChevronRight,
  Search
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

const marketData = [
  { category: 'Educação', value: 45000000, competitors: 12 },
  { category: 'Saúde', value: 32000000, competitors: 8 },
  { category: 'Infraestrutura', value: 28000000, competitors: 15 },
  { category: 'TI', value: 18000000, competitors: 22 },
  { category: 'Segurança', value: 12000000, competitors: 5 },
];

const pieData = [
  { name: 'Pregão Eletrônico', value: 65 },
  { name: 'Dispensa', value: 20 },
  { name: 'Inexigibilidade', value: 10 },
  { name: 'Concorrência', value: 5 },
];

const radarData = [
  { subject: 'Preço', A: 120, B: 110, fullMark: 150 },
  { subject: 'Qualidade', A: 98, B: 130, fullMark: 150 },
  { subject: 'Prazo', A: 86, B: 130, fullMark: 150 },
  { subject: 'Capacidade', A: 99, B: 100, fullMark: 150 },
  { subject: 'Histórico', A: 85, B: 90, fullMark: 150 },
  { subject: 'Inovação', A: 65, B: 85, fullMark: 150 },
];

const COLORS = ['#0f49bd', '#4f46e5', '#8b5cf6', '#d946ef', '#ec4899'];

const reports = [
  { id: '1', title: 'Relatório Trimestral - Educação SP', date: '2023-10-15', size: '2.4 MB', type: 'PDF' },
  { id: '2', title: 'Análise de Concorrência - TI Nacional', date: '2023-10-10', size: '1.8 MB', type: 'CSV' },
  { id: '3', title: 'Oportunidades Emergentes - Saúde RJ', date: '2023-10-05', size: '3.1 MB', type: 'PDF' },
  { id: '4', title: 'Panorama PNCP - Infraestrutura Sul', date: '2023-09-28', size: '4.2 MB', type: 'PDF' },
];

export default function MarketAnalysisPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  const handleDownloadReport = (title: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Gerando relatório...',
        success: () => {
          // Mock download
          const blob = new Blob([`Conteúdo do relatório: ${title}`], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.txt`;
          a.click();
          return 'Download concluído!';
        },
        error: 'Erro ao gerar relatório.',
      }
    );
  };

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
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                  <ArrowUpRight className="size-3 mr-1" />
                  8.5%
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Volume Total de Mercado</h3>
              <p className="text-2xl font-black text-gray-900">R$ 135.4M</p>
              <p className="text-xs text-gray-400 mt-2">Baseado nos últimos 12 meses (PNCP)</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="size-6 text-purple-600" />
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center">
                  <ArrowDownRight className="size-3 mr-1" />
                  2.4%
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Média de Concorrentes</h3>
              <p className="text-2xl font-black text-gray-900">12.4</p>
              <p className="text-xs text-gray-400 mt-2">Empresas por edital no seu setor</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Building2 className="size-6 text-amber-600" />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                  <ArrowUpRight className="size-3 mr-1" />
                  12%
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Órgãos Compradores</h3>
              <p className="text-2xl font-black text-gray-900">452</p>
              <p className="text-xs text-gray-400 mt-2">Municípios ativos no seu segmento</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Oportunidades por Categoria</h3>
                <button 
                  onClick={() => handleDownloadReport('Oportunidades por Categoria')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="size-4 text-gray-400" />
                </button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="category" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      tick={{fontSize: 12, fontWeight: 600, fill: '#374151'}}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value || 0))}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#0f49bd" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Modalidades de Contratação</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Info className="size-3" />
                  <span>Últimos 12 meses</span>
                </div>
              </div>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Análise de Competitividade</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 600, fill: '#6b7280'}} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar
                      name="Sua Empresa"
                      dataKey="A"
                      stroke="#0f49bd"
                      fill="#0f49bd"
                      fillOpacity={0.5}
                    />
                    <Radar
                      name="Média Mercado"
                      dataKey="B"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Top 5 Órgãos Compradores (Seu Segmento)</h3>
                <button 
                  onClick={() => setIsMapModalOpen(true)}
                  className="text-sm font-bold text-[#0f49bd] hover:underline"
                >
                  Ver Mapa Completo
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Prefeitura de São Paulo', value: 12500000, growth: 15, uf: 'SP' },
                  { name: 'Governo do Estado de Minas Gerais', value: 9800000, growth: -5, uf: 'MG' },
                  { name: 'Prefeitura de Curitiba', value: 7200000, growth: 8, uf: 'PR' },
                  { name: 'Prefeitura de Campinas', value: 5400000, growth: 22, uf: 'SP' },
                  { name: 'Ministério da Educação', value: 4100000, growth: 0, uf: 'DF' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 text-xs shadow-sm">
                        {item.uf}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">Volume Estimado: {formatCurrency(item.value)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-xs font-bold flex items-center justify-end",
                        item.growth > 0 ? "text-green-600" : item.growth < 0 ? "text-red-600" : "text-gray-400"
                      )}>
                        {item.growth > 0 ? <ArrowUpRight className="size-3 mr-1" /> : item.growth < 0 ? <ArrowDownRight className="size-3 mr-1" /> : null}
                        {Math.abs(item.growth)}%
                      </span>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">Tendência</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Reports Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Relatórios de Inteligência Recentes</h3>
              <button 
                onClick={() => setIsReportsModalOpen(true)}
                className="text-sm font-bold text-[#0f49bd] hover:underline flex items-center gap-1"
              >
                Ver Todos <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reports.slice(0, 4).map((report) => (
                <div key={report.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm group-hover:border-blue-100">
                      <FileText className="size-5 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <button 
                      onClick={() => handleDownloadReport(report.title)}
                      className="p-1.5 text-gray-400 hover:text-[#0f49bd] hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{report.title}</h4>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{report.date ? formatDate(report.date) : 'N/A'}</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{report.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Mapa de Calor - Oportunidades por Região</DialogTitle>
            <DialogDescription>
              Visualização detalhada da concentração de licitações no seu segmento.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 size-32 bg-blue-500 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 size-48 bg-blue-600 rounded-full blur-3xl animate-pulse delay-700" />
            </div>
            <div className="text-center space-y-4 z-10">
              <MapIcon className="size-16 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500 font-medium">Visualização de Mapa Interativo em Alta Resolução</p>
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-blue-600" />
                  <span className="text-xs font-bold text-gray-600">Alta Densidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-blue-300" />
                  <span className="text-xs font-bold text-gray-600">Média Densidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-gray-300" />
                  <span className="text-xs font-bold text-gray-600">Baixa Densidade</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Sudeste</span>
              <span className="text-lg font-black text-gray-900">R$ 58.2M</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Sul</span>
              <span className="text-lg font-black text-gray-900">R$ 34.5M</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nordeste</span>
              <span className="text-lg font-black text-gray-900">R$ 21.8M</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reports Modal */}
      <Dialog open={isReportsModalOpen} onOpenChange={setIsReportsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Todos os Relatórios</DialogTitle>
            <DialogDescription>
              Acesse o histórico completo de análises de mercado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
              <input 
                placeholder="Buscar relatórios..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded border border-gray-200">
                      <FileText className="size-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{report.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{report.date ? formatDate(report.date) : 'N/A'} • {report.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownloadReport(report.title)}
                      className="p-2 text-gray-400 hover:text-[#0f49bd] hover:bg-white rounded-lg transition-all"
                      title="Baixar"
                    >
                      <Download className="size-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-400 hover:text-[#0f49bd] hover:bg-white rounded-lg transition-all"
                      title="Visualizar"
                    >
                      <ExternalLink className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

