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
  Loader2,
  Edit,
  Key,
  Building2,
  UserCog,
  Eye,
  CreditCard,
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
import { getUsersAction, updateUserRoleAction, getCompaniesAction, updateCompanyAction } from '../actions';
import { UserProfile, Company } from '@/lib/services/admin';

type Plan = { id: string; name: string; price_monthly: number };
type CompanyDetail = {
  id: string;
  name: string;
  status: string;
  plan_id: string | null;
  emails_used_this_month: number;
  trial_ends_at: string | null;
  subscription: { status: string; billing_cycle: string } | null;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'user', company_id: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({ full_name: '', email: '', password: '', confirm_password: '', company_id: '', role: 'user' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [resetPasswordLoadingId, setResetPasswordLoadingId] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({ role: 'user', company_id: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [companyDetailUser, setCompanyDetailUser] = useState<UserProfile | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [companyDetailLoading, setCompanyDetailLoading] = useState(false);
  const [companyDetailError, setCompanyDetailError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planUpdateLoading, setPlanUpdateLoading] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!companyDetailUser?.company_id) return;
    setCompanyDetailLoading(true);
    setCompanyDetail(null);
    setCompanyDetailError(null);
    fetch(`/api/admin/companies/update-plan?company_id=${companyDetailUser.company_id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setCompanyDetailError(data.error); return; }
        setCompanyDetail(data.company);
        setPlans(data.plans);
        setSelectedPlanId(data.company.plan_id ?? '');
      })
      .catch(() => setCompanyDetailError('Erro ao carregar detalhes.'))
      .finally(() => setCompanyDetailLoading(false));
  }, [companyDetailUser]);

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

  const handleResetPassword = async (id: string, email: string) => {
    setResetPasswordLoadingId(id);
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Erro ao resetar senha.');
        return;
      }
      toast.success(`Email de redefinição enviado para ${email}`);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setResetPasswordLoadingId(null);
    }
  };

  const hasActiveFilters = filterRole !== '';

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === '' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-sm text-gray-500">Controle o acesso e as permissões de todos os usuários da plataforma.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <UserCog className="size-4" />
            Criar Usuário
          </button>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[#0f49bd] hover:bg-[#0a3690] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <UserPlus className="size-4" />
            Convidar Usuário
          </button>
        </div>
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
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              "px-4 py-2 border rounded-lg text-sm font-bold flex items-center gap-2 transition-colors",
              showFilters || hasActiveFilters
                ? "border-[#0f49bd] text-[#0f49bd] bg-[#0f49bd]/5"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="size-4" />
            Filtros
            {hasActiveFilters && (
              <span className="size-2 rounded-full bg-[#0f49bd] inline-block" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] font-medium text-gray-700"
            >
              <option value="">Papel: Todos</option>
              <option value="user">Usuário Comum</option>
              <option value="admin">Admin</option>
              <option value="platform_admin">Super Admin</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => setFilterRole('')}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-black text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Papel</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="size-8 text-[#0f49bd] animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 mt-2 font-bold uppercase">Carregando usuários...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                        <DropdownMenuItem
                          onClick={() => setCompanyDetailUser(user)}
                          className="text-xs font-bold"
                        >
                          <Eye className="size-4 mr-2" /> Ver Detalhes da Empresa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditUser(user);
                            setEditData({ role: user.role, company_id: user.company_id });
                            setEditError(null);
                          }}
                          className="text-xs font-bold"
                        >
                          <Edit className="size-4 mr-2" /> Editar Permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={resetPasswordLoadingId === user.id}
                          onClick={() => handleResetPassword(user.id, user.email)}
                          className="text-xs font-bold"
                        >
                          {resetPasswordLoadingId === user.id
                            ? <Loader2 className="size-4 mr-2 animate-spin" />
                            : <Key className="size-4 mr-2" />
                          }
                          Resetar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className="text-xs font-bold"
                        >
                          <Shield className="size-4 mr-2" /> {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
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

      {/* Edit Permissions Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) { setEditUser(null); setEditError(null); } }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Empresa</label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={editData.company_id}
                onChange={(e) => setEditData({ ...editData, company_id: e.target.value })}
              >
                <option value="">Sem empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Papel (Role)</label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              >
                <option value="user">Usuário Comum</option>
                <option value="admin">Administrador da Empresa</option>
                <option value="platform_admin">Super Admin da Plataforma</option>
              </select>
            </div>
          </div>
          {editError && (
            <p className="text-xs text-red-600 font-bold px-1 -mt-2">{editError}</p>
          )}
          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => { setEditUser(null); setEditError(null); }}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              disabled={editLoading}
              onClick={async () => {
                if (!editUser) return;
                setEditError(null);
                setEditLoading(true);
                try {
                  const res = await fetch('/api/admin/users/update-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: editUser.id,
                      role: editData.role,
                      company_id: editData.company_id || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setEditError(json.error || 'Erro ao salvar permissões.');
                    return;
                  }
                  toast.success('Permissões atualizadas com sucesso!');
                  setEditUser(null);
                  await loadUsers();
                } catch {
                  setEditError('Erro de conexão. Tente novamente.');
                } finally {
                  setEditLoading(false);
                }
              }}
              className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {editLoading && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      {/* Company Detail Modal */}
      <Dialog open={!!companyDetailUser} onOpenChange={(open) => { if (!open) { setCompanyDetailUser(null); setCompanyDetail(null); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-[#0f49bd]" />
              Detalhes da Empresa
            </DialogTitle>
            <DialogDescription>
              {companyDetailUser?.company?.name || companyDetailUser?.email}
            </DialogDescription>
          </DialogHeader>

          {companyDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-7 text-[#0f49bd] animate-spin" />
            </div>
          ) : companyDetailError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              {companyDetailError}
            </div>
          ) : companyDetail ? (
            <div className="space-y-5 py-2">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Status da Empresa</p>
                  <span className={cn(
                    'text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide',
                    companyDetail.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}>
                    {companyDetail.status === 'active' ? 'Ativa' : 'Suspensa'}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Assinatura</p>
                  <span className={cn(
                    'text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide',
                    companyDetail.subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    companyDetail.subscription?.status === 'trial' ? 'bg-amber-50 text-amber-700' :
                    companyDetail.subscription?.status === 'past_due' ? 'bg-orange-50 text-orange-700' :
                    'bg-red-50 text-red-700'
                  )}>
                    {companyDetail.subscription?.status ?? 'Sem assinatura'}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Emails Usados (mês)</p>
                  <p className="text-lg font-black text-gray-900">
                    {(companyDetail.emails_used_this_month ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Trial até</p>
                  <p className="text-sm font-bold text-gray-700">
                    {companyDetail.trial_ends_at
                      ? new Date(companyDetail.trial_ends_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Plan selector */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <CreditCard className="size-4 text-gray-400" />
                  Plano atual
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd] font-medium text-gray-700"
                  >
                    <option value="">Sem plano</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R${p.price_monthly?.toLocaleString('pt-BR')}/mês
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={planUpdateLoading || selectedPlanId === (companyDetail.plan_id ?? '')}
                    onClick={async () => {
                      setPlanUpdateLoading(true);
                      try {
                        const res = await fetch('/api/admin/companies/update-plan', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ company_id: companyDetail.id, plan_id: selectedPlanId }),
                        });
                        const json = await res.json();
                        if (!res.ok) { toast.error(json.error || 'Erro ao atualizar plano.'); return; }
                        toast.success(`Plano atualizado para ${json.plan_name}!`);
                        setCompanyDetail({ ...companyDetail, plan_id: selectedPlanId });
                      } catch {
                        toast.error('Erro de conexão.');
                      } finally {
                        setPlanUpdateLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#0f49bd] text-white rounded-lg text-sm font-bold hover:bg-[#0a3690] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {planUpdateLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </div>

              {/* Suspend / Reactivate */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  disabled={suspendLoading}
                  onClick={async () => {
                    setSuspendLoading(true);
                    try {
                      const newStatus = companyDetail.status === 'active' ? 'suspended' : 'active';
                      await updateCompanyAction(companyDetail.id, { status: newStatus });
                      setCompanyDetail({ ...companyDetail, status: newStatus });
                      toast.success(newStatus === 'suspended' ? 'Empresa suspensa.' : 'Empresa reativada.');
                    } catch {
                      toast.error('Erro ao atualizar status.');
                    } finally {
                      setSuspendLoading(false);
                    }
                  }}
                  className={cn(
                    'w-full py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                    companyDetail.status === 'active'
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  )}
                >
                  {suspendLoading && <Loader2 className="size-4 animate-spin" />}
                  {companyDetail.status === 'active' ? 'Suspender Empresa' : 'Reativar Empresa'}
                </button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => { setCompanyDetailUser(null); setCompanyDetail(null); }}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) setCreateError(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Criar Usuário</DialogTitle>
            <DialogDescription>
              Crie um usuário com acesso imediato (sem precisar de convite por e-mail).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nome completo <span className="font-normal text-gray-400">(opcional)</span></label>
              <input
                className="w-full px-3 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="João da Silva"
                value={createData.full_name}
                onChange={(e) => setCreateData({ ...createData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input
                  type="email"
                  className="w-full pl-9 pr-3 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                  placeholder="usuario@empresa.com.br"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Senha</label>
              <input
                type="password"
                className="w-full px-3 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Mínimo 8 caracteres"
                value={createData.password}
                onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Confirmar senha</label>
              <input
                type="password"
                className="w-full px-3 h-10 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                placeholder="Repita a senha"
                value={createData.confirm_password}
                onChange={(e) => setCreateData({ ...createData, confirm_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Empresa</label>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f49bd]/20 focus:border-[#0f49bd]"
                value={createData.company_id}
                onChange={(e) => setCreateData({ ...createData, company_id: e.target.value })}
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
                value={createData.role}
                onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
              >
                <option value="user">Usuário Comum</option>
                <option value="admin">Administrador da Empresa</option>
                <option value="platform_admin">Super Admin da Plataforma</option>
              </select>
            </div>
          </div>
          {createError && (
            <p className="text-xs text-red-600 font-bold px-1 -mt-2">{createError}</p>
          )}
          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => { setIsCreateModalOpen(false); setCreateError(null); }}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              disabled={createLoading}
              onClick={async () => {
                setCreateError(null);
                if (createData.password.length < 8) {
                  setCreateError('A senha deve ter no mínimo 8 caracteres.');
                  return;
                }
                if (createData.password !== createData.confirm_password) {
                  setCreateError('As senhas não coincidem.');
                  return;
                }
                setCreateLoading(true);
                try {
                  const res = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: createData.email,
                      password: createData.password,
                      company_id: createData.company_id,
                      role: createData.role,
                      full_name: createData.full_name || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    setCreateError(json.error || 'Erro ao criar usuário.');
                    return;
                  }
                  toast.success('Usuário criado com sucesso!');
                  setIsCreateModalOpen(false);
                  setCreateData({ full_name: '', email: '', password: '', confirm_password: '', company_id: '', role: 'user' });
                  await loadUsers();
                } catch {
                  setCreateError('Erro de conexão. Tente novamente.');
                } finally {
                  setCreateLoading(false);
                }
              }}
              className="bg-[#0f49bd] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0a3690] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createLoading && <Loader2 className="size-4 animate-spin" />}
              Criar Usuário
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
