'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MoreVertical,
  User,
  Building2,
  X,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/components/providers/CompanyProvider';
import { contactService } from '@/lib/services/contacts';
import { municipalityService, MunicipalityOption } from '@/lib/services/municipalities';
import { ContactDTO } from '@/lib/types/dtos';
import { ContactStatus } from '@/lib/types/enums';
import { safeText } from '@/lib/utils/safe-helpers';

import EmptyState from '@/components/shared/EmptyState';

export default function ContactsPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [accounts, setAccounts] = useState<MunicipalityOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    municipality_id: '',
    email: '',
    phone: '',
    whatsapp: '',
    department: '',
    secretariat: '',
    notes: ''
  });
  const [editingContact, setEditingContact] = useState<ContactDTO | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactDTO | null>(null);
  
  const [filters, setFilters] = useState({ status: '', municipality_id: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsData, accountsData] = await Promise.all([
        contactService.getAll(companyId!),
        municipalityService.getAllForSelect()
      ]);
      setContacts(contactsData || []);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Erro ao carregar dados.');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [companyId, loadData]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && companyId) loadData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [companyId, loadData]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('ID da empresa não encontrado.');
      return;
    }

    if (!newContact.name || !newContact.municipality_id || !newContact.email) {
      toast.error('Por favor, preencha o nome, órgão e e-mail.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...newContact,
        company_id: companyId,
        status: ContactStatus.ACTIVE,
        // Convert empty strings to null for optional fields
        phone: newContact.phone || undefined,
        whatsapp: newContact.whatsapp || undefined,
        department: newContact.department || undefined,
        secretariat: newContact.secretariat || undefined,
        notes: newContact.notes || undefined,
        role: newContact.role || '-'
      };

      const created = await contactService.create(payload);
      setContacts([created, ...contacts]);
      setIsAddModalOpen(false);
      setNewContact({
        name: '',
        role: '',
        municipality_id: '',
        email: '',
        phone: '',
        whatsapp: '',
        department: '',
        secretariat: '',
        notes: ''
      });
      toast.success('Contato adicionado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error adding contact:', error);
      toast.error(`Erro ao adicionar contato: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    
    if (!editingContact.name || !editingContact.municipality_id || !editingContact.email) {
      toast.error('Por favor, preencha o nome, órgão e e-mail.');
      return;
    }

    setSaving(true);
    try {
      const updated = await contactService.update(editingContact.id, {
        ...editingContact,
        // Ensure optional fields are handled
        phone: editingContact.phone || undefined,
        whatsapp: editingContact.whatsapp || undefined,
        department: editingContact.department || undefined,
        secretariat: editingContact.secretariat || undefined,
      });
      setContacts(contacts.map(c => c.id === updated.id ? updated : c));
      setIsEditModalOpen(false);
      setEditingContact(null);
      toast.success('Contato atualizado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error updating contact:', error);
      toast.error(`Erro ao atualizar contato: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    try {
      await contactService.delete(deletingContact.id);
      setContacts(contacts.filter(c => c.id !== deletingContact.id));
      setIsDeleteModalOpen(false);
      setDeletingContact(null);
      toast.success('Contato excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir contato.');
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesAccount = !filters.municipality_id || c.municipality_id === filters.municipality_id;
    
    return matchesSearch && matchesStatus && matchesAccount;
  });

  const handleApplyFilters = () => {
    toast.success('Filtros aplicados!');
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({ status: '', municipality_id: '' });
    toast.info('Filtros limpos.');
  };

  return (
    <>
      <Header 
        title="Contatos" 
        subtitle="Base de contatos de decisores e influenciadores nos órgãos públicos." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] outline-none shadow-sm transition-all text-sm"
                placeholder="Buscar por nome, cargo ou órgão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Filter className="size-4" />
                Filtrar
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2.5 text-white hover:bg-[#0a3690] transition-colors shadow-sm font-bold text-sm"
              >
                <Plus className="size-4" />
                Novo Contato
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <EmptyState 
              icon={User}
              title="Nenhum contato encontrado"
              description="Comece adicionando contatos de decisores e influenciadores para gerenciar seus relacionamentos."
              action={{
                label: "Novo Contato",
                onClick: () => setIsAddModalOpen(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 relative group cursor-pointer"
                  onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                >
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100"
                        >
                          <MoreVertical className="size-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/crm/contacts/${contact.id}`); }}>
                          <Eye className="size-4 mr-2" /> Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingContact(contact); setIsEditModalOpen(true); }}>
                          <Edit className="size-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); setDeletingContact(contact); setIsDeleteModalOpen(true); }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="size-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-start gap-4 mb-6">
                    <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0f49bd] font-bold text-lg border border-blue-100 shadow-sm">
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{contact.name}</h3>
                      <p className="text-xs font-bold text-[#0f49bd] uppercase tracking-wider">{contact.role}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building2 className="size-4 text-gray-400" />
                      <span className="truncate">{contact.account_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail className="size-4 text-gray-400" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone className="size-4 text-gray-400" />
                      <span>{contact.phone}</span>
                    </div>
                    {contact.whatsapp && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MessageCircle className="size-4 text-gray-400" />
                        <span>{contact.whatsapp}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="flex items-start gap-3 text-sm text-gray-600">
                        <FileText className="size-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{contact.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                      contact.status === ContactStatus.ACTIVE ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {contact.status === ContactStatus.ACTIVE ? 'Ativo' : 'Inativo'}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/crm/contacts/${contact.id}`); }}
                      className="text-xs font-bold text-[#0f49bd] hover:underline"
                    >
                      Ver Perfil Completo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualize as informações do contato selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <form onSubmit={handleEditContact} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-name" className="text-sm font-bold text-gray-700">Nome Completo</label>
                <input
                  id="edit-name"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-role" className="text-sm font-bold text-gray-700">Cargo</label>
                <input
                  id="edit-role"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContact.role}
                  onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
                <select 
                  id="edit-account"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContact.municipality_id}
                  onChange={(e) => setEditingContact({ ...editingContact, municipality_id: e.target.value })}
                >
                  <option value="">Selecione uma prefeitura</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-department" className="text-sm font-bold text-gray-700">Departamento</label>
                  <input
                    id="edit-department"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContact.department || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                  <input
                    id="edit-secretariat"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContact.secretariat || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, secretariat: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-email" className="text-sm font-bold text-gray-700">E-mail</label>
                  <input
                    id="edit-email"
                    type="email"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-phone" className="text-sm font-bold text-gray-700">Telefone</label>
                  <input
                    id="edit-phone"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                    value={editingContact.phone}
                    onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-whatsapp" className="text-sm font-bold text-gray-700">WhatsApp</label>
                <input
                  id="edit-whatsapp"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContact.whatsapp || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Status</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  value={editingContact.status}
                  onChange={(e) => setEditingContact({ ...editingContact, status: e.target.value as ContactStatus })}
                >
                  <option value={ContactStatus.ACTIVE}>Ativo</option>
                  <option value={ContactStatus.INACTIVE}>Inativo</option>
                </select>
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

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o contato <span className="font-bold text-gray-900">{deletingContact?.name}</span>? Esta ação não pode ser desfeita.
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
              onClick={handleDeleteContact}
              className="flex-1 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-700 shadow-sm transition-all"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Contact Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>
              Cadastre um novo decisor ou influenciador de um órgão público.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-bold text-gray-700">Nome Completo</label>
              <input
                id="name"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Ana Souza"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-bold text-gray-700">Cargo</label>
              <input
                id="role"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: Secretária de Educação"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-bold text-gray-700">Órgão / Prefeitura</label>
              <select 
                id="account"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newContact.municipality_id}
                onChange={(e) => setNewContact({ ...newContact, municipality_id: e.target.value })}
              >
                <option value="">Selecione uma prefeitura</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-bold text-gray-700">Departamento</label>
                <input
                  id="department"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Compras"
                  value={newContact.department}
                  onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="secretariat" className="text-sm font-bold text-gray-700">Secretaria</label>
                <input
                  id="secretariat"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="Ex: Educação"
                  value={newContact.secretariat}
                  onChange={(e) => setNewContact({ ...newContact, secretariat: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-gray-700">E-mail</label>
                <input
                  id="email"
                  type="email"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="ana@prefeitura.gov.br"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-bold text-gray-700">Telefone</label>
                <input
                  id="phone"
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="(00) 00000-0000"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="whatsapp" className="text-sm font-bold text-gray-700">WhatsApp</label>
              <input
                id="whatsapp"
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="5511999999999"
                value={newContact.whatsapp}
                onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-bold text-gray-700">Anotações</label>
              <textarea
                id="notes"
                rows={3}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] resize-none"
                placeholder="Registre informações relevantes do contato, o que foi conversado, contexto do relacionamento..."
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
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
                Salvar Contato
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filtrar Contatos</DialogTitle>
            <DialogDescription>
              Selecione os critérios para filtrar sua base de contatos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilters({ ...filters, status: ContactStatus.ACTIVE })}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                    filters.status === ContactStatus.ACTIVE ? "bg-[#0f49bd] text-white border-[#0f49bd]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Ativos
                </button>
                <button 
                  onClick={() => setFilters({ ...filters, status: ContactStatus.INACTIVE })}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                    filters.status === ContactStatus.INACTIVE ? "bg-[#0f49bd] text-white border-[#0f49bd]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Inativos
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Órgão</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={filters.municipality_id}
                onChange={(e) => setFilters({ ...filters, municipality_id: e.target.value })}
              >
                <option value="">Todos os órgãos</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <button 
              onClick={handleResetFilters}
              className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Limpar
            </button>
            <button 
              onClick={handleApplyFilters}
              className="flex-1 bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
            >
              Aplicar Filtros
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
