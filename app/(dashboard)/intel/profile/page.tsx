'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/shared/Header';
import { 
  Save, 
  Target, 
  Building2, 
  MapPin, 
  DollarSign, 
  Tag, 
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/intel/services';
import { CompanyIntelligenceProfile } from '@/lib/intel/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function IntelProfilePage() {
  const [profile, setProfile] = useState<CompanyIntelligenceProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = getCompanyProfile('current-company-id');
      setProfile(data);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    if (!profile) return;
    setIsSaving(true);
    
    setTimeout(() => {
      saveCompanyProfile(profile);
      setIsSaving(false);
      toast.success('Perfil estratégico atualizado com sucesso!');
    }, 800);
  };

  if (!profile) return null;

  const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'Nacional'];
  const modalities = ['Pregão Eletrônico', 'Dispensa de Licitação', 'Inexigibilidade', 'Concorrência', 'Tomada de Preços', 'Leilão', 'Diálogo Competitivo'];

  return (
    <>
      <Header 
        title="Perfil Estratégico" 
        subtitle="Configure as diretrizes de inteligência para que a IA identifique as melhores oportunidades para o seu negócio." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0f49bd]/10 rounded-lg">
                <Target className="size-6 text-[#0f49bd]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Configuração de Match</h2>
                <p className="text-sm text-gray-500 font-medium">Defina seus alvos comerciais e restrições.</p>
              </div>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all shadow-md disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar Perfil
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Core Identity */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Basic Info */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Building2 className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Identidade Comercial</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Empresa</label>
                    <input 
                      type="text" 
                      value={profile.company_name}
                      onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Segmento Principal</label>
                      <input 
                        type="text" 
                        value={profile.main_segment}
                        onChange={(e) => setProfile({...profile, main_segment: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900"
                        placeholder="Ex: Tecnologia da Informação"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subsegmentos</label>
                      <input 
                        type="text" 
                        value={profile.subsegments}
                        onChange={(e) => setProfile({...profile, subsegments: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900"
                        placeholder="Ex: SaaS, Consultoria"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categorias de Interesse (PNCP)</label>
                    <textarea 
                      value={profile.target_categories}
                      onChange={(e) => setProfile({...profile, target_categories: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]"
                      placeholder="Ex: Software, Serviços de TI, Licenciamento"
                    />
                  </div>
                </div>
              </section>

              {/* Keywords */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Tag className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Palavras-Chave de Inteligência</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                      Termos Positivos (Match +)
                    </label>
                    <textarea 
                      value={profile.positive_keywords}
                      onChange={(e) => setProfile({...profile, positive_keywords: e.target.value})}
                      className="w-full px-4 py-2.5 bg-green-50/30 border border-green-100 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none font-medium text-gray-900 min-h-[80px]"
                      placeholder="Termos que indicam alta aderência (separados por vírgula)"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                      Termos Negativos (Match -)
                    </label>
                    <textarea 
                      value={profile.negative_keywords}
                      onChange={(e) => setProfile({...profile, negative_keywords: e.target.value})}
                      className="w-full px-4 py-2.5 bg-red-50/30 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 min-h-[80px]"
                      placeholder="Termos que devem penalizar o score (separados por vírgula)"
                    />
                  </div>
                </div>
              </section>

              {/* Targets */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <ShieldCheck className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Alvos Específicos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Órgãos Prioritários</label>
                    <textarea 
                      value={profile.preferred_buyers}
                      onChange={(e) => setProfile({...profile, preferred_buyers: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]"
                      placeholder="Nomes de órgãos que você já tem bom relacionamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Órgãos a Evitar</label>
                    <textarea 
                      value={profile.excluded_buyers}
                      onChange={(e) => setProfile({...profile, excluded_buyers: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]"
                      placeholder="Órgãos com histórico ruim ou fora de escopo"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Constraints */}
            <div className="space-y-8">
              
              {/* Financial Constraints */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <DollarSign className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Capacidade Financeira</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Mínimo (R$)</label>
                    <input 
                      type="number" 
                      value={profile.min_ticket}
                      onChange={(e) => setProfile({...profile, min_ticket: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-bold text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Máximo (R$)</label>
                    <input 
                      type="number" 
                      value={profile.max_ticket}
                      onChange={(e) => setProfile({...profile, max_ticket: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-bold text-gray-900"
                    />
                  </div>
                </div>
              </section>

              {/* Geographic Constraints */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <MapPin className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Alcance Geográfico</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estados de Atuação</label>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {states.map(state => (
                        <button
                          key={state}
                          onClick={() => {
                            const current = profile.target_states || [];
                            const next = current.includes(state) 
                              ? current.filter(s => s !== state)
                              : [...current, state];
                            setProfile({...profile, target_states: next});
                          }}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            profile.target_states?.includes(state)
                              ? "bg-[#0f49bd] border-[#0f49bd] text-white"
                              : "bg-white border-gray-200 text-gray-400 hover:border-[#0f49bd] hover:text-[#0f49bd]"
                          )}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Municípios Prioritários</label>
                    <input 
                      type="text" 
                      value={profile.target_municipalities}
                      onChange={(e) => setProfile({...profile, target_municipalities: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900"
                      placeholder="Ex: Curitiba, São Paulo"
                    />
                  </div>
                </div>
              </section>

              {/* Modalities */}
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <ChevronRight className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Modalidades</h3>
                </div>

                <div className="space-y-2">
                  {modalities.map(mod => (
                    <label key={mod} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={profile.target_modalities?.includes(mod)}
                        onChange={(e) => {
                          const current = profile.target_modalities || [];
                          const next = e.target.checked 
                            ? [...current, mod]
                            : current.filter(m => m !== mod);
                          setProfile({...profile, target_modalities: next});
                        }}
                        className="size-4 rounded border-gray-300 text-[#0f49bd] focus:ring-[#0f49bd]"
                      />
                      <span className="text-xs font-medium text-gray-700">{mod}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* AI Help */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="size-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-bold">Dica da IA:</span> Quanto mais específico for o seu perfil, menor será o ruído na sua caixa de entrada. Use palavras-chave que aparecem com frequência nos editais que você costuma vencer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

