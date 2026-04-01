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
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Upload,
  FileText,
  Trash2,
  Download,
  Package,
  FolderOpen,
  Sparkles,
  Copy,
  CheckCircle2,
  Edit,
  Building,
} from 'lucide-react';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/intel/services';
import { CompanyIntelligenceProfile } from '@/lib/intel/types';
import { catalogService, CompanyCatalog } from '@/lib/services/catalogs';
import { companyDocumentService, CompanyDocument, DOCUMENT_CATEGORIES } from '@/lib/services/company-documents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useIsReadOnly } from '@/hooks/useIsReadOnly';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const fileTypeLabel = (type: string) => {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word')) return 'DOCX';
  if (type.includes('sheet')) return 'XLSX';
  if (type.includes('image')) return 'Imagem';
  return 'Arquivo';
};

export default function IntelProfilePage() {
  const { companyId } = useCompany();
  const isReadOnly = useIsReadOnly();
  const [profile, setProfile] = useState<CompanyIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [consolidatedText, setConsolidatedText] = useState('');
  const [isEditingConsolidated, setIsEditingConsolidated] = useState(false);
  const [isSavingConsolidated, setIsSavingConsolidated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dados estruturais
  const [structuralData, setStructuralData] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    telefone: '',
    endereco: '',
  });

  // Catalogs
  const [catalogs, setCatalogs] = useState<CompanyCatalog[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const [productLineName, setProductLineName] = useState('');

  // Company Documents
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0].id);
  const [documentDescription, setDocumentDescription] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(DOCUMENT_CATEGORIES[0].id);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompanyProfile(companyId);
        setProfile(data);

        const { data: profileData } = await supabase
          .from('company_profiles')
          .select('consolidated_text, cnpj, razao_social, nome_fantasia, telefone, endereco')
          .eq('company_id', companyId)
          .single();

        if (profileData?.consolidated_text) {
          setConsolidatedText(profileData.consolidated_text);
        }
        if (profileData) {
          setStructuralData({
            cnpj: profileData.cnpj || '',
            razao_social: profileData.razao_social || '',
            nome_fantasia: profileData.nome_fantasia || '',
            telefone: profileData.telefone || '',
            endereco: profileData.endereco || '',
          });
        }
      } catch {
        toast.error('Erro ao carregar perfil estratégico.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const data = await catalogService.getByCompany(companyId);
        setCatalogs(data);
      } catch {
        toast.error('Erro ao carregar catálogos.');
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const loadDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const data = await companyDocumentService.getByCompany(companyId);
        setDocuments(data);
      } catch {
        toast.error('Erro ao carregar documentos.');
      } finally {
        setLoadingDocuments(false);
      }
    };
    loadDocuments();
  }, [companyId]);

  const handleSave = async () => {
    if (!profile || !companyId) return;
    setIsSaving(true);
    try {
      await saveCompanyProfile({ ...profile, company_id: companyId });

      // Salvar dados estruturais
      await supabase
        .from('company_profiles')
        .update({ ...structuralData, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);

      toast.success('Perfil estratégico salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar perfil estratégico.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConsolidated = async () => {
    if (!companyId) return;
    setIsSavingConsolidated(true);
    try {
      await supabase
        .from('company_profiles')
        .update({ consolidated_text: consolidatedText, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      setIsEditingConsolidated(false);
      toast.success('Texto consolidado salvo!');
    } catch {
      toast.error('Erro ao salvar texto.');
    } finally {
      setIsSavingConsolidated(false);
    }
  };

  const handleGenerateConsolidated = async () => {
    if (!companyId) return;
    setIsGenerating(true);
    const toastId = toast.loading('Gerando perfil consolidado com IA...');
    try {
      const response = await fetch('/api/intel/consolidate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao gerar perfil.');
      setConsolidatedText(result.consolidated_text);
      setIsEditingConsolidated(false);
      toast.success('Perfil consolidado gerado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar perfil.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyConsolidated = async () => {
    try {
      await navigator.clipboard.writeText(consolidatedText);
      setCopied(true);
      toast.success('Texto copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar texto.');
    }
  };

  const handleUploadCatalog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Formato não permitido.'); return; }
    if (!productLineName.trim()) { toast.error('Informe o nome da linha de produto.'); return; }
    setUploadingCatalog(true);
    const toastId = toast.loading('Fazendo upload do catálogo...');
    try {
      const created = await catalogService.upload(file, companyId, productLineName.trim());
      setCatalogs([created, ...catalogs]);
      setProductLineName('');
      toast.success('Catálogo enviado!', { id: toastId });
    } catch { toast.error('Erro ao enviar catálogo.', { id: toastId }); }
    finally { setUploadingCatalog(false); e.target.value = ''; }
  };

  const handleDownloadCatalog = async (catalog: CompanyCatalog) => {
    try {
      const blob = await catalogService.download(catalog.file_path);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', catalog.file_name);
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('Erro ao baixar catálogo.'); }
  };

  const handleDeleteCatalog = async (catalog: CompanyCatalog) => {
    if (!confirm(`Excluir "${catalog.file_name}"?`)) return;
    try {
      await catalogService.delete(catalog.id, catalog.file_path);
      setCatalogs(catalogs.filter(c => c.id !== catalog.id));
      toast.success('Catálogo excluído.');
    } catch { toast.error('Erro ao excluir catálogo.'); }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Formato não permitido.'); return; }
    setUploadingDocument(true);
    const toastId = toast.loading('Fazendo upload do documento...');
    try {
      const created = await companyDocumentService.upload(file, companyId, selectedCategory, documentDescription.trim());
      setDocuments([created, ...documents]);
      setDocumentDescription('');
      setExpandedCategory(selectedCategory);
      toast.success('Documento enviado!', { id: toastId });
    } catch { toast.error('Erro ao enviar documento.', { id: toastId }); }
    finally { setUploadingDocument(false); e.target.value = ''; }
  };

  const handleDownloadDocument = async (doc: CompanyDocument) => {
    try {
      const blob = await companyDocumentService.download(doc.file_path);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', doc.file_name);
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('Erro ao baixar documento.'); }
  };

  const handleDeleteDocument = async (doc: CompanyDocument) => {
    if (!confirm(`Excluir "${doc.file_name}"?`)) return;
    try {
      await companyDocumentService.delete(doc.id, doc.file_path);
      setDocuments(documents.filter(d => d.id !== doc.id));
      toast.success('Documento excluído.');
    } catch { toast.error('Erro ao excluir documento.'); }
  };

  const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO', 'Nacional'];
  const modalities = ['Pregão Eletrônico', 'Dispensa de Licitação', 'Inexigibilidade', 'Concorrência', 'Tomada de Preços', 'Leilão', 'Diálogo Competitivo'];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-[#f8fafc]"><Loader2 className="size-8 text-[#0f49bd] animate-spin" /></div>;
  }
  if (!profile) return null;

  return (
    <>
      <Header title="Perfil Estratégico" subtitle="Configure as diretrizes de inteligência para que a IA identifique as melhores oportunidades para o seu negócio." />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0f49bd]/10 rounded-lg"><Target className="size-6 text-[#0f49bd]" /></div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Configuração de Match</h2>
                <p className="text-sm text-gray-500 font-medium">Defina seus alvos comerciais e restrições.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleGenerateConsolidated} disabled={isGenerating || isReadOnly} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-md disabled:opacity-50">
                {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {isGenerating ? 'Gerando...' : 'Gerar Perfil Consolidado'}
              </button>
              <button onClick={handleSave} disabled={isSaving || isReadOnly} className="flex items-center gap-2 px-6 py-2.5 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all shadow-md disabled:opacity-50">
                {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar Perfil
              </button>
            </div>
          </div>

          {/* Texto Consolidado */}
          {consolidatedText && (
            <section className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl border border-purple-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">Perfil Comercial Consolidado</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase">Gerado por IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCopyConsolidated} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                    {copied ? <CheckCircle2 className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  {!isEditingConsolidated ? (
                    <button onClick={() => setIsEditingConsolidated(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                      <Edit className="size-3.5" /> Editar
                    </button>
                  ) : (
                    <button onClick={handleSaveConsolidated} disabled={isSavingConsolidated || isReadOnly} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                      {isSavingConsolidated ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Salvar
                    </button>
                  )}
                  <button onClick={handleGenerateConsolidated} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50">
                    <RefreshCw className={cn('size-3.5', isGenerating && 'animate-spin')} />
                    Regenerar
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-purple-100">
                {isEditingConsolidated ? (
                  <textarea
                    className="w-full text-sm text-gray-700 leading-relaxed outline-none resize-none min-h-[200px] bg-transparent"
                    value={consolidatedText}
                    onChange={(e) => setConsolidatedText(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{consolidatedText}</p>
                )}
              </div>
              <p className="text-[10px] text-purple-500 font-medium">
                Este texto é usado pela IA para gerar propostas comerciais personalizadas para cada licitação.
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Coluna esquerda */}
            <div className="md:col-span-2 space-y-8">

              {/* Dados Estruturais */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Building className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Dados Estruturais da Empresa</h3>
                </div>
                <p className="text-xs text-gray-500 -mt-4">Informações jurídicas e de contato usadas na geração de propostas.</p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CNPJ</label>
                      <input type="text" value={structuralData.cnpj} onChange={(e) => setStructuralData({ ...structuralData, cnpj: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</label>
                      <input type="text" value={structuralData.telefone} onChange={(e) => setStructuralData({ ...structuralData, telefone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Razão Social</label>
                    <input type="text" value={structuralData.razao_social} onChange={(e) => setStructuralData({ ...structuralData, razao_social: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Razão Social conforme CNPJ" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome Fantasia</label>
                    <input type="text" value={structuralData.nome_fantasia} onChange={(e) => setStructuralData({ ...structuralData, nome_fantasia: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Nome Fantasia da empresa" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Endereço Completo</label>
                    <input type="text" value={structuralData.endereco} onChange={(e) => setStructuralData({ ...structuralData, endereco: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Rua, número, bairro, cidade - UF, CEP" />
                  </div>
                </div>
              </section>

              {/* Identidade Comercial */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Building2 className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Identidade Comercial</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Empresa</label>
                    <input type="text" value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Segmento Principal</label>
                      <input type="text" value={profile.main_segment} onChange={(e) => setProfile({ ...profile, main_segment: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Ex: Tecnologia da Informação" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subsegmentos</label>
                      <input type="text" value={profile.subsegments} onChange={(e) => setProfile({ ...profile, subsegments: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Ex: SaaS, Consultoria" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categorias de Interesse (PNCP)</label>
                    <textarea value={profile.target_categories} onChange={(e) => setProfile({ ...profile, target_categories: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]" placeholder="Ex: Software, Serviços de TI, Licenciamento" />
                  </div>
                </div>
              </section>

              {/* Palavras-Chave */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Tag className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Palavras-Chave de Inteligência</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-600 uppercase tracking-wider">Termos Positivos (Match +)</label>
                    <textarea value={profile.positive_keywords} onChange={(e) => setProfile({ ...profile, positive_keywords: e.target.value })} className="w-full px-4 py-2.5 bg-green-50/30 border border-green-100 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none font-medium text-gray-900 min-h-[80px]" placeholder="Termos que indicam alta aderência (separados por vírgula)" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-red-600 uppercase tracking-wider">Termos Negativos (Match -)</label>
                    <textarea value={profile.negative_keywords} onChange={(e) => setProfile({ ...profile, negative_keywords: e.target.value })} className="w-full px-4 py-2.5 bg-red-50/30 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-gray-900 min-h-[80px]" placeholder="Termos que devem penalizar o score (separados por vírgula)" />
                  </div>
                </div>
              </section>

              {/* Alvos Específicos */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <ShieldCheck className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Alvos Específicos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Órgãos Prioritários</label>
                    <textarea value={profile.preferred_buyers} onChange={(e) => setProfile({ ...profile, preferred_buyers: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]" placeholder="Nomes de órgãos que você já tem bom relacionamento" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Órgãos a Evitar</label>
                    <textarea value={profile.excluded_buyers} onChange={(e) => setProfile({ ...profile, excluded_buyers: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 min-h-[80px]" placeholder="Órgãos com histórico ruim ou fora de escopo" />
                  </div>
                </div>
              </section>

              {/* Catálogos de Produtos */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <Package className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Catálogos de Produtos</h3>
                </div>
                <p className="text-xs text-gray-500 -mt-4">Faça upload dos catálogos por linha de produto.</p>
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Novo Catálogo</p>
                  <div className="flex gap-3">
                    <input type="text" className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Nome da linha de produto" value={productLineName} onChange={(e) => setProductLineName(e.target.value)} />
                    <div className="relative">
                      <input type="file" id="catalog-upload" className="hidden" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={handleUploadCatalog} disabled={uploadingCatalog || isReadOnly} />
                      <label htmlFor="catalog-upload" className={cn('h-10 px-4 rounded-md flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors', uploadingCatalog ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#0f49bd] text-white hover:bg-[#0a3690]')}>
                        {uploadingCatalog ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        {uploadingCatalog ? 'Enviando...' : 'Upload'}
                      </label>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">Formatos aceitos: PDF, DOCX, XLSX, JPG, PNG — máx. 50MB</p>
                </div>
                {loadingCatalogs ? (
                  <div className="flex justify-center py-4"><Loader2 className="size-5 text-[#0f49bd] animate-spin" /></div>
                ) : catalogs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhum catálogo enviado ainda.</div>
                ) : (
                  <div className="space-y-3">
                    {catalogs.map((catalog) => (
                      <div key={catalog.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-white rounded-lg border border-gray-200 flex-shrink-0"><FileText className="size-4 text-gray-400" /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{catalog.file_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {catalog.product_line && <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{catalog.product_line}</span>}
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{fileTypeLabel(catalog.file_type)}</span>
                              <span className="text-[10px] text-gray-400">{formatFileSize(catalog.file_size)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button onClick={() => handleDownloadCatalog(catalog)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"><Download className="size-4" /></button>
                          <button onClick={() => handleDeleteCatalog(catalog)} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-600 transition-all shadow-sm"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Documentos de Habilitação */}
              <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <FolderOpen className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Documentos de Habilitação</h3>
                </div>
                <p className="text-xs text-gray-500 -mt-4">Centralize os documentos exigidos em licitações organizados por categoria.</p>
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Novo Documento</p>
                  <div className="grid grid-cols-1 gap-3">
                    <select className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {DOCUMENT_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                    <div className="flex gap-3">
                      <input type="text" className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]" placeholder="Descrição opcional (ex: CND Federal — validade 12/2025)" value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} />
                      <div className="relative">
                        <input type="file" id="doc-upload" className="hidden" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={handleUploadDocument} disabled={uploadingDocument || isReadOnly} />
                        <label htmlFor="doc-upload" className={cn('h-10 px-4 rounded-md flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors', uploadingDocument ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#0f49bd] text-white hover:bg-[#0a3690]')}>
                          {uploadingDocument ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                          {uploadingDocument ? 'Enviando...' : 'Upload'}
                        </label>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">Formatos aceitos: PDF, DOCX, XLSX, JPG, PNG — máx. 50MB</p>
                </div>
                {loadingDocuments ? (
                  <div className="flex justify-center py-4"><Loader2 className="size-5 text-[#0f49bd] animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {DOCUMENT_CATEGORIES.map((cat) => {
                      const catDocs = documents.filter(d => d.category === cat.id);
                      const isExpanded = expandedCategory === cat.id;
                      return (
                        <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button onClick={() => setExpandedCategory(isExpanded ? null : cat.id)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <FolderOpen className="size-4 text-[#0f49bd]" />
                              <div className="text-left">
                                <p className="text-sm font-bold text-gray-900">{cat.label}</p>
                                <p className="text-[10px] text-gray-400">{cat.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', catDocs.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400')}>
                                {catDocs.length} {catDocs.length === 1 ? 'arquivo' : 'arquivos'}
                              </span>
                              <ChevronRight className={cn('size-4 text-gray-400 transition-transform', isExpanded && 'rotate-90')} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="p-3 space-y-2 bg-white">
                              {catDocs.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">Nenhum documento nesta categoria.</p>
                              ) : catDocs.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="size-4 text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-gray-900 truncate">{doc.file_name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {doc.description && <span className="text-[10px] text-gray-500">{doc.description}</span>}
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{fileTypeLabel(doc.file_type)}</span>
                                        <span className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <button onClick={() => handleDownloadDocument(doc)} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all"><Download className="size-3.5" /></button>
                                    <button onClick={() => handleDeleteDocument(doc)} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-600 transition-all"><Trash2 className="size-3.5" /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Coluna direita */}
            <div className="space-y-8">
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <DollarSign className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Capacidade Financeira</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Mínimo (R$)</label>
                    <input type="number" value={profile.min_ticket} onChange={(e) => setProfile({ ...profile, min_ticket: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-bold text-gray-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Máximo (R$)</label>
                    <input type="number" value={profile.max_ticket} onChange={(e) => setProfile({ ...profile, max_ticket: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-bold text-gray-900" />
                  </div>
                </div>
              </section>

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
                        <button key={state} onClick={() => { const current = profile.target_states || []; const next = current.includes(state) ? current.filter(s => s !== state) : [...current, state]; setProfile({ ...profile, target_states: next }); }} className={cn('px-2 py-1 rounded text-[10px] font-bold border transition-all', profile.target_states?.includes(state) ? 'bg-[#0f49bd] border-[#0f49bd] text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-[#0f49bd] hover:text-[#0f49bd]')}>
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Municípios Prioritários</label>
                    <input type="text" value={profile.target_municipalities} onChange={(e) => setProfile({ ...profile, target_municipalities: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900" placeholder="Ex: Curitiba, São Paulo" />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-gray-900 mb-2">
                  <ChevronRight className="size-5 text-[#0f49bd]" />
                  <h3 className="font-bold">Modalidades</h3>
                </div>
                <div className="space-y-2">
                  {modalities.map(mod => (
                    <label key={mod} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={profile.target_modalities?.includes(mod)} onChange={(e) => { const current = profile.target_modalities || []; const next = e.target.checked ? [...current, mod] : current.filter(m => m !== mod); setProfile({ ...profile, target_modalities: next }); }} className="size-4 rounded border-gray-300 text-[#0f49bd] focus:ring-[#0f49bd]" />
                      <span className="text-xs font-medium text-gray-700">{mod}</span>
                    </label>
                  ))}
                </div>
              </section>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="size-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-bold">Dica:</span> Preencha os dados estruturais e salve antes de gerar o perfil consolidado para que o CNPJ e razão social apareçam no texto.
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
