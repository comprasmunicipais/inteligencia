'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  Edit,
  Trash2,
  Ban
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { getCompaniesAction, createCompanyAction, updateCompanyAction } from '../actions';
import { Company } from '@/lib/services/admin';

export default function AdminCompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({ name: '', status: 'active' });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompaniesAction();
      setCompanies(data);
    } catch (error) {
      toast.error('Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) {
      toast.error('Por favor, preencha o nome da empresa.');
      return;
    }

    try {
      const created = await createCompanyAction(newCompany);
      setCompanies([created, ...companies]);
      setIsAddModalOpen(false);
      setNewCompany({ name: '', status: 'active' });
      toast.success('Empresa criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar empresa.');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updated = await updateCompanyAction(id, { status });
      setCompanies(companies.map(c => c.id === id ? updated : c));
      toast.success(`Status da empresa atualizado para ${status}.`);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gerenciamento de Empresas</h1>
          <p className="text-sm text-gray-500">Visualize e gerencie todos os tenants da plataforma.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#0f49bd] hover:bg-[#0a3690] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="size-4" />
          Nova Empresa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <Filter className="size-4" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">CNPJ</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Criado em</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="size-8 text-[#0f49bd] animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-2 font-bold uppercase">Carregando empresas...</p>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-[#0f49bd]/10 flex items-center justify-center text-[#0f49bd]">
                        <Building2 className="size-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">{company.cnpj}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                      company.plan === 'Enterprise' ? "bg-purple-50 text-purple-700" :
                      company.plan === 'Pro' ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {company.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
                      company.status === 'active' ? "text-green-600" : 
                      company.status === 'suspended' ? "text-red-600" : "text-amber-600"
                    )}>
                      <div className={cn(
                        "size-1.5 rounded-full",
                        company.status === 'active' ? "bg-green-600" : 
                        company.status === 'suspended' ? "bg-red-600" : "bg-amber-600"
                      )} />
                      {company.status === 'active' ? 'Ativo' : company.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{company.created_at ? formatDate(company.created_at) : 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs font-bold">
                          <ExternalLink className="size-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold">
                          <Edit className="size-4 mr-2" /> Editar Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold">
                          <ShieldCheck className="size-4 mr-2" /> Alterar Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleUpdateStatus(company.id, company.status === 'active' ? 'suspended' : 'active')}
                          className={cn(
                            "text-xs font-bold",
                            company.status === 'active' ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {company.status === 'active' ? (
                            <><Ban className="size-4 mr-2" /> Suspender Empresa</>
                          ) : (
                            <><ShieldCheck className="size-4 mr-2" /> Reativar Empresa</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
            <DialogDescription>
              Cadastre um novo tenant na plataforma.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCompany} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
              <input 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Ex: CM Intelligence Ltda"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={newCompany.status}
                onChange={(e) => setNewCompany({ ...newCompany, status: e.target.value })}
              >
                <option value="active">Ativo</option>
                <option value="pending">Pendente</option>
              </select>
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
                className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all"
              >
                Criar Empresa
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
