'use client';

/**
 * Página de wizard da campanha de e-mail.
 *
 * Migrações necessárias no Supabase (SQL Editor):
 *
 *   ALTER TABLE email_campaigns
 *     ADD COLUMN IF NOT EXISTS subject          TEXT,
 *     ADD COLUMN IF NOT EXISTS preheader        TEXT,
 *     ADD COLUMN IF NOT EXISTS html_content     TEXT,
 *     ADD COLUMN IF NOT EXISTS text_content     TEXT,
 *     ADD COLUMN IF NOT EXISTS audience_filters JSONB;
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LimitReachedModal from '@/components/email/LimitReachedModal';
import RichEmailEditor from '@/components/email/RichEmailEditor';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  AlertTriangle,
  AlignLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Save,
  Search,
  Server,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AudienceFilters = {
  state: string;
  municipalityId: string;
  populationRange: string;
  department: string;
  strategic: 'all' | 'yes' | 'no';
  minScore: string;
  emailSearch: string;
  totalCount: number;
};

type Campaign = {
  id: string;
  company_id: string;
  name: string;
  objective: string;
  status: string;
  description: string | null;
  subject: string | null;
  preheader: string | null;
  html_content: string | null;
  text_content: string | null;
  audience_filters: AudienceFilters | null;
  sending_account_id: string | null;
  sent_at: string | null;
  sent_count: number | null;
  failed_count: number | null;
};

type EmailForm = {
  subject: string;
  preheader: string;
  html_content: string;
  text_content: string;
};

type EditorTab = 'html' | 'preview' | 'text';

type MunicipalityOption = {
  id: string;
  city: string;
  state: string;
  label: string;
};

type SendingAccount = {
  id: string;
  name: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string | null;
  hourly_limit: number;
  daily_limit: number;
  is_active: boolean;
  last_test_status: string | null;
};

type SendResult = {
  sent: number;
  failed: number;
  total: number;
  truncated: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'E-mail' },
  { id: 2, label: 'Audiência' },
  { id: 3, label: 'Resumo' },
  { id: 4, label: 'Enviar' },
] as const;

const DEFAULT_AUDIENCE: AudienceFilters = {
  state: '',
  municipalityId: '',
  populationRange: '',
  department: '',
  strategic: 'all',
  minScore: '',
  emailSearch: '',
  totalCount: 0,
};

const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

const DEPARTMENT_OPTIONS = [
  'Saúde',
  'Educação',
  'Compras / Licitação',
  'Administração',
  'Financeiro',
];

const POPULATION_ORDER = [
  'Menor que 15.000',
  'Entre 15.001 e 30.000',
  'Entre 30.001 e 50.000',
  'Entre 50.001 e 100.000',
  'Entre 100.001 e 200.000',
  'Entre 200.001 e 300.000',
  'Entre 300.001 e 500.000',
  'Entre 500.001 e 1.000.000',
  'Maior que Um Milhão',
];

const HTML_PLACEHOLDER = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; }
    h1 { font-size: 22px; color: #0f172a; }
    p { font-size: 15px; line-height: 1.6; color: #475569; }
    .cta { display:inline-block; margin-top:24px; padding:12px 24px; background:#0f49bd; color:#fff; text-decoration:none; border-radius:6px; font-weight:600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Olá, [Nome]!</h1>
    <p>Escreva o conteúdo do seu e-mail aqui.</p>
    <a class="cta" href="#">Saiba mais</a>
  </div>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-[#0f49bd] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? <Check className="size-3.5" /> : step.id}
              </div>
              <span className={`text-sm font-medium ${
                active ? 'text-[#0f49bd]' : done ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`mx-4 h-px w-12 shrink-0 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Email editor
// ─────────────────────────────────────────────────────────────────────────────

function EmailEditorStep({ form, onChange }: { form: EmailForm; onChange: (f: EmailForm) => void }) {
  const [tab, setTab] = useState<EditorTab>('preview');
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/email/generate-content', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao gerar conteúdo com IA.');
        return;
      }
      onChange({ ...form, html_content: data.html });
      setTab('html');
      toast.success('Conteúdo gerado com sucesso!');
    } catch {
      toast.error('Erro ao conectar com a IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (tab !== 'preview') return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(
      form.html_content ||
        '<p style="font-family:sans-serif;color:#94a3b8;padding:24px">Nenhum HTML para pré-visualizar.</p>',
    );
    doc.close();
  }, [tab, form.html_content]);

  const set = (key: keyof EmailForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [key]: e.target.value });

  const tabBtn = (id: EditorTab, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Subject + preheader */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Informações do e-mail
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Assunto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={set('subject')}
              placeholder="Ex.: Como reduzir custos em licitações públicas"
              maxLength={150}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{form.subject.length}/150</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Preheader{' '}
              <span className="font-normal text-slate-400">(prévia exibida no cliente de e-mail)</span>
            </label>
            <input
              type="text"
              value={form.preheader}
              onChange={set('preheader')}
              placeholder="Ex.: Descubra como nossos clientes economizam até 30%..."
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{form.preheader.length}/200</p>
          </div>
        </div>
      </div>

      {/* HTML / Preview / Text */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Conteúdo do e-mail
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {isGenerating ? 'Gerando…' : 'Gerar com IA'}
            </button>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {tabBtn('html', <Code className="size-3.5" />, 'HTML')}
              {tabBtn('preview', <Eye className="size-3.5" />, 'Prévia')}
              {tabBtn('text', <AlignLeft className="size-3.5" />, 'Texto simples')}
            </div>
          </div>
        </div>

        {tab === 'html' && (
          <div className="p-4">
            <RichEmailEditor
              value={form.html_content}
              onChange={(html) => onChange({ ...form, html_content: html })}
              onSwitchToText={() => setTab('text')}
            />
          </div>
        )}

        {tab === 'preview' && (
          <div className="p-4">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Assunto: </span>
                  {form.subject || <span className="italic text-slate-400">(sem assunto)</span>}
                </p>
                {form.preheader && (
                  <p className="mt-0.5 text-xs text-slate-400">{form.preheader}</p>
                )}
              </div>
              <iframe
                ref={iframeRef}
                title="Prévia do e-mail"
                sandbox="allow-same-origin"
                className="h-[480px] w-full border-0"
              />
            </div>
          </div>
        )}

        {tab === 'text' && (
          <div className="p-4">
            <p className="mb-2 text-xs text-slate-500">
              Versão em texto simples para clientes de e-mail que não suportam HTML.
            </p>
            <textarea
              value={form.text_content}
              onChange={set('text_content')}
              placeholder={'Olá [Nome],\n\nEscreva a versão em texto simples aqui.\n\nAtenciosamente,\nSua equipe'}
              rows={18}
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-[#0f49bd]" />
          <p className="text-xs leading-relaxed text-blue-800">
            <span className="font-semibold">Variáveis disponíveis: </span>
            <code className="rounded bg-blue-100 px-1">[Nome]</code>,{' '}
            <code className="rounded bg-blue-100 px-1">[Municipio]</code>,{' '}
            <code className="rounded bg-blue-100 px-1">[Estado]</code> — substituídas no momento do envio.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Audience selector
// ─────────────────────────────────────────────────────────────────────────────

function AudienceStep({
  filters,
  onChange,
}: {
  filters: AudienceFilters;
  onChange: (f: AudienceFilters) => void;
}) {
  const supabase = createClient();

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingCount, setLoadingCount] = useState(false);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [populationRanges, setPopulationRanges] = useState<string[]>([]);

  // Load dropdown options once
  useEffect(() => {
    (async () => {
      try {
        setLoadingFilters(true);
        const [{ data: munData }, { data: popData }] = await Promise.all([
          supabase
            .from('municipalities')
            .select('id, city, state')
            .order('city', { ascending: true }),
          supabase
            .from('municipalities')
            .select('population_range')
            .not('population_range', 'is', null),
        ]);

        setMunicipalities(
          (munData || []).map((m) => ({
            id: m.id,
            city: m.city || '',
            state: m.state || '',
            label: `${m.city || 'Sem cidade'} - ${m.state || ''}`,
          })),
        );

        const unique = Array.from(
          new Set((popData || []).map((r: any) => r.population_range).filter(Boolean)),
        ) as string[];

        setPopulationRanges(
          [...unique].sort((a, b) => {
            const ia = POPULATION_ORDER.indexOf(a);
            const ib = POPULATION_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b, 'pt-BR');
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          }),
        );
      } catch (err) {
        console.error('Erro ao carregar opções de audiência:', err);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch count whenever filters change
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingCount(true);
        const params = new URLSearchParams();
        if (filters.state) params.set('state', filters.state);
        if (filters.municipalityId) params.set('municipalityId', filters.municipalityId);
        if (filters.populationRange) params.set('populationRange', filters.populationRange);
        if (filters.department) params.set('department', filters.department);
        params.set('strategic', filters.strategic);
        if (filters.minScore.trim()) params.set('minScore', filters.minScore.trim());
        if (filters.emailSearch.trim()) params.set('emailSearch', filters.emailSearch.trim());
        params.set('page', '1');
        params.set('pageSize', '1');

        const res = await fetch(`/api/email/audiences/preview?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        onChange({ ...filters, totalCount: json.total ?? 0 });
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Erro ao contar audiência:', err);
      } finally {
        setLoadingCount(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.state,
    filters.municipalityId,
    filters.populationRange,
    filters.department,
    filters.strategic,
    filters.minScore,
    filters.emailSearch,
  ]);

  const filteredMunicipalities = useMemo(
    () =>
      filters.state
        ? municipalities.filter((m) => m.state === filters.state)
        : municipalities,
    [municipalities, filters.state],
  );

  const set = <K extends keyof AudienceFilters>(key: K, value: AudienceFilters[K]) => {
    const next = { ...filters, [key]: value };
    // clear municipalityId when state changes
    if (key === 'state') next.municipalityId = '';
    onChange(next);
  };

  const clear = () => onChange({ ...DEFAULT_AUDIENCE, totalCount: filters.totalCount });

  const labelClass = 'text-sm font-medium text-slate-700';
  const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-50';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtros da audiência</h2>
            <p className="text-sm text-slate-500">
              Segmente a base de e-mails para esta campanha.
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            Limpar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Estado</label>
            <select
              value={filters.state}
              onChange={(e) => set('state', e.target.value)}
              disabled={loadingFilters}
              className={selectClass}
            >
              <option value="">Todos os estados</option>
              {BRAZILIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Município</label>
            <select
              value={filters.municipalityId}
              onChange={(e) => set('municipalityId', e.target.value)}
              disabled={loadingFilters}
              className={selectClass}
            >
              <option value="">Todos os municípios</option>
              {filteredMunicipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Faixa populacional</label>
            <select
              value={filters.populationRange}
              onChange={(e) => set('populationRange', e.target.value)}
              disabled={loadingFilters}
              className={selectClass}
            >
              <option value="">Todas as faixas</option>
              {populationRanges.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Departamento</label>
            <select
              value={filters.department}
              onChange={(e) => set('department', e.target.value)}
              className={selectClass}
            >
              <option value="">Todos os departamentos</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Estratégico</label>
            <select
              value={filters.strategic}
              onChange={(e) => set('strategic', e.target.value as AudienceFilters['strategic'])}
              className={selectClass}
            >
              <option value="all">Todos</option>
              <option value="yes">Somente estratégicos</option>
              <option value="no">Somente não estratégicos</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Score mínimo</label>
            <input
              type="number"
              min="0"
              value={filters.minScore}
              onChange={(e) => set('minScore', e.target.value)}
              placeholder="Ex.: 20"
              className={selectClass}
            />
          </div>

          <div className="flex flex-col gap-2 xl:col-span-2">
            <label className={labelClass}>Buscar no e-mail</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.emailSearch}
                onChange={(e) => set('emailSearch', e.target.value)}
                placeholder="Ex.: saude, adm, compras"
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Count summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Users className="size-7 text-[#0f49bd]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">
              E-mails disponíveis com esta segmentação
            </p>
            {loadingCount ? (
              <p className="mt-1 text-sm text-slate-400">Calculando...</p>
            ) : (
              <p className="mt-1 text-3xl font-bold text-[#0f172a]">
                {filters.totalCount.toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {filters.totalCount === 0 && !loadingCount && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhum e-mail encontrado com os filtros atuais. Ajuste os filtros para continuar.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Summary
// ─────────────────────────────────────────────────────────────────────────────

type SummaryProps = {
  campaign: Campaign;
  emailForm: EmailForm;
  audienceFilters: AudienceFilters;
};

function SummaryStep({ campaign, emailForm, audienceFilters }: SummaryProps) {
  const hasSubject = emailForm.subject.trim().length > 0;
  const hasHtml = emailForm.html_content.trim().length > 0;
  const hasText = emailForm.text_content.trim().length > 0;
  const hasAudience = audienceFilters.totalCount > 0;
  const isReady = hasSubject && (hasHtml || hasText) && hasAudience;

  // Build active audience filter tags
  const audienceTags: string[] = [];
  if (audienceFilters.state) audienceTags.push(`Estado: ${audienceFilters.state}`);
  if (audienceFilters.municipalityId) audienceTags.push('1 município específico');
  if (audienceFilters.populationRange) audienceTags.push(`Pop.: ${audienceFilters.populationRange}`);
  if (audienceFilters.department) audienceTags.push(`Depto.: ${audienceFilters.department}`);
  if (audienceFilters.strategic === 'yes') audienceTags.push('Somente estratégicos');
  if (audienceFilters.strategic === 'no') audienceTags.push('Somente não estratégicos');
  if (audienceFilters.minScore.trim()) audienceTags.push(`Score ≥ ${audienceFilters.minScore}`);
  if (audienceFilters.emailSearch.trim()) audienceTags.push(`Contém "${audienceFilters.emailSearch.trim()}"`);

  const objectiveLabel: Record<string, string> = {
    Prospecção: 'Prospecção',
    Relacionamento: 'Relacionamento',
    'Apresentação comercial': 'Apresentação comercial',
    'Follow-up': 'Follow-up',
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">

      {/* ── Validation banner ───────────────────────────────────────────── */}
      {isReady ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-4 text-white" />
          </div>
          <p className="text-sm font-medium text-emerald-800">
            Tudo pronto! Revise os dados abaixo e clique em <strong>Continuar</strong> para ir ao envio.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Atenção: campos obrigatórios incompletos</p>
            <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
              {!hasSubject && <li>Assunto do e-mail não preenchido</li>}
              {!hasHtml && <li>Conteúdo HTML do e-mail ausente</li>}
              {!hasAudience && <li>Audiência com 0 destinatários</li>}
            </ul>
          </div>
        </div>
      )}

      {/* ── Campaign info ────────────────────────────────────────────────── */}
      <SummaryCard title="Campanha" icon={<Mail className="size-4 text-[#0f49bd]" />}>
        <Row label="Nome" value={campaign.name} />
        <Row label="Objetivo" value={objectiveLabel[campaign.objective] ?? campaign.objective} />
        <Row label="Status" value={campaign.status} badge />
        {campaign.description && <Row label="Descrição" value={campaign.description} />}
      </SummaryCard>

      {/* ── Email content ────────────────────────────────────────────────── */}
      <SummaryCard title="E-mail" icon={<FileText className="size-4 text-[#0f49bd]" />}>
        <CheckRow label="Assunto" ok={hasSubject} detail={emailForm.subject || '—'} />
        {emailForm.preheader && <Row label="Preheader" value={emailForm.preheader} />}
        <CheckRow label="HTML" ok={hasHtml} detail={
          hasHtml
            ? `${emailForm.html_content.split('\n').length} linhas`
            : 'Não adicionado'
        } />
        <CheckRow
          label="Texto simples"
          ok={hasText}
          warn={!hasText}
          detail={hasText ? `${emailForm.text_content.split('\n').length} linhas` : 'Não adicionado (recomendado)'}
        />
      </SummaryCard>

      {/* ── Audience ─────────────────────────────────────────────────────── */}
      <SummaryCard title="Audiência" icon={<Users className="size-4 text-[#0f49bd]" />}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#0f172a]">
            {audienceFilters.totalCount.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm text-slate-500">destinatários</span>
        </div>

        {audienceTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {audienceTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Sem filtros aplicados — toda a base será usada.</p>
        )}

        {!hasAudience && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <X className="size-3.5" /> Nenhum destinatário encontrado. Volte e ajuste os filtros.
          </p>
        )}
      </SummaryCard>
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">{icon}</div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
      {badge ? (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
          value === 'Ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {value}
        </span>
      ) : (
        <span className="text-sm font-medium text-slate-900">{value}</span>
      )}
    </div>
  );
}

function CheckRow({
  label,
  ok,
  warn,
  detail,
}: {
  label: string;
  ok: boolean;
  warn?: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        {ok ? (
          <Check className="size-4 shrink-0 text-emerald-500" />
        ) : warn ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
        ) : (
          <X className="size-4 shrink-0 text-red-500" />
        )}
        <span className={`text-sm ${ok ? 'text-slate-900' : warn ? 'text-amber-700' : 'text-red-600'}`}>
          {detail}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Send
// ─────────────────────────────────────────────────────────────────────────────

function SendStep({
  audienceCount,
  selectedAccountId,
  onAccountChange,
  confirmed,
  onConfirmChange,
  sendLimit,
  onSendLimitChange,
}: {
  audienceCount: number;
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  confirmed: boolean;
  onConfirmChange: (v: boolean) => void;
  sendLimit: number;
  onSendLimitChange: (v: number) => void;
}) {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetch('/api/email/sending-accounts')
      .then((r) => r.json())
      .then((json) => setAccounts(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoadingAccounts(false));
  }, []);

  const selected = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const willTruncate = selected !== null && audienceCount > selected.hourly_limit;
  const effectiveCount = selected ? Math.min(audienceCount, selected.hourly_limit) : audienceCount;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">

      {/* Account selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
            <Server className="size-4 text-[#0f49bd]" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Conta de envio
          </h3>
        </div>

        {loadingAccounts ? (
          <p className="text-sm text-slate-400">Carregando contas...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhuma conta de envio cadastrada.{' '}
            <a href="/email/accounts" className="font-medium underline">
              Adicionar conta
            </a>
          </div>
        ) : (
          <select
            value={selectedAccountId}
            onChange={(e) => onAccountChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
          >
            <option value="">Selecionar conta de envio...</option>
            {accounts.filter((a) => a.is_active).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.sender_email}
              </option>
            ))}
          </select>
        )}

        {/* Account detail card */}
        {selected && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Remetente</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{selected.sender_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">E-mail</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-900">{selected.sender_email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Limite/hora</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {selected.hourly_limit.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Limite/dia</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {selected.daily_limit.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Truncation warning */}
      {audienceCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            Sua campanha será enviada em lotes de 100 e-mails por hora até atingir todos os{' '}
            <strong>{audienceCount.toLocaleString('pt-BR')}</strong> destinatários.
          </p>
        </div>
      )}

      {/* Send limit selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
            <Users className="size-4 text-[#0f49bd]" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quantos e-mails deseja enviar?
          </h3>
        </div>
        <input
          type="number"
          min={1}
          max={audienceCount}
          step={1}
          value={sendLimit}
          onChange={(e) => {
            const val = Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), audienceCount);
            onSendLimitChange(val);
          }}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {[25, 50, 75, 100].map((pct) => {
            const val = Math.max(1, Math.round(audienceCount * pct / 100));
            return (
              <button
                key={pct}
                type="button"
                onClick={() => onSendLimitChange(val)}
                className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {pct}%
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Você tem <strong>{audienceCount.toLocaleString('pt-BR')}</strong> e-mails na audiência. Selecione quantos deseja usar neste disparo.
        </p>
      </div>

      {/* Dispatch summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
            <Zap className="size-4 text-[#0f49bd]" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumo do disparo</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[#0f172a]">
            {sendLimit.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm text-slate-500">destinatários no total</span>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 size-4 accent-[#0f49bd]"
        />
        <span className="text-sm text-slate-700">
          Confirmo o envio de{' '}
          <strong>{sendLimit.toLocaleString('pt-BR')} e-mails</strong>
          {selected ? ` via conta "${selected.name}"` : ''}.
          Esta ação não pode ser desfeita.
        </span>
      </label>
    </div>
  );
}

function SendResultScreen({
  result,
  campaignName,
  onGoBack,
}: {
  result: SendResult;
  campaignName: string;
  onGoBack: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="size-10 text-emerald-500" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-slate-900">Campanha disparada!</h2>
      <p className="mt-2 text-sm text-slate-500">
        <strong>{campaignName}</strong> foi enviada com sucesso.
      </p>

      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Enviados</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {result.sent.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className={`rounded-xl border p-5 ${
          result.failed > 0
            ? 'border-red-200 bg-red-50'
            : 'border-slate-200 bg-slate-50'
        }`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${
            result.failed > 0 ? 'text-red-600' : 'text-slate-500'
          }`}>Falhas</p>
          <p className={`mt-2 text-3xl font-bold ${
            result.failed > 0 ? 'text-red-700' : 'text-slate-400'
          }`}>
            {result.failed.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {result.truncated && (
        <p className="mt-4 text-xs text-amber-700">
          O envio foi limitado pelo limite horário da conta. Os demais destinatários podem ser alcançados em um próximo disparo.
        </p>
      )}

      <button
        type="button"
        onClick={onGoBack}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
      >
        <ChevronLeft className="size-4" />
        Voltar às Campanhas
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unused placeholder (kept for forward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-slate-100">
        <Mail className="size-8 text-slate-400" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const campaignId = params.id as string;
  const isNew = campaignId === 'new';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [emailForm, setEmailForm] = useState<EmailForm>({
    subject: '',
    preheader: '',
    html_content: '',
    text_content: '',
  });

  const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>(DEFAULT_AUDIENCE);

  // Step 4 state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendLimit, setSendLimit] = useState(audienceFilters.totalCount);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitData, setLimitData] = useState({ emails_used: 0, emails_limit: 10000 });

  useEffect(() => {
    setSendLimit(audienceFilters.totalCount);
  }, [audienceFilters.totalCount]);

  // ── Load campaign ──────────────────────────────────────────────────────────
  useEffect(() => {
    // id === 'new': não buscar no banco — apenas inicializar com query params do template
    if (isNew) {
      const rawBody = searchParams.get('template_body') ?? '';
      const htmlBody = rawBody
        ? `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    ${rawBody.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('\n    ')}
  </div>
</body>
</html>`
        : '';
      setEmailForm({
        subject: searchParams.get('template_subject') ?? '',
        preheader: '',
        html_content: htmlBody,
        text_content: rawBody,
      });
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('email_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (error) throw error;

        const c = data as Campaign;
        setCampaign(c);
        setEmailForm({
          subject: c.subject ?? '',
          preheader: c.preheader ?? '',
          html_content: c.html_content ?? '',
          text_content: c.text_content ?? '',
        });
        if (c.audience_filters) {
          setAudienceFilters({ ...DEFAULT_AUDIENCE, ...c.audience_filters });
        }
      } catch (err) {
        console.error('Erro ao carregar campanha:', err);
        toast.error('Erro ao carregar campanha.');
        router.push('/email/campaigns');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save helpers ───────────────────────────────────────────────────────────
  const saveEmailStep = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!emailForm.subject.trim()) {
        if (!silent) toast.error('Preencha o assunto do e-mail.');
        return false;
      }
      try {
        setIsSaving(true);
        const { error } = await supabase
          .from('email_campaigns')
          .update({
            subject: emailForm.subject.trim(),
            preheader: emailForm.preheader.trim() || null,
            html_content: emailForm.html_content || null,
            text_content: emailForm.text_content || null,
          })
          .eq('id', campaignId);

        if (error) throw error;
        if (!silent) toast.success('Rascunho salvo.');
        return true;
      } catch (err) {
        console.error('Erro ao salvar e-mail:', err);
        if (!silent) toast.error('Erro ao salvar rascunho.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [campaignId, emailForm, supabase],
  );

  const saveAudienceStep = useCallback(
    async (): Promise<boolean> => {
      if (audienceFilters.totalCount === 0) {
        toast.error('A audiência está vazia. Ajuste os filtros antes de continuar.');
        return false;
      }
      try {
        setIsSaving(true);
        const { error } = await supabase
          .from('email_campaigns')
          .update({ audience_filters: audienceFilters })
          .eq('id', campaignId);

        if (error) throw error;
        toast.success('Audiência salva.');
        return true;
      } catch (err) {
        console.error('Erro ao salvar audiência:', err);
        toast.error('Erro ao salvar audiência.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [campaignId, audienceFilters, supabase],
  );

  // ── Send campaign ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta de envio.');
      return;
    }
    if (!sendConfirmed) {
      toast.error('Confirme o envio antes de disparar.');
      return;
    }
    try {
      setIsSending(true);
      const res = await fetch(`/api/email/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sending_account_id: selectedAccountId, send_limit: sendLimit }),
      });
      const json = await res.json();
      if (res.status === 402 && json.error === 'limit_reached') {
        setLimitData({ emails_used: json.emails_used, emails_limit: json.emails_limit });
        setLimitModalOpen(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar campanha.');
      setSendResult(json as SendResult);
      toast.success(`Campanha enviada! ${json.sent} e-mails disparados.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar campanha.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Send test ──────────────────────────────────────────────────────────────
  const handleSendTest = async () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta de envio antes de enviar o teste.');
      return;
    }
    try {
      setIsSendingTest(true);
      const res = await fetch(`/api/email/campaigns/${campaignId}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sending_account_id: selectedAccountId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar teste.');
      toast.success(`E-mail de teste enviado para ${json.sent_to}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de teste.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const summaryIsReady =
    emailForm.subject.trim().length > 0 &&
    (emailForm.html_content.trim().length > 0 || emailForm.text_content.trim().length > 0) &&
    audienceFilters.totalCount > 0;

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (await saveEmailStep(false)) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (await saveAudienceStep()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!summaryIsReady) {
        toast.error('Corrija os itens pendentes antes de avançar para o envio.');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      await handleSend();
    }
  };

  const handleBack = () => {
    if (currentStep === 1) router.push('/email/campaigns');
    else setCurrentStep((s) => s - 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f8fafc]">
        <p className="text-sm text-slate-500">Carregando campanha...</p>
      </div>
    );
  }

  if (!campaign && !isNew) return null;

  return (
    <div className="flex min-h-full flex-col bg-[#f8fafc]">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/email/campaigns')}
            className="text-slate-500 transition hover:text-slate-700"
          >
            Campanhas
          </button>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="font-medium text-slate-900 line-clamp-1">{campaign?.name ?? 'Nova Campanha'}</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 overflow-x-auto">
        <Stepper current={currentStep} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {currentStep === 1 && (
          <EmailEditorStep form={emailForm} onChange={setEmailForm} />
        )}
        {currentStep === 2 && (
          <AudienceStep filters={audienceFilters} onChange={setAudienceFilters} />
        )}
        {currentStep === 3 && campaign && (
          <SummaryStep
            campaign={campaign}
            emailForm={emailForm}
            audienceFilters={audienceFilters}
          />
        )}
        {currentStep === 4 && !sendResult && (
          <SendStep
            audienceCount={audienceFilters.totalCount}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            confirmed={sendConfirmed}
            onConfirmChange={setSendConfirmed}
            sendLimit={sendLimit}
            onSendLimitChange={setSendLimit}
          />
        )}
        {currentStep === 4 && sendResult && (
          <SendResultScreen
            result={sendResult}
            campaignName={campaign?.name ?? 'Nova Campanha'}
            onGoBack={() => router.push('/email/campaigns')}
          />
        )}
      </div>

      {/* Footer — hidden after successful send */}
      {!sendResult && (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <ChevronLeft className="size-4" />
              {currentStep === 1 ? 'Voltar às Campanhas' : 'Anterior'}
            </button>

            <div className="flex items-center gap-3">
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => saveEmailStep(false)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Save className="size-4" />
                  {isSaving ? 'Salvando...' : 'Salvar rascunho'}
                </button>
              )}

              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSendingTest || isSending || !selectedAccountId}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Mail className="size-4" />
                  {isSendingTest ? 'Enviando...' : 'Enviar teste'}
                </button>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  isSaving ||
                  isSending ||
                  (currentStep === 2 && audienceFilters.totalCount === 0) ||
                  (currentStep === 3 && !summaryIsReady) ||
                  (currentStep === 4 && (!selectedAccountId || !sendConfirmed))
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {currentStep === STEPS.length ? (
                  isSending ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Zap className="size-4" />
                      Disparar Campanha
                    </>
                  )
                ) : (
                  <>
                    Continuar
                    <ChevronRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <LimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        emailsUsed={limitData.emails_used}
        emailsLimit={limitData.emails_limit}
      />
    </div>
  );
}
