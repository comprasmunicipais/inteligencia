'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Plus,
  User,
  MapPin,
  Briefcase,
  History,
  MessageSquare,
  FileText,
  MessageCircle,
  Edit,
  Trash2,
  ArrowRightLeft,
  Loader2,
  Users
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
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
import { contactService } from '@/lib/services/contacts';
import { taskService } from '@/lib/services/tasks';
import { ContactDTO, TaskDTO } from '@/lib/types/dtos';
import { TaskPriority, TaskStatus } from '@/lib/types/enums';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useCompany();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<ContactDTO | null>(null);
  const [contactTasks, setContactTasks] = useState<TaskDTO[]>([]);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editData, setEditData] = useState<ContactDTO | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
  });

  const loadContact = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactService.getById(params.id as string);
      setContact(data);
      const tasks = await taskService.getAll(data.company_id);
      setContactTasks(tasks.filter(task => task.contact_id === data.id));
    } catch (error) {
      toast.error('Erro ao carregar contato.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadContact();
    }
  }, [params.id, loadContact]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData || !contact) return;

    if (!editData.name || !editData.email) {
      toast.error('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const updated = await contactService.update(contact.id, editData);
      setContact(updated);
      setIsEditModalOpen(false);
      toast.success('Contato atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar contato.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await contactService.delete(contact.id);
      toast.success('Contato excluído com sucesso!');
      setIsDeleteModalOpen(false);
      router.push('/crm/contacts');
    } catch (error) {
      toast.error('Erro ao excluir contato.');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (newStatus: string) => {
    if (!contact) return;
    setSaving(true);
    try {
      const updated = await contactService.update(contact.id, { status: newStatus as any });
      setContact(updated);
      setIsMoveModalOpen(false);
      toast.success(`Contato movido para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}!`);
    } catch (error) {
      toast.error('Erro ao mover contato.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddTaskModal = () => {
    if (!contact?.municipality_id) {
      toast.error('Este contato não possui prefeitura vinculada.');
      return;
    }

    setIsAddTaskModalOpen(true);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    if (!contact.municipality_id) {
      toast.error('Este contato não possui prefeitura vinculada.');
      return;
    }

    if (!newTask.title || !newTask.due_date) {
      toast.error('Preencha título e prazo da ação.');
      return;
    }

    setSaving(true);
    try {
      const created = await taskService.create({
        company_id: contact.company_id,
        municipality_id: contact.municipality_id,
        contact_id: contact.id,
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.due_date,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        updated_at: new Date().toISOString(),
      });

      setContactTasks((prev) => [created, ...prev]);
      setIsAddTaskModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
      });
      toast.success('Próxima ação criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar próxima ação.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-8 text-center">
        <Users className="size-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Contato não encontrado</h2>
        <button 
          onClick={() => router.push('/crm/contacts')}
          className="mt-6 px-6 py-2 bg-[#0f49bd] text-white rounded-xl font-bold"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  const handleSendEmail = () => {
    if (!contact.email) {
      toast.error('E-mail não cadastrado.');
      return;
    }
    window.location.assign(`mailto:${contact.email}?subject=Contato - Painel de Compras`);
  };

  const handleCallNow = () => {
    if (!contact.phone) {
      toast.error('Telefone não cadastrado.');
      return;
    }
    window.location.assign(`tel:${contact.phone.replace(/\D/g, '')}`);
  };

  const handleSendWhatsApp = () => {
    if (!contact.whatsapp) {
      toast.error('WhatsApp não cadastrado.');
      return;
    }
    
    // Sanitize number: keep only digits
    let sanitizedNumber = contact.whatsapp.replace(/\D/g, '');
    
    // If it doesn't start with 55 (Brazil), add it
    if (sanitizedNumber.length === 11 && !sanitizedNumber.startsWith('55')) {
      sanitizedNumber = `55${sanitizedNumber}`;
    }
    
    window.open(`https://wa.me/${sanitizedNumber}`, '_blank');
  };

  if (!contact) return null;

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
            <h1 className="text-lg font-bold text-gray-900">{contact.name}</h1>
            <p className="text-xs text-gray-500">{contact.role} em {contact.account_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setEditData({...contact});
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="size-4" /> Editar
          </button>
          <button 
            onClick={() => setIsMoveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowRightLeft className="size-4" /> Mover
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
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="size-24 rounded-full bg-blue-50 flex items-center justify-center text-[#0f49bd] font-bold text-3xl border-2 border-blue-100 shadow-sm mx-auto mb-4">
                {contact.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{contact.name}</h2>
              <p className="text-sm font-bold text-[#0f49bd] uppercase tracking-wider mt-1">{contact.role}</p>
              
              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={handleSendEmail}
                  className="w-full bg-[#0f49bd] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0a3690] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Mail className="size-4" /> Enviar E-mail
                </button>
                <button 
                  onClick={handleCallNow}
                  className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Phone className="size-4" /> Ligar Agora
                </button>
                <button 
                  onClick={handleSendWhatsApp}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Informações de Contato</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="size-4 text-gray-400" />
                  <span className="text-gray-600">{contact.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="size-4 text-gray-400" />
                  <span className="text-gray-600">{contact.phone}</span>
                </div>
                {contact.whatsapp && (
                  <div className="flex items-center gap-3 text-sm">
                    <MessageCircle className="size-4 text-gray-400" />
                    <span className="text-gray-600">{contact.whatsapp}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="size-4 text-gray-400" />
                  <span className="text-gray-600">{contact.account_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-4 text-gray-400" />
                  <span className="text-gray-600">{contact.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Sobre</h3>
              <p className="text-gray-600 leading-relaxed">{contact.bio}</p>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento</span>
                  <span className="text-sm font-bold text-gray-700">{contact.department}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded",
                    contact.status === 'active' ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {contact.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-8 py-4 bg-gray-50/50 flex items-center justify-between gap-4">
                <h3 className="font-bold text-gray-900">Próximas Ações</h3>
                <button
                  onClick={handleOpenAddTaskModal}
                  className="flex items-center gap-2 rounded-lg bg-[#0f49bd] px-3 py-2 text-xs font-bold text-white hover:bg-[#0a3690] transition-colors shadow-sm"
                >
                  <Plus className="size-3.5" />
                  Nova Ação
                </button>
              </div>
              <div className="p-8">
                {contactTasks.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma próxima ação cadastrada para este contato.</p>
                ) : (
                  <div className="space-y-4">
                    {contactTasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-gray-100 bg-white p-4">
                        <h4 className="text-sm font-bold text-gray-900">{task.title}</h4>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <Calendar className="size-3.5" />
                            {task.due_date ? formatDate(task.due_date) : 'Sem data'}
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                            task.priority === 'alta' ? "bg-red-50 text-red-600" :
                            task.priority === 'média' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {task.priority}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                            task.status === 'concluída' ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-8 py-4 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Histórico de Interações</h3>
                <button 
                  onClick={() => router.push(`/crm/contacts/${params.id}/history`)}
                  className="text-xs font-bold text-[#0f49bd] hover:underline"
                >
                  Ver tudo
                </button>
              </div>
              <div className="p-8 space-y-8">
                {[
                  { date: '2023-10-24', type: 'call', title: 'Ligação de Acompanhamento', desc: 'Discussão sobre o cronograma de entrega do projeto.' },
                  { date: '2023-10-20', type: 'email', title: 'Envio de Proposta Atualizada', desc: 'Proposta enviada com os novos requisitos técnicos.' },
                  { date: '2023-10-15', type: 'meeting', title: 'Reunião Presencial', desc: 'Apresentação da solução para a diretoria de TI.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== 2 && <div className="absolute left-[11px] top-8 bottom-[-32px] w-0.5 bg-gray-100"></div>}
                    <div className="size-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10">
                      <div className="size-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.date ? formatDate(item.date) : 'N/A'}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Ação</DialogTitle>
            <DialogDescription>
              Cadastre uma próxima ação vinculada a este contato.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Título</label>
              <input
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Descrição</label>
              <textarea
                rows={3}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] resize-none"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Prazo</label>
              <input
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Criar Ação
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Contact Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações deste contato.
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleEdit} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                <input
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cargo</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Departamento</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input
                  type="email"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Telefone</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">WhatsApp</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editData.whatsapp}
                    onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })}
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
                  disabled={saving}
                  className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Salvar Alterações
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Contact Modal */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mover Contato</DialogTitle>
            <DialogDescription>
              Altere o status ou categoria deste contato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <button 
              onClick={() => handleMove('active')}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#0f49bd] hover:bg-blue-50 transition-all text-left"
            >
              <div>
                <span className="font-bold text-gray-900 block">Ativo / Em Prospecção</span>
                <span className="text-xs text-gray-500">Contato regular e oportunidades abertas.</span>
              </div>
              <ArrowRightLeft className="size-4 text-gray-400" />
            </button>
            <button 
              onClick={() => handleMove('inactive')}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#0f49bd] hover:bg-blue-50 transition-all text-left"
            >
              <div>
                <span className="font-bold text-gray-900 block">Inativo / Arquivado</span>
                <span className="text-xs text-gray-500">Contatos sem interação recente.</span>
              </div>
              <ArrowRightLeft className="size-4 text-gray-400" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o contato <span className="font-bold text-gray-900">{contact.name}</span>? Esta ação não pode ser desfeita.
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
              disabled={saving}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
