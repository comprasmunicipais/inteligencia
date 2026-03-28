'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Layout, Pencil, Send, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type TemplateType = 'prospeccao' | 'relacionamento' | 'apresentacao' | 'followup';

interface EmailTemplate {
  id: string;
  company_id: string;
  type: TemplateType;
  subject: string;
  body: string;
  profile_hash: string;
  generated_at: string;
  updated_at: string;
}

const TYPE_META: Record<TemplateType, { label: string; badgeClass: string }> = {
  prospeccao:    { label: 'Prospecção',           badgeClass: 'badge-blue'   },
  relacionamento:{ label: 'Relacionamento',        badgeClass: 'badge-green'  },
  apresentacao:  { label: 'Apresentação Comercial',badgeClass: 'badge-purple' },
  followup:      { label: 'Follow-up',             badgeClass: 'badge-orange' },
};

const TYPE_ORDER: TemplateType[] = ['prospeccao', 'relacionamento', 'apresentacao', 'followup'];

function bodyPreview(body: string): string {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.slice(0, 3).join(' · ');
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/email/templates/generate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar templates.');
      setTemplates(json.templates as EmailTemplate[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openEdit = (tpl: EmailTemplate) => {
    setEditTarget(tpl);
    setEditSubject(tpl.subject);
    setEditBody(tpl.body);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditTarget(null);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('email_templates')
        .update({
          subject: editSubject.trim(),
          body: editBody.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editTarget.id);

      if (err) throw err;

      setTemplates(prev =>
        prev.map(t =>
          t.id === editTarget.id
            ? { ...t, subject: editSubject.trim(), body: editBody.trim() }
            : t
        )
      );
      toast.success('Template atualizado.');
      closeEdit();
    } catch {
      toast.error('Erro ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseCampaign = (tpl: EmailTemplate) => {
    const params = new URLSearchParams({
      template_subject: tpl.subject,
      template_body: tpl.body,
      template_type: tpl.type,
    });
    router.push(`/email/campaigns/new?${params.toString()}`);
  };

  const sortedTemplates = TYPE_ORDER
    .map(type => templates.find(t => t.type === type))
    .filter(Boolean) as EmailTemplate[];

  return (
    <>
      <style>{`
        .badge-blue   { background: rgba(37,99,235,0.1);  color: #2563eb; border: 1px solid rgba(37,99,235,0.2); }
        .badge-green  { background: rgba(16,185,129,0.1); color: #059669; border: 1px solid rgba(16,185,129,0.2); }
        .badge-purple { background: rgba(124,58,237,0.1); color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }
        .badge-orange { background: rgba(234,88,12,0.1);  color: #ea580c; border: 1px solid rgba(234,88,12,0.2); }

        .tpl-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s;
        }
        .tpl-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        .tpl-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          width: fit-content;
        }

        .tpl-subject {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.4;
        }

        .tpl-preview {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tpl-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 4px;
        }

        .btn-edit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #475569;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-edit:hover { background: #f8fafc; border-color: #cbd5e1; }

        .btn-campaign {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          background: #0f49bd;
          color: #fff;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-campaign:hover { background: #0a3690; }

        /* Skeleton */
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
        }
        .modal-box {
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .modal-close:hover { background: #f1f5f9; color: #64748b; }
        .field-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }
        .field-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .field-input:focus {
          border-color: #0f49bd;
          box-shadow: 0 0 0 3px rgba(15,73,189,0.1);
        }
        .field-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          resize: vertical;
          min-height: 220px;
          line-height: 1.6;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .field-textarea:focus {
          border-color: #0f49bd;
          box-shadow: 0 0 0 3px rgba(15,73,189,0.1);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-cancel {
          padding: 9px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-save {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          border: none;
          border-radius: 8px;
          background: #0f49bd;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-save:hover:not(:disabled) { background: #0a3690; }
        .btn-save:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div className="min-h-full bg-[#f8fafc] p-6">
        <div className="flex flex-col gap-6 max-w-5xl">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-[#0f172a]">Templates de E-mail</h1>
              <p className="text-sm text-slate-500">
                Gerados automaticamente com IA a partir do seu Perfil Comercial. Edite conforme necessário.
              </p>
            </div>
            {!loading && !error && templates.length > 0 && (
              <button
                onClick={loadTemplates}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw size={14} />
                Regenerar
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="tpl-card">
                  <div className="skeleton h-5 w-28" />
                  <div className="skeleton h-5 w-3/4" />
                  <div className="flex flex-col gap-2">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-5/6" />
                    <div className="skeleton h-3 w-4/6" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="skeleton h-8 w-20" />
                    <div className="skeleton h-8 w-36" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 px-6 py-14 text-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="size-7 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">{error}</p>
                <p className="text-xs text-red-500 mt-1">
                  Certifique-se de ter um Perfil Consolidado gerado em Perfil Estratégico.
                </p>
              </div>
              <button
                onClick={loadTemplates}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <RefreshCw size={14} /> Tentar novamente
              </button>
            </div>
          )}

          {/* Templates grid */}
          {!loading && !error && sortedTemplates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTemplates.map(tpl => {
                const meta = TYPE_META[tpl.type];
                return (
                  <div key={tpl.id} className="tpl-card">
                    <span className={`tpl-badge ${meta.badgeClass}`}>
                      <Layout size={10} />
                      {meta.label}
                    </span>
                    <p className="tpl-subject">{tpl.subject}</p>
                    <p className="tpl-preview">{bodyPreview(tpl.body)}</p>
                    <div className="tpl-actions">
                      <button className="btn-edit" onClick={() => openEdit(tpl)}>
                        <Pencil size={12} /> Editar
                      </button>
                      <button className="btn-campaign" onClick={() => handleUseCampaign(tpl)}>
                        <Send size={12} /> Usar em Campanha
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty (shouldn't normally appear) */}
          {!loading && !error && sortedTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
                <Layout className="size-8 text-[#0f49bd]" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhum template gerado</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Configure e consolide seu Perfil Estratégico para gerar templates automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && editTarget && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Editar — {TYPE_META[editTarget.type].label}
              </span>
              <button className="modal-close" onClick={closeEdit}>
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="field-label">Assunto</p>
              <input
                className="field-input"
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                placeholder="Assunto do e-mail"
              />
            </div>

            <div>
              <p className="field-label">Corpo do E-mail</p>
              <textarea
                className="field-textarea"
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                placeholder="Corpo do e-mail..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Use [Nome], [Municipio] e [Estado] como variáveis dinâmicas.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeEdit}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
