'use client';
 
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  User,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  BadgeCheck,
  Phone,
  Download,
  Eye,
  Loader2,
  Mail,
  Copy,
  MessageCircle,
  Save,
  X,
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompany } from '@/components/providers/CompanyProvider';
import { accountService } from '@/lib/services/accounts';
import { contactService } from '@/lib/services/contacts';
import { timelineService } from '@/lib/services/timeline-events';
import { documentService, MunicipalityDocument } from '@/lib/services/documents';
import { dealService } from '@/lib/services/deals';
import { proposalService } from '@/lib/services/proposals';
import { contractService } from '@/lib/services/contracts';
import { opportunityService } from '@/lib/services/opportunities';
import {
  MunicipalityDTO,
  ContactDTO,
  TimelineEventDTO,
  DealDTO,
  ProposalDTO,
  ContractDTO,
  OpportunityDTO
} from '@/lib/types/dtos';
import { Region, DealStage, AccountStatus, ContactStatus } from '@/lib/types/enums';
import { createClient } from '@supabase/supabase-js';
 
type MunicipalityEmailDTO = {
  id: string;
  email: string;
  department_label: string | null;
  priority_score: number | null;
  is_strategic: boolean | null;
};
 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
 
export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, user } = useCompany();
 
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<MunicipalityDTO | null>(null);
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventDTO[]>([]);
  const [documents, setDocuments] = useState<MunicipalityDocument[]>([]);
  const [deals, setDeals] = useState<DealDTO[]>([]);
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [contracts, setContracts] = useState<ContractDTO[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityDTO[]>([]);
  const [municipalityEmails, setMunicipalityEmails] = useState<MunicipalityEmailDTO[]>([]);

  // States do modal de proposta
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalOpp, setProposalOpp] = useState<OpportunityDTO | null>(null);
  const [proposalContent, setProposalContent] = useState('');
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isSavingProposal, setIsSavingProposal] = useState(false);
 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    whatsapp: '',
    department: '',
    secretariat: '',
  });
 
  const [editData, setEditData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'emails' | 'opportunities' | 'deals' | 'proposals' | 'contracts' | 'documents'>('overview');
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
 
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        acc,
        conts,
        events,
        docs,
        dealsData,
        proposalsData,
        contractsData,
        opportunitiesData,
        emailsResult
      ] = await Promise.all([
        accountService.getById(params.id as string),
        contactService.getByMunicipality(params.id as string),
        timelineService.getByMunicipality(params.id as string),
        documentService.getByMunicipality(params.id as string),
        dealService.getByMunicipality(params.id as string),
        proposalService.getByMunicipality(params.id as string),
        contractService.getByMunicipality(params.id as string),
        opportunityService.getByMunicipality(params.id as string),
        supabase
          .from('municipality_emails')
          .select('id, email, department_label, priority_score, is_strategic')
          .eq('municipality_id', params.id as string)
          .order('priority_score', { ascending: false })
      ]);
 
      setAccount(acc);
      setContacts(conts);
      setTimelineEvents(events);
      setDocuments(docs);
      setDeals(dealsData);
      setProposals(proposalsData);
      setContracts(contractsData);
      setOpportunities(opportunitiesData);
 
      if (emailsResult.error) {
        console.error('Error loading municipality emails:', emailsResult.error);
        toast.error('Erro ao carregar e-mails da prefeitura.');
      } else {
        setMunicipalityEmails((emailsResult.data || []) as MunicipalityEmailDTO[]);
      }
    } catch (error) {
      console.error('Error loading account data:', error);
      toast.error('Erro ao carregar dados da prefeitura.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);
 
  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id, loadData]);

  const unifiedEmails = useMemo(() => {
    const normalizedMap = new Map<string, MunicipalityEmailDTO>();

    for (const emailRow of municipalityEmails) {
      const normalizedEmail = emailRow.email?.trim().toLowerCase();
      if (!normalizedEmail) continue;

      if (!normalizedMap.has(normalizedEmail)) {
        normalizedMap.set(normalizedEmail, {
          ...emailRow,
          email: emailRow.email.trim(),
        });
      }
    }

    const fallbackEmail = account?.email?.trim();
    if (fallbackEmail) {
      const normalizedFallbackEmail = fallbackEmail.toLowerCase();

      if (!normalizedMap.has(normalizedFallbackEmail)) {
        normalizedMap.set(normalizedFallbackEmail, {
          id: `account-email-${account?.id || 'fallback'}`,
          email: fallbackEmail,
          department_label: 'Cadastro principal',
          priority_score: 0,
          is_strategic: false,
        });
      }
    }

    return Array.from(normalizedMap.values()).sort((a, b) => {
      const scoreA = a.priority_score ?? 0;
      const scoreB = b.priority_score ?? 0;
      return scoreB - scoreA;
    });
  }, [municipalityEmails, account]);

  const strategicEmails = useMemo(() => {
    return unifiedEmails.filter(email => email.is_strategic);
  }, [unifiedEmails]);

  // Gerar proposta via IA
  const handleGenerateProposal = async (opp: OpportunityDTO) => {
    if (!companyId) return;
    setProposalOpp(opp);
    setProposalContent('');
    setProposalId(null);
    setIsProposalModalOpen(true);
    setIsGeneratingProposal(true);

    const toastId = toast.loading('Gerando proposta com IA...');
    try {
      const response = await fetch('/api/intel/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, opportunity_id: opp.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProposalContent(result.content);
      setProposalId(result.proposal_id);
      toast.success('Proposta gerada com sucesso!', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar proposta.', { id: toastId });
      setIsProposalModalOpen(false);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  // Salvar proposta editada
  const handleSaveProposal = async () => {
    if (!proposalId || !companyId) return;
    setIsSavingProposal(true);
    try {
      await supabase
        .from('ai_proposals')
        .update({ content: proposalContent, updated_at: new Date().toISOString() })
        .eq('id', proposalId);
      toast.success('Proposta salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar proposta.');
    } finally {
      setIsSavingProposal(false);
    }
  };

  // Download PDF da proposta
  const handleDownloadPDF = async () => {
    if (!proposalContent || !proposalOpp) return;
    try {
      const response = await fetch('/api/intel/generate-proposal-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: proposalContent,
          title: `Proposta — ${proposalOpp.organ_name}`,
        }),
      });
      const html = await response.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
      }
    } catch {
      toast.error('Erro ao gerar PDF.');
    }
  };
 
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.name) {
      toast.error('Por favor, preencha o nome da prefeitura.');
      return;
    }
 
    try {
      const updated = await accountService.update(account!.id, editData);
      setAccount(updated);
      setIsEditModalOpen(false);
      toast.success('Prefeitura atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar prefeitura.');
    }
  };
 
  const handleDelete = async () => {
    try {
      await accountService.delete(account!.id);
      toast.success('Prefeitura excluída com sucesso!');
      setIsDeleteModalOpen(false);
      router.push('/crm/accounts');
    } catch (error) {
      toast.error('Erro ao excluir prefeitura.');
    }
  };
 
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
 
    if (!editingEvent.title || !editingEvent.date) {
      toast.error('Preencha o título e a data do evento.');
      return;
    }
 
    try {
      if (editingEvent.id) {
        const updated = await timelineService.update(editingEvent.id, editingEvent);
        setTimelineEvents(timelineEvents.map(ev => ev.id === updated.id ? updated : ev));
        toast.success('Evento atualizado!');
      } else {
        const created = await timelineService.create({
          ...editingEvent,
          municipality_id: account!.id,
          company_id: companyId!
        });
        setTimelineEvents([created, ...timelineEvents]);
        toast.success('Evento adicionado!');
      }
      setIsEventModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar evento.');
    }
  };
 
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !account) return;
 
    if (!newContact.name || !newContact.email) {
      toast.error('Por favor, preencha o nome e o e-mail.');
      return;
    }
 
    setSavingContact(true);
    try {
      const created = await contactService.create({
        ...newContact,
        municipality_id: account.id,
        company_id: companyId,
        status: ContactStatus.ACTIVE,
        role: newContact.role || '-',
        phone: newContact.phone || undefined,
        whatsapp: newContact.whatsapp || undefined,
        department: newContact.department || undefined,
        secretariat: newContact.secretariat || undefined,
      });
      setContacts([created, ...contacts]);
      setIsAddContactModalOpen(false);
      setNewContact({ name: '', role: '', email: '', phone: '', whatsapp: '', department: '', secretariat: '' });
      toast.success('Contato adicionado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao adicionar contato: ${message}`);
    } finally {
      setSavingContact(false);
    }
  };
 
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
 
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, DOCX, XLSX ou imagens.');
      return;
    }
 
    setUploading(true);
    const toastId = toast.loading('Fazendo upload do documento...');
 
    try {
      const doc = await documentService.upload(file, account!.id, companyId!, user!.id);
      setDocuments([doc, ...documents]);
      toast.success('Documento enviado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao enviar documento.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };
 
  const handleDownloadDoc = async (doc: MunicipalityDocument) => {
    try {
      const data = await documentService.download(doc.file_path);
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erro ao baixar documento.');
    }
  };
 
  const handleDeleteDoc = async (doc: MunicipalityDocument) => {
    try {
      await documentService.delete(doc.id, doc.file_path);
      setDocuments(documents.filter(d => d.id !== doc.id));
      toast.success('Documento excluído.');
    } catch (error) {
      toast.error('Erro ao excluir documento.');
    }
  };
 
  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('E-mail copiado!');
    } catch (error) {
      toast.error('Erro ao copiar e-mail.');
    }
  };
 
  const regionLabels: Record<string, string> = {
    [Region.NORTH]: 'Norte',
    [Region.NORTHEAST]: 'Nordeste',
    [Region.MIDWEST]: 'Centro-Oeste',
    [Region.SOUTHEAST]: 'Sudeste',
    [Region.SOUTH]: 'Sul',
  };
 
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
      </div>
    );
  }
 
  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-8 text-center">
        <Building2 className="size-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Prefeitura não encontrada</h2>
        <p className="text-gray-500 mt-2">O registro que você está tentando acessar não existe ou foi removido.</p>
        <button
          onClick={() => router.push('/crm/accounts')}
          className="mt-6 px-6 py-2 bg-[#0f49bd] text-white rounded-xl font-bold"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }
 
  const handleVisitWebsite = () => {
    if (account.website) {
      window.open(account.website.startsWith('http') ? account.website : `https://${account.website}`, '_blank');
    } else {
      toast.error('Website não cadastrado.');
    }
  };
 
  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{account.name} - {account.state}</h1>
            <p className="text-xs text-gray-500">Prefeitura Municipal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditData({ ...account });
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="size-4" /> Editar
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="size-4" /> Excluir
          </button>
        </div>
      </div>
 
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="size-20 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0f49bd] border border-blue-100 shadow-sm mb-4">
                <Building2 className="size-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{account.state}</span>
                <span className="text-gray-300">•</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                  account.status === AccountStatus.ACTIVE ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                )}>
                  {account.status === AccountStatus.ACTIVE ? 'Cliente' : 'Prospecção'}
                </span>
              </div>
 
              <div className="mt-8 space-y-4">
                <button
                  onClick={handleVisitWebsite}
                  className="w-full bg-[#0f49bd] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Globe className="size-4" /> Visitar Website Oficial
                </button>
              </div>
            </div>
 
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Informações Gerais</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="size-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Prefeito(a)</span>
                    <span className="text-sm font-bold text-gray-700">{account.mayor_name || 'Não informado'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Localização</span>
                    <span className="text-sm text-gray-600">{account.city}, {account.state}</span>
                    <span className="text-xs text-gray-400 block mt-1">{account.address}</span>
                    <span className="text-xs text-gray-400 block">{account.zip_code}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="size-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Dados Demográficos</span>
                    <span className="text-sm font-bold text-gray-700">{account.population?.toLocaleString('pt-BR')} hab.</span>
                    <span className="text-xs text-gray-500 block">Faixa: {account.population_range}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Contato</span>
                    <span className="text-sm text-gray-700">({account.ddd}) {account.phone}</span>
                    <span className="text-xs text-gray-500 block">{account.email}</span>
                  </div>
                </div>
              </div>
            </div>
 
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Inteligência de Contatos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Total de e-mails</span>
                  <span className="text-2xl font-bold text-[#0f49bd]">{unifiedEmails.length}</span>
                </div>
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block mb-1">Estratégicos</span>
                  <span className="text-2xl font-bold text-green-700">{strategicEmails.length}</span>
                </div>
              </div>
            </div>
 
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Inteligência de Licitações</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Total de licitações</span>
                  <span className="text-2xl font-bold text-purple-700">{opportunities.length}</span>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1">Com link oficial</span>
                  <span className="text-2xl font-bold text-orange-700">
                    {opportunities.filter(op => !!op.official_url).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
 
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'overview' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'contacts' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Contatos ({contacts.length})
                </button>
                <button
                  onClick={() => setActiveTab('emails')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'emails' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  E-mails ({unifiedEmails.length})
                </button>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'opportunities' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Licitações ({opportunities.length})
                </button>
                <button
                  onClick={() => setActiveTab('deals')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'deals' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Negócios ({deals.length})
                </button>
                <button
                  onClick={() => setActiveTab('proposals')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'proposals' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Propostas ({proposals.length})
                </button>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'contracts' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Contratos ({contracts.length})
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={cn(
                    "px-8 py-4 text-sm font-bold transition-all whitespace-nowrap",
                    activeTab === 'documents' ? "text-[#0f49bd] border-b-2 border-[#0f49bd]" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Documentos
                </button>
              </div>
 
              <div className="p-8">
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-2">Região</span>
                        <span className="text-2xl font-bold text-[#0f49bd]">
                          {account.region ? (regionLabels[account.region] || account.region) : 'N/A'}
                        </span>
                      </div>
                      <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100">
                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-2">Área Territorial</span>
                        <span className="text-2xl font-bold text-purple-700">{account.area_km2?.toLocaleString('pt-BR')} km²</span>
                      </div>
                      <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider block mb-2">Ano de Instalação</span>
                        <span className="text-2xl font-bold text-green-700">{account.installation_year || 'N/A'}</span>
                      </div>
                    </div>
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Contatos Estratégicos</span>
                        <span className="text-3xl font-bold text-gray-900">{strategicEmails.length}</span>
                        <p className="text-sm text-gray-500 mt-2">
                          E-mails com maior probabilidade de gerar conexão comercial.
                        </p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Licitações Vinculadas</span>
                        <span className="text-3xl font-bold text-gray-900">{opportunities.length}</span>
                        <p className="text-sm text-gray-500 mt-2">
                          Oportunidades públicas vinculadas automaticamente à prefeitura.
                        </p>
                      </div>
                    </div>
 
                    <h3 className="font-bold text-gray-900 mb-4">Notas e Observações</h3>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed italic">
                      &quot;Órgão com alto potencial para soluções de Smart City. O prefeito atual tem foco em digitalização de serviços públicos e redução de burocracia. Próxima janela de licitação prevista para o Q1 do próximo ano.&quot;
                    </div>
                  </>
                )}
 
                {activeTab === 'contacts' && (
                  <div className="space-y-4">
                    {contacts.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
                        Nenhum contato cadastrado para esta prefeitura.
                      </div>
                    )}
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0f49bd] font-bold">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{contact.name}</h4>
                            <p className="text-xs text-gray-500">{contact.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Contato</span>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="size-3" /> {contact.phone || 'N/A'}
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setIsAddContactModalOpen(true)}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-400 hover:border-[#0f49bd] hover:text-[#0f49bd] transition-all"
                    >
                      + Adicionar Novo Contato
                    </button>
                  </div>
                )}
 
                {activeTab === 'emails' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4">Contatos Estratégicos</h3>
                      <div className="space-y-3">
                        {strategicEmails.length > 0 ? strategicEmails.map((emailRow) => (
                          <div
                            key={emailRow.id}
                            className="flex items-center justify-between p-4 bg-green-50/40 rounded-xl border border-green-100"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 break-all">{emailRow.email}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-green-200 text-green-700">
                                  {emailRow.department_label || 'Geral'}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-100 text-green-700">
                                  Estratégico
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  Score {emailRow.priority_score ?? 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleCopyEmail(emailRow.email)}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                                title="Copiar e-mail"
                              >
                                <Copy className="size-4" />
                              </button>
                              <a
                                href={`mailto:${emailRow.email}`}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                                title="Enviar e-mail"
                              >
                                <Mail className="size-4" />
                              </a>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
                            Nenhum e-mail estratégico encontrado para esta prefeitura.
                          </div>
                        )}
                      </div>
                    </div>
 
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4">Todos os E-mails</h3>
                      <div className="space-y-3">
                        {unifiedEmails.length > 0 ? unifiedEmails.map((emailRow) => (
                          <div
                            key={emailRow.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 break-all">{emailRow.email}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                                  {emailRow.department_label || 'Geral'}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  Score {emailRow.priority_score ?? 0}
                                </span>
                                {emailRow.is_strategic && (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-100 text-green-700">
                                    Estratégico
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleCopyEmail(emailRow.email)}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                                title="Copiar e-mail"
                              >
                                <Copy className="size-4" />
                              </button>
                              <a
                                href={`mailto:${emailRow.email}`}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                                title="Enviar e-mail"
                              >
                                <Mail className="size-4" />
                              </a>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
                            Nenhum e-mail encontrado para esta prefeitura.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'opportunities' && (
                  <div className="space-y-4">
                    {opportunities.length > 0 ? opportunities.map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 leading-6">
                              {opportunity.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {opportunity.organ_name || 'Órgão não informado'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-50 text-blue-700 whitespace-nowrap">
                            {opportunity.modality || 'Modalidade não informada'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {opportunity.situation || 'Situação não informada'}
                          </span>
                          {opportunity.internal_status && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-100 text-green-700">
                              {opportunity.internal_status}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 mb-4">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Publicação</span>
                            <span>{opportunity.publication_date ? formatDate(opportunity.publication_date) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Abertura</span>
                            <span>{opportunity.opening_date ? formatDate(opportunity.opening_date) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Valor estimado</span>
                            <span>
                              {opportunity.estimated_value
                                ? formatCurrency(opportunity.estimated_value)
                                : 'Não informado'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleGenerateProposal(opportunity)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all text-xs font-bold"
                          >
                            <FileText className="size-3.5" />
                            Gerar Proposta
                          </button>
                          {opportunity.official_url && (
                            <button
                              onClick={() => window.open(opportunity.official_url!, '_blank')}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all text-xs font-bold"
                            >
                              <ExternalLink className="size-3.5" />
                              Abrir edital
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-100">
                        Nenhuma licitação encontrada para esta prefeitura.
                      </div>
                    )}
                  </div>
                )}
 
                {activeTab === 'deals' && (
                  <div className="space-y-4">
                    {deals.map(deal => (
                      <div key={deal.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-900">{deal.title}</h4>
                          <span className="text-sm font-black text-[#0f49bd]">{formatCurrency(deal.estimated_value)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                            deal.status === DealStage.WON ? "bg-green-50 text-green-700" :
                            deal.status === DealStage.LOST ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                          )}>
                            {deal.status}
                          </span>
                          <button
                            onClick={() => router.push('/crm/pipeline')}
                            className="text-xs font-bold text-[#0f49bd] hover:underline"
                          >
                            Ver no funil
                          </button>
                        </div>
                      </div>
                    ))}
                    {deals.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">Nenhum negócio encontrado para esta prefeitura.</div>
                    )}
                  </div>
                )}
 
                {activeTab === 'proposals' && (
                  <div className="space-y-4">
                    {proposals.map(proposal => (
                      <div key={proposal.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-900">{proposal.title}</h4>
                          <span className="text-sm font-black text-[#0f49bd]">{formatCurrency(proposal.value)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {proposal.date ? formatDate(proposal.date) : 'N/A'}
                            </span>
                          </div>
                          <button
                            onClick={() => router.push('/crm/proposals')}
                            className="text-xs font-bold text-[#0f49bd] hover:underline"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                    {proposals.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">Nenhuma proposta encontrada para esta prefeitura.</div>
                    )}
                  </div>
                )}
 
                {activeTab === 'contracts' && (
                  <div className="space-y-4">
                    {contracts.map(contract => (
                      <div key={contract.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-gray-900">{contract.title}</h4>
                          <span className="text-sm font-black text-[#0f49bd]">{formatCurrency(contract.value)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Vence em: {contract.end_date ? formatDate(contract.end_date) : 'N/A'}
                            </span>
                            {contract.is_expiring_soon && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">Vencendo</span>
                            )}
                          </div>
                          <button
                            onClick={() => router.push('/crm/contracts')}
                            className="text-xs font-bold text-[#0f49bd] hover:underline"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                    {contracts.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">Nenhum contrato encontrado para esta prefeitura.</div>
                    )}
                  </div>
                )}
 
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <FileText className="size-5 text-gray-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{doc.file_name}</h4>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                              Adicionado em {doc.created_at ? formatDate(doc.created_at) : 'N/A'} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadDoc(doc)}
                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all shadow-sm"
                          >
                            <Download className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-600 transition-all shadow-sm"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
 
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className={cn(
                          "w-full py-6 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-400 hover:border-[#0f49bd] hover:text-[#0f49bd] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                          uploading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="size-6 animate-spin" />
                            Fazendo upload...
                          </>
                        ) : (
                          <>
                            <Plus className="size-6" />
                            Upload de Documento (PDF, DOCX, XLSX, Imagens)
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
 
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Linha do Tempo</h3>
                <button
                  onClick={() => {
                    setEditingEvent({ title: '', date: new Date().toISOString().split('T')[0], type: 'meeting', description: '' });
                    setIsEventModalOpen(true);
                  }}
                  className="text-xs font-bold text-[#0f49bd] hover:underline flex items-center gap-1"
                >
                  <Plus className="size-3" /> Adicionar Evento
                </button>
              </div>
              <div className="p-8 space-y-8">
                {timelineEvents.map((item, i) => (
                  <div key={item.id} className="flex gap-4 relative group">
                    {i !== timelineEvents.length - 1 && <div className="absolute left-[11px] top-8 bottom-[-32px] w-0.5 bg-gray-100"></div>}
                    <div className="size-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10">
                      <div className="size-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                          <button
                            onClick={() => {
                              setEditingEvent({ ...item });
                              setIsEventModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                          >
                            <Edit className="size-3 text-gray-400" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Excluir este evento?')) {
                                try {
                                  await timelineService.delete(item.id);
                                  setTimelineEvents(timelineEvents.filter(ev => ev.id !== item.id));
                                  toast.success('Evento excluído.');
                                } catch (error) {
                                  toast.error('Erro ao excluir evento.');
                                }
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="size-3 text-red-400" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {item.date ? formatDate(item.date) : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-purple-600" />
              Proposta Comercial Gerada por IA
            </DialogTitle>
            <DialogDescription>
              {proposalOpp?.organ_name} — {proposalOpp?.title?.substring(0, 80)}...
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isGeneratingProposal ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="size-10 text-purple-600 animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Analisando o edital e gerando a proposta...</p>
                <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Edite o texto abaixo se necessário antes de salvar ou baixar.</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase">Gerado por IA</span>
                </div>
                <textarea
                  className="w-full min-h-[400px] p-4 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none leading-relaxed font-mono"
                  value={proposalContent}
                  onChange={(e) => setProposalContent(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsProposalModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
            <button
              onClick={handleSaveProposal}
              disabled={isSavingProposal || isGeneratingProposal || !proposalContent}
              className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              {isSavingProposal ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingProposal || !proposalContent}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Download className="size-4" />
              Baixar PDF
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>
              Cadastre um decisor ou influenciador vinculado a <span className="font-bold text-gray-900">{account.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nome Completo</label>
              <input
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Ana Souza"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cargo</label>
              <input
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Secretária de Educação"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Departamento</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Compras"
                  value={newContact.department}
                  onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Secretaria</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Educação"
                  value={newContact.secretariat}
                  onChange={(e) => setNewContact({ ...newContact, secretariat: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input
                  type="email"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="ana@prefeitura.gov.br"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Telefone</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="(00) 00000-0000"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">WhatsApp</label>
              <input
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="5511999999999"
                value={newContact.whatsapp}
                onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={() => setIsAddContactModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingContact}
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingContact && <Loader2 className="size-4 animate-spin" />}
                Salvar Contato
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
 
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent?.id ? 'Editar Evento' : 'Adicionar Evento'}</DialogTitle>
            <DialogDescription>
              Registre uma interação ou marco importante com esta prefeitura.
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleSaveEvent} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título do Evento</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="Ex: Reunião de Alinhamento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Data</label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Tipo</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingEvent.type}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value })}
                  >
                    <option value="meeting">Reunião</option>
                    <option value="call">Chamada</option>
                    <option value="email">E-mail</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Detalhes do que foi discutido..."
                />
              </div>
              <DialogFooter className="pt-4">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
                >
                  Salvar Evento
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
 
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Prefeitura</DialogTitle>
            <DialogDescription>
              Atualize as informações cadastrais desta prefeitura.
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleEdit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome do Município</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cidade</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Estado (UF)</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.state}
                    onChange={(e) => setEditData({ ...editData, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Prefeito(a) Atual</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.mayor_name}
                  onChange={(e) => setEditData({ ...editData, mayor_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Região</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.region}
                    onChange={(e) => setEditData({ ...editData, region: e.target.value as Region })}
                  >
                    <option value={Region.NORTH}>Norte</option>
                    <option value={Region.NORTHEAST}>Nordeste</option>
                    <option value={Region.MIDWEST}>Centro-Oeste</option>
                    <option value={Region.SOUTHEAST}>Sudeste</option>
                    <option value={Region.SOUTH}>Sul</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">População</label>
                  <input
                    type="number"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.population}
                    onChange={(e) => setEditData({ ...editData, population: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Website</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.website}
                  onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail Institucional</label>
                <input
                  type="email"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="contato@prefeitura.gov.br"
                  value={editData.email ?? ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Endereço</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">DDD</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.ddd}
                    onChange={(e) => setEditData({ ...editData, ddd: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
                >
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
 
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a prefeitura <span className="font-bold text-gray-900">{account.name}</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
