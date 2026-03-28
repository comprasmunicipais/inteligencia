'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  Mail, 
  Ban, 
  CheckCircle2,
  Loader2,
  Edit,
  Key,
  Building2
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
import { getUsersAction, updateUserRoleAction, updateUserStatusAction, getCompaniesAction } from '../actions';
import { UserProfile, Company } from '@/lib/services/admin';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'user', company_id: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersData, companiesData] = await Promise.all([
        getUsersAction(),
        getCompaniesAction()
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
    } catch (error) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const updated = await updateUserRoleAction(id, role);
      setUsers(users.map(u => u.id === id ? updated : u));
      toast.success(`Papel do usuário atualizado para ${role}.`);
    } catch (error) {
      toast.error('Erro ao atualizar papel.');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updated = await updateUserStatusAction(id, status);
      setUsers(users.map(u => u.id === id ? updated : u));
      toast.success(`Status do usuário atualizado para ${status}.`);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-sm text-gray-500">Controle o acesso e as permissões de todos os usuários da plataforma.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-[#0f49bd] hover:bg-[#0a3690] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <UserPlus className="size-4" />
          Convidar Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input 
              type="text" 
              placeholder="Buscar por e-mail ou empresa..." 
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
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Papel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="size-8 text-[#0f49bd] animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-2 font-bold uppercase">Carregando usuários...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Users className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{user.email}</span>
                        <span className="text-[10px] text-gray-400 font-mono">ID: {user.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="size-3.5 text-gray-400" />
                      {user.company?.name || 'Sem Empresa'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                      user.role === 'platform_admin' ? "bg-red-50 text-red-700" :
                      user.role === 'admin' ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {user.role === 'platform_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
                      user.status === 'active' ? "text-green-600" : "text-red-600"
                    )}>
                      <div className={cn(
                        "size-1.5 rounded-full",
                        user.status === 'active' ? "bg-green-600" : "bg-red-600"
                      )} />
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{user.last_access ? formatDate(user.last_access) : 'Nunca'}</span>
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
                          <Edit className="size-4 mr-2" /> Editar Permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold">
                          <Key className="size-4 mr-2" /> Resetar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className="text-xs font-bold"
                        >
                          <Shield className="size-4 mr-2" /> {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleUpdateStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
                          className={cn(
                            "text-xs font-bold",
                            user.status === 'active' ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {user.status === 'active' ? (
                            <><Ban className="size-4 mr-2" /> Desativar Usuário</>
                          ) : (
                            <><CheckCircle2 className="size-4 mr-2" /> Ativar Usuário</>
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

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={(open) => { setIsInviteModalOpen(open); if (!open) setInviteError(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite de acesso para um novo usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input 
                  className="w-full pl-9 pr-3 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="usuario@empresa.com.br"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Empresa</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={inviteData.company_id}
                onChange={(e) => setInviteData({ ...inviteData, company_id: e.target.value })}
              >
                <option value="">Selecione uma empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Papel (Role)</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
              >
                <option value="user">Usuário Comum</option>
                <option value="admin">Administrador da Empresa</option>
                <option value="platform_admin">Super Admin da Plataforma</option>
              </select>
            </div>
          </div>
          {inviteError && (
            <p className="text-xs text-red-600 font-bold px-1 -mt-2">{inviteError}</p>
          )}
          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => { setIsInviteModalOpen(false); setInviteError(null); }}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              disabled={inviteLoading}
              onClick={async () => {
                setInviteError(null);
                setInviteLoading(true);
                try {
                  const res = await fetch('/api/admin/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(inviteData),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setInviteError(json.error || 'Erro ao enviar convite.');
                    return;
                  }
                  toast.success('Convite enviado com sucesso!');
                  setIsInviteModalOpen(false);
                  setInviteData({ email: '', role: 'user', company_id: '' });
                  await loadUsers();
                } catch {
                  setInviteError('Erro de conexão. Tente novamente.');
                } finally {
                  setInviteLoading(false);
                }
              }}
              className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {inviteLoading && <Loader2 className="size-4 animate-spin" />}
              Enviar Convite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
