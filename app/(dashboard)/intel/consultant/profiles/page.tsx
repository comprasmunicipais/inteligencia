'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/shared/Header';
import { useCompany } from '@/components/providers/CompanyProvider';
import {
  consultantProfilesService,
  ConsultantProfile,
} from '@/lib/services/consultant-profiles';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

// ── CNPJ mask & validation ──────────────────────────────────────────────────

function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isCnpjValid(value: string): boolean {
  return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ConsultantProfilesPage() {
  const { companyId } = useCompany();

  const [profiles, setProfiles] = useState<ConsultantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCnpj, setCreateCnpj] = useState('');
  const [creating, setCreating] = useState(false);

  // edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await consultantProfilesService.getProfiles(companyId);
      setProfiles(data);
    } catch {
      toast.error('Erro ao carregar perfis de consultoria.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!companyId) return;
    if (!createName.trim()) { toast.error('Nome é obrigatório.'); return; }
    if (!isCnpjValid(createCnpj)) { toast.error('CNPJ inválido. Use o formato 00.000.000/0000-00.'); return; }

    setCreating(true);
    try {
      const created = await consultantProfilesService.createProfile({
        company_id: companyId,
        name: createName.trim(),
        cnpj: createCnpj,
      });
      setProfiles([created, ...profiles]);
      setCreateName('');
      setCreateCnpj('');
      setShowCreate(false);
      toast.success('Perfil criado com sucesso.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.error('CNPJ já cadastrado para esta empresa.');
      } else {
        toast.error('Erro ao criar perfil.');
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (profile: ConsultantProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditCnpj(profile.cnpj);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCnpj('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) { toast.error('Nome é obrigatório.'); return; }
    if (!isCnpjValid(editCnpj)) { toast.error('CNPJ inválido. Use o formato 00.000.000/0000-00.'); return; }

    setSaving(true);
    try {
      const updated = await consultantProfilesService.updateProfile(editingId, {
        name: editName.trim(),
        cnpj: editCnpj,
      });
      setProfiles(profiles.map(p => p.id === editingId ? updated : p));
      cancelEdit();
      toast.success('Perfil atualizado.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        toast.error('CNPJ já cadastrado para esta empresa.');
      } else {
        toast.error('Erro ao salvar alterações.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (profile: ConsultantProfile) => {
    try {
      const updated = await consultantProfilesService.toggleActive(profile.id, !profile.is_active);
      setProfiles(profiles.map(p => p.id === profile.id ? updated : p));
      toast.success(updated.is_active ? 'Perfil ativado.' : 'Perfil desativado.');
    } catch {
      toast.error('Erro ao alterar status do perfil.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="size-8 text-[#0f49bd] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header
        title="Perfis de Consultoria"
        subtitle="Gerencie os perfis de clientes atendidos pela sua consultoria."
      />

      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">
              {profiles.length} {profiles.length === 1 ? 'perfil cadastrado' : 'perfis cadastrados'}
            </p>
            <button
              onClick={() => { setShowCreate(true); setEditingId(null); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0f49bd] text-white rounded-xl font-bold text-sm hover:bg-[#0a3690] transition-all shadow-md"
            >
              <Plus className="size-4" />
              Novo Perfil
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="bg-white border border-[#0f49bd]/20 rounded-2xl p-6 shadow-sm space-y-4">
              <p className="text-sm font-bold text-gray-900">Novo Perfil</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome *</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nome do perfil"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CNPJ *</label>
                  <input
                    type="text"
                    value={createCnpj}
                    onChange={e => setCreateCnpj(applyCnpjMask(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0f49bd] text-white rounded-lg font-bold text-sm hover:bg-[#0a3690] transition-all disabled:opacity-50"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Salvar
                </button>
                <button
                  onClick={() => { setShowCreate(false); setCreateName(''); setCreateCnpj(''); }}
                  className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  <X className="size-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {profiles.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Nenhum perfil cadastrado ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Clique em &quot;Novo Perfil&quot; para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                >
                  {editingId === profile.id ? (
                    // Edit row
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome *</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CNPJ *</label>
                          <input
                            type="text"
                            value={editCnpj}
                            onChange={e => setEditCnpj(applyCnpjMask(e.target.value))}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0f49bd]/20 outline-none font-medium text-gray-900 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2 bg-[#0f49bd] text-white rounded-lg font-bold text-sm hover:bg-[#0a3690] transition-all disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Salvar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all"
                        >
                          <X className="size-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View row
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{profile.name}</p>
                          <span className="text-xs text-gray-400 font-mono">{profile.cnpj}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {profile.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Criado em {formatDate(profile.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(profile)}
                          title={profile.is_active ? 'Desativar' : 'Ativar'}
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all"
                        >
                          {profile.is_active
                            ? <ToggleRight className="size-5 text-green-600" />
                            : <ToggleLeft className="size-5 text-gray-400" />}
                        </button>
                        <button
                          onClick={() => startEdit(profile)}
                          title="Editar"
                          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[#0f49bd] hover:border-[#0f49bd] transition-all"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
