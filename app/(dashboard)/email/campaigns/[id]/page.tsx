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
import { useIsReadOnly } from '@/hooks/useIsReadOnly';
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
  Database,
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
  region: string;
  state: string;
  municipalityId: string;
  populationRange: string;
  department: string;
  strategic: 'all' | 'yes' | 'no';
  minScore: string;
  emailSearch: string;
  qualityGroups?: {
    green: boolean;
    yellow: boolean;
    white: boolean;
  };
  totalCount: number;
};

type AudienceSource = 'cm_pro' | 'customer_base';

type CustomerContactList = {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  contacts_count: number;
  valid_contacts_count: number;
  invalid_contacts_count: number;
  duplicate_contacts_count: number;
};

type CustomerContactListsResponse = {
  data?: CustomerContactList[];
  error?: string;
};

type CustomerBasePreviewContact = {
  email_normalized: string;
  company_name: string | null;
  name: string | null;
};

type CustomerBaseAudiencePreview = {
  list_id: string;
  list_name: string;
  total_contacts: number;
  valid_contacts: number;
  invalid_contacts: number;
  duplicate_contacts: number;
  eligible_contacts: number;
  not_checked_contacts?: number;
  sample_contacts?: CustomerBasePreviewContact[];
};

type CustomerBaseAudiencePreviewResponse = {
  data?: CustomerBaseAudiencePreview;
  error?: string;
};

type QualityGroups = {
  green: boolean;
  yellow: boolean;
  white: boolean;
};

type QualitySummary = {
  green: number;
  yellow: number;
  white: number;
};

type AudiencePreviewResponse = {
  total?: number;
  quality_summary?: Partial<QualitySummary>;
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
  audience_source: AudienceSource | null;
  customer_contact_list_id: string | null;
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
  spf_status: boolean | null;
  dkim_status: boolean | null;
};

type SendResult = {
  sent: number;
  failed: number;
  total: number;
  truncated: boolean;
};

type PrivateQueuePreparationResult = {
  created_jobs: number;
  skipped_duplicates: number;
  eligible_contacts: number;
  available_contacts: number;
  already_sent_contacts: number;
  requested_send_limit: number | null;
  applied_send_limit: number;
  total_contacts: number;
  message: string;
};

type PrivateQueueStats = {
  campaign_id: string;
  list_id: string;
  list_name: string;
  total_contacts: number;
  eligible_contacts: number;
  available_contacts: number;
  already_sent_contacts: number;
  sent_jobs: number;
  pending_jobs: number;
  active_job_contacts: number;
  processing_jobs: number;
  failed_jobs: number;
  skipped_jobs: number;
  retry_jobs: number;
  total_jobs: number;
  last_sent_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  last_failure_code: string | null;
  can_prepare_more: boolean;
  skipped_duplicates: number;
  has_active_jobs: boolean;
  message: string;
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
  region: '',
  state: '',
  municipalityId: '',
  populationRange: '',
  department: '',
  strategic: 'all',
  minScore: '',
  emailSearch: '',
  qualityGroups: {
    green: true,
    yellow: true,
    white: true,
  },
  totalCount: 0,
};

function normalizeQualityGroups(value?: Partial<QualityGroups> | null): QualityGroups {
  return {
    green: value?.green ?? true,
    yellow: value?.yellow ?? true,
    white: value?.white ?? true,
  };
}

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
  'Obras',
  'Prefeito',
  'Institucional',
  'Social',
  'Meio Ambiente',
  'Comunicacao',
  'Ouvidoria',
  'Planejamento',
  'RH',
  'TI',
  'Esporte e Cultura',
  'Juridico',
  'Camara Municipal',
  'Camaras Sul',
  'Camaras Sudeste',
  'Camaras Centro-Oeste',
  'Camaras Norte',
  'Camaras Nordeste',
];

const REGIONS: Record<string, string[]> = {
  Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

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

function EmailEditorStep({ form, onChange, isReadOnly = false }: { form: EmailForm; onChange: (f: EmailForm) => void; isReadOnly?: boolean }) {
  const [tab, setTab] = useState<EditorTab>('preview');
  const [htmlSubTab, setHtmlSubTab] = useState<'visual' | 'raw'>('visual');
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasFullHtml =
    form.html_content?.includes('<html') ||
    form.html_content?.includes('<!DOCTYPE');

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

  function unescapeHtml(str: string): string {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function writePreview() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    const raw = form.html_content
      ? unescapeHtml(form.html_content)
      : '<p style="font-family:sans-serif;color:#94a3b8;padding:24px">Nenhum HTML para pré-visualizar.</p>';
    const previewHtml = raw
      .replace(/\[Nome\]/gi, 'Dr. Luiz Furlan')
      .replace(/\[Municipio\]/gi, 'Campinas')
      .replace(/\[Estado\]/gi, 'SP')
      .replace(/\[Prefeito\]/gi, 'Dr. Luiz Furlan');
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }

  useEffect(() => {
    if (tab !== 'preview') return;
    writePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              disabled={isReadOnly}
              placeholder="Ex.: Como reduzir custos em licitações públicas"
              maxLength={150}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10 disabled:opacity-60"
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
              disabled={isReadOnly}
              placeholder="Ex.: Descubra como nossos clientes economizam até 30%..."
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10 disabled:opacity-60"
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
              disabled={isGenerating || isReadOnly}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {isGenerating ? 'Gerando...' : 'Gerar com IA'}
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
            <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              {!hasFullHtml && (
                <button
                  type="button"
                  onClick={() => setHtmlSubTab('visual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    htmlSubTab === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Visual
                </button>
              )}
              <button
                type="button"
                onClick={() => setHtmlSubTab('raw')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  htmlSubTab === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                HTML Raw
              </button>
            </div>
            {hasFullHtml && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Conteúdos em HTML completo devem ser editados no modo HTML Raw para preservar a estrutura original do e-mail.
              </div>
            )}
            {htmlSubTab === 'visual' && !hasFullHtml && (
              // IMPORTANTE:
              // O html_content e compartilhado entre o modo "HTML Raw" e o editor visual (TipTap).
              // Quando HTML bruto passa pelo TipTap, ele e interpretado como texto e pode ser escapado
              // (ex: < vira &lt;), quebrando o envio real de e-mails.
              // Por isso, o onChange do editor visual so e permitido quando a aba "visual" esta ativa.
              // NAO remover essa condicao sem tratar separacao de estados entre RAW e VISUAL.
              <RichEmailEditor
                value={form.html_content}
                onChange={
                  isReadOnly
                    ? () => {}
                    : (html) => onChange({ ...form, html_content: html })
                }
                onSwitchToText={() => setTab('text')}
              />
            )}
            {htmlSubTab === 'raw' && (
              <textarea
                value={form.html_content ?? ''}
                onChange={isReadOnly ? undefined : set('html_content')}
                readOnly={isReadOnly}
                placeholder={HTML_PLACEHOLDER}
                style={{ fontFamily: 'monospace', minHeight: '400px', resize: 'vertical' }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10 disabled:opacity-60"
              />
            )}
          </div>
        )}

        {tab === 'preview' && (
          <div className="p-4">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Assunto: </span>
                    {form.subject || <span className="italic text-slate-400">(sem assunto)</span>}
                  </p>
                  {form.preheader && (
                    <p className="mt-0.5 text-xs text-slate-400">{form.preheader}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={writePreview}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw className="size-3.5" />
                  Atualizar Prévia
                </button>
              </div>
              <iframe
                ref={iframeRef}
                title="Prévia do e-mail"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                referrerPolicy="no-referrer-when-downgrade"
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
              disabled={isReadOnly}
              placeholder={'Olá [Nome],\n\nEscreva a versão em texto simples aqui.\n\nAtenciosamente,\nSua equipe'}
              rows={18}
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10 disabled:opacity-60"
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
  source,
  onSourceChange,
  selectedCustomerListId,
  selectedCustomerList,
  onSelectedCustomerListIdChange,
  onSelectedCustomerListChange,
  isReadOnly = false,
}: {
  filters: AudienceFilters;
  onChange: (f: AudienceFilters) => void;
  source: AudienceSource;
  onSourceChange: (value: AudienceSource) => void;
  selectedCustomerListId: string;
  selectedCustomerList: CustomerContactList | null;
  onSelectedCustomerListIdChange: (value: string) => void;
  onSelectedCustomerListChange: (value: CustomerContactList | null) => void;
  isReadOnly?: boolean;
}) {
  const supabase = useRef(createClient()).current;

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingCount, setLoadingCount] = useState(false);
  const [loadingCustomerLists, setLoadingCustomerLists] = useState(false);
  const [loadingCustomerPreview, setLoadingCustomerPreview] = useState(false);
  const [customerListsError, setCustomerListsError] = useState('');
  const [customerPreviewError, setCustomerPreviewError] = useState('');
  const [qualitySummary, setQualitySummary] = useState<QualitySummary>({
    green: 0,
    yellow: 0,
    white: 0,
  });
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [populationRanges, setPopulationRanges] = useState<string[]>([]);
  const [customerLists, setCustomerLists] = useState<CustomerContactList[]>([]);
  const [customerPreview, setCustomerPreview] = useState<CustomerBaseAudiencePreview | null>(null);
  const qualityGroups = normalizeQualityGroups(filters.qualityGroups);

  useEffect(() => {
    (async () => {
      try {
        setLoadingFilters(true);
        const [{ data: munData }, { data: popData }] = await Promise.all([
          supabase
            .from('municipalities')
            .select('id, city, state')
            .order('city', { ascending: true })
            .limit(6000),
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

  useEffect(() => {
    if (source !== 'customer_base') return;

    let active = true;

    (async () => {
      try {
        setLoadingCustomerLists(true);
        setCustomerListsError('');

        const response = await fetch('/api/customer-contact-lists', {
          method: 'GET',
          cache: 'no-store',
        });
        const result = (await response.json()) as CustomerContactListsResponse;

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao carregar bases próprias.');
        }

        if (!active) return;

        const lists = result.data || [];
        setCustomerLists(lists);

        if (selectedCustomerListId) {
          const nextSelectedList = lists.find((item) => item.id === selectedCustomerListId) ?? null;
          onSelectedCustomerListIdChange(nextSelectedList?.id ?? '');
          onSelectedCustomerListChange(nextSelectedList);
          onChange({
            ...filters,
            totalCount: nextSelectedList?.contacts_count ?? 0,
          });
        }
      } catch (err: any) {
        if (!active) return;
        setCustomerLists([]);
        setCustomerListsError(err?.message || 'Erro ao carregar bases próprias.');
      } finally {
        if (active) setLoadingCustomerLists(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [source, selectedCustomerListId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (source !== 'cm_pro') return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoadingCount(true);
        const params = new URLSearchParams();
        if (filters.region) params.set('region', filters.region);
        if (filters.state) params.set('state', filters.state);
        if (filters.municipalityId) params.set('municipalityId', filters.municipalityId);
        if (filters.populationRange) params.set('populationRange', filters.populationRange);
        if (filters.department) params.set('department', filters.department);
        params.set('strategic', filters.strategic);
        if (filters.minScore.trim()) params.set('minScore', filters.minScore.trim());
        if (filters.emailSearch.trim()) params.set('emailSearch', filters.emailSearch.trim());
        params.set('qualityGreen', String(qualityGroups.green));
        params.set('qualityYellow', String(qualityGroups.yellow));
        params.set('qualityWhite', String(qualityGroups.white));
        params.set('page', '1');
        params.set('pageSize', '1');

        const res = await fetch(`/api/email/audiences/preview?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as AudiencePreviewResponse;
        setQualitySummary({
          green: json.quality_summary?.green ?? 0,
          yellow: json.quality_summary?.yellow ?? 0,
          white: json.quality_summary?.white ?? 0,
        });
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
    source,
    filters.region,
    filters.state,
    filters.municipalityId,
    filters.populationRange,
    filters.department,
    filters.strategic,
    filters.minScore,
    filters.emailSearch,
    qualityGroups.green,
    qualityGroups.yellow,
    qualityGroups.white,
  ]);

  useEffect(() => {
    if (source !== 'customer_base' || !selectedCustomerListId) {
      setCustomerPreview(null);
      setCustomerPreviewError('');
      setLoadingCustomerPreview(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoadingCustomerPreview(true);
        setCustomerPreviewError('');

        const response = await fetch(`/api/customer-contact-lists/${selectedCustomerListId}/audience-preview`, {
          method: 'GET',
          cache: 'no-store',
        });
        const result = (await response.json()) as CustomerBaseAudiencePreviewResponse;

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao carregar preview da base própria.');
        }

        if (!active) return;
        setCustomerPreview(result.data ?? null);
      } catch (err: any) {
        if (!active) return;
        setCustomerPreview(null);
        setCustomerPreviewError(err?.message || 'Erro ao carregar preview da base própria.');
      } finally {
        if (active) setLoadingCustomerPreview(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [source, selectedCustomerListId]);

  const filteredMunicipalities = useMemo(() => {
    if (filters.state) return municipalities.filter((m) => m.state === filters.state);
    if (filters.region) {
      const regionStates = REGIONS[filters.region] ?? [];
      return municipalities.filter((m) => regionStates.includes(m.state));
    }
    return municipalities;
  }, [municipalities, filters.state, filters.region]);

  const set = <K extends keyof AudienceFilters>(key: K, value: AudienceFilters[K]) => {
    const next = { ...filters, [key]: value };
    if (key === 'region') {
      next.state = '';
      next.municipalityId = '';
    }
    if (key === 'state') next.municipalityId = '';
    onChange(next);
  };

  const toggleQualityGroup = (key: keyof QualityGroups) => {
    if (isReadOnly) return;

    const nextQualityGroups = {
      ...qualityGroups,
      [key]: !qualityGroups[key],
    };

    if (!nextQualityGroups.green && !nextQualityGroups.yellow && !nextQualityGroups.white) {
      toast.error('Selecione pelo menos um grupo de e-mails');
      return;
    }

    onChange({
      ...filters,
      qualityGroups: nextQualityGroups,
    });
  };

  const clear = () => onChange({ ...DEFAULT_AUDIENCE, totalCount: filters.totalCount });

  const labelClass = 'text-sm font-medium text-slate-700';
  const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-50';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtros da audiência</h2>
            <p className="text-sm text-slate-500">Segmente a base de e-mails para esta campanha.</p>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={source !== 'cm_pro' || isReadOnly}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
            Limpar
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => !isReadOnly && onSourceChange('cm_pro')}
            disabled={isReadOnly}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              source === 'cm_pro'
                ? 'border-[#0f49bd] bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${isReadOnly ? 'cursor-default opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Server className="size-5 text-[#0f49bd]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Base CM Pro</p>
                <p className="text-xs text-slate-500">Mantém filtros e preview atuais.</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => !isReadOnly && onSourceChange('customer_base')}
            disabled={isReadOnly}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              source === 'customer_base'
                ? 'border-[#0f49bd] bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${isReadOnly ? 'cursor-default opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Database className="size-5 text-[#0f49bd]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Bases Próprias</p>
                <p className="text-xs text-slate-500">Seleção e preview, sem envio nesta etapa.</p>
              </div>
            </div>
          </button>
        </div>

        {source === 'customer_base' && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bases Próprias ainda não estão liberadas para envio nesta fase.
          </div>
        )}

        {source === 'cm_pro' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Região</label>
              <select value={filters.region} onChange={(e) => set('region', e.target.value)} disabled={loadingFilters || isReadOnly} className={selectClass}>
                <option value="">Todas as regiões</option>
                {Object.keys(REGIONS).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Estado</label>
              <select value={filters.state} onChange={(e) => set('state', e.target.value)} disabled={loadingFilters || isReadOnly} className={selectClass}>
                <option value="">Todos os estados</option>
                {(filters.region ? (REGIONS[filters.region] ?? []) : BRAZILIAN_STATES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Município</label>
              <select value={filters.municipalityId} onChange={(e) => set('municipalityId', e.target.value)} disabled={loadingFilters || isReadOnly} className={selectClass}>
                <option value="">Todos os municípios</option>
                {filteredMunicipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Faixa populacional</label>
              <select value={filters.populationRange} onChange={(e) => set('populationRange', e.target.value)} disabled={loadingFilters || isReadOnly} className={selectClass}>
                <option value="">Todas as faixas</option>
                {populationRanges.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Departamento</label>
              <select value={filters.department} onChange={(e) => set('department', e.target.value)} disabled={isReadOnly} className={selectClass}>
                <option value="">Todos os departamentos</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Estratégico</label>
              <select value={filters.strategic} onChange={(e) => set('strategic', e.target.value as AudienceFilters['strategic'])} disabled={isReadOnly} className={selectClass}>
                <option value="all">Todos</option>
                <option value="yes">Somente estratégicos</option>
                <option value="no">Somente não estratégicos</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Score mínimo</label>
              <input type="number" min="0" value={filters.minScore} onChange={(e) => set('minScore', e.target.value)} disabled={isReadOnly} placeholder="Ex.: 20" className={selectClass} />
            </div>

            <div className="flex flex-col gap-2 xl:col-span-2">
              <label className={labelClass}>Buscar no e-mail</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={filters.emailSearch} onChange={(e) => set('emailSearch', e.target.value)} disabled={isReadOnly} placeholder="Ex.: saude, adm, compras" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0f49bd]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Base própria</label>
              <select value={selectedCustomerListId} onChange={(e) => {
                const nextSelectedList = customerLists.find((item) => item.id === e.target.value) ?? null;
                onSelectedCustomerListIdChange(nextSelectedList?.id ?? '');
                onSelectedCustomerListChange(nextSelectedList);
                onChange({
                  ...filters,
                  totalCount: nextSelectedList?.contacts_count ?? 0,
                });
              }} disabled={loadingCustomerLists || isReadOnly || customerLists.length === 0} className={selectClass}>
                <option value="">{loadingCustomerLists ? 'Carregando bases...' : 'Selecione uma base'}</option>
                {customerLists.map((list) => (
                  <option key={list.id} value={list.id}>{list.name} {list.status === 'inactive' ? '(inativa)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Os filtros da Base CM Pro ficam desativados quando a origem selecionada é Bases Próprias.
            </div>

            {customerListsError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{customerListsError}</p>
            )}

            {!loadingCustomerLists && !customerListsError && customerLists.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Nenhuma base própria encontrada para este usuário.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Users className="size-7 text-[#0f49bd]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">
              {source === 'cm_pro' ? 'E-mails disponíveis com esta segmentação' : 'Resumo da base própria selecionada'}
            </p>
            {(source === 'cm_pro' && loadingCount) || (source === 'customer_base' && (loadingCustomerLists || loadingCustomerPreview)) ? (
              <p className="mt-1 text-sm text-slate-400">Calculando...</p>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold text-[#0f172a]">{filters.totalCount.toLocaleString('pt-BR')}</p>
                {source === 'cm_pro' ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                    <button type="button" onClick={() => toggleQualityGroup('green')} disabled={isReadOnly} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${qualityGroups.green ? 'border-emerald-200 bg-emerald-50 text-emerald-900 opacity-100' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-40'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-emerald-300 hover:bg-emerald-100/60'}`}>
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="font-medium">{qualitySummary.green.toLocaleString('pt-BR')}</span>
                    </button>
                    <button type="button" onClick={() => toggleQualityGroup('yellow')} disabled={isReadOnly} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${qualityGroups.yellow ? 'border-amber-200 bg-amber-50 text-amber-900 opacity-100' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-40'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-amber-300 hover:bg-amber-100/60'}`}>
                      <span className="size-2 rounded-full bg-amber-400" />
                      <span className="font-medium">{qualitySummary.yellow.toLocaleString('pt-BR')}</span>
                    </button>
                    <button type="button" onClick={() => toggleQualityGroup('white')} disabled={isReadOnly} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${qualityGroups.white ? 'border-slate-200 bg-slate-100 text-slate-900 opacity-100' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-40'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-slate-300 hover:bg-slate-200/70'}`}>
                      <span className="size-2 rounded-full bg-slate-300" />
                      <span className="font-medium">{qualitySummary.white.toLocaleString('pt-BR')}</span>
                    </button>
                  </div>
                ) : customerPreview ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{customerPreview.list_name}</p>
                          <p className="text-xs text-slate-500">Preview da audiência da base própria selecionada</p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                          Bases Próprias ainda não estão liberadas para envio nesta fase.
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Contatos</p>
                          <p className="mt-1 font-semibold text-slate-900">{customerPreview.total_contacts.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-emerald-700">Elegíveis</p>
                          <p className="mt-1 font-semibold text-emerald-900">{customerPreview.eligible_contacts.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-amber-700">Inválidos</p>
                          <p className="mt-1 font-semibold text-amber-900">{customerPreview.invalid_contacts.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-rose-700">Duplicados</p>
                          <p className="mt-1 font-semibold text-rose-900">{customerPreview.duplicate_contacts.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-sky-700">Não verificados</p>
                          <p className="mt-1 font-semibold text-sky-900">{(customerPreview.not_checked_contacts ?? 0).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-900">Amostra de contatos</p>
                        {customerPreview.sample_contacts && customerPreview.sample_contacts.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {customerPreview.sample_contacts.map((contact) => (
                              <div key={contact.email_normalized} className="rounded-lg border border-slate-200 px-3 py-2">
                                <p className="text-sm font-medium text-slate-900">{contact.email_normalized}</p>
                                <p className="text-xs text-slate-500">
                                  {[contact.name, contact.company_name].filter(Boolean).join(' • ') || 'Sem nome ou empresa informados'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">Nenhum contato disponível para amostra.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Selecione uma base para visualizar o preview da audiência.</p>
                )}
              </>
            )}
          </div>
        </div>

        {filters.totalCount === 0 && !loadingCount && source === 'cm_pro' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Nenhum e-mail encontrado com os filtros atuais. Ajuste os filtros para continuar.</p>
        )}
        {source === 'customer_base' && !selectedCustomerList && !loadingCustomerLists && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Selecione uma base própria para preparar esta audiência.</p>
        )}
        {source === 'customer_base' && customerPreviewError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{customerPreviewError}</p>
        )}
      </div>
    </div>
  );
}

type SummaryProps = {
  campaign: Campaign;
  emailForm: EmailForm;
  audienceFilters: AudienceFilters;
  audienceSource: AudienceSource;
  selectedCustomerList: CustomerContactList | null;
};

function SummaryStep({
  campaign,
  emailForm,
  audienceFilters,
  audienceSource,
  selectedCustomerList,
}: SummaryProps) {
  const hasSubject = emailForm.subject.trim().length > 0;
  const hasHtml = emailForm.html_content.trim().length > 0;
  const hasText = emailForm.text_content.trim().length > 0;
  const hasAudience = audienceFilters.totalCount > 0;
  const isReady = hasSubject && (hasHtml || hasText) && hasAudience;

  const audienceTags: string[] = [];
  if (audienceSource === 'cm_pro') {
    if (audienceFilters.region) audienceTags.push(`Região: ${audienceFilters.region}`);
    if (audienceFilters.state) audienceTags.push(`Estado: ${audienceFilters.state}`);
    if (audienceFilters.municipalityId) audienceTags.push('1 município específico');
    if (audienceFilters.populationRange) audienceTags.push(`Pop.: ${audienceFilters.populationRange}`);
    if (audienceFilters.department) audienceTags.push(`Depto.: ${audienceFilters.department}`);
    if (audienceFilters.strategic === 'yes') audienceTags.push('Somente estratégicos');
    if (audienceFilters.strategic === 'no') audienceTags.push('Somente não estratégicos');
    if (audienceFilters.minScore.trim()) audienceTags.push(`Score ≥ ${audienceFilters.minScore}`);
    if (audienceFilters.emailSearch.trim()) audienceTags.push(`Contém "${audienceFilters.emailSearch.trim()}"`);
  } else if (selectedCustomerList) {
    audienceTags.push('Origem: Bases Próprias');
    audienceTags.push(`Base: ${selectedCustomerList.name}`);
  }

  const objectiveLabel: Record<string, string> = {
    Prospecção: 'Prospecção',
    Relacionamento: 'Relacionamento',
    'Apresentação comercial': 'Apresentação comercial',
    'Follow-up': 'Follow-up',
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
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
              {audienceSource === 'customer_base' && <li>Bases Próprias ainda não estão liberadas para envio nesta fase.</li>}
            </ul>
          </div>
        </div>
      )}

      <SummaryCard title="Campanha" icon={<Mail className="size-4 text-[#0f49bd]" />}>
        <Row label="Nome" value={campaign.name} />
        <Row label="Objetivo" value={objectiveLabel[campaign.objective] ?? campaign.objective} />
        <Row label="Status" value={campaign.status} badge />
        {campaign.description && <Row label="Descrição" value={campaign.description} />}
      </SummaryCard>

      <SummaryCard title="E-mail" icon={<FileText className="size-4 text-[#0f49bd]" />}>
        <CheckRow label="Assunto" ok={hasSubject} detail={emailForm.subject || '—'} />
        {emailForm.preheader && <Row label="Preheader" value={emailForm.preheader} />}
        <CheckRow
          label="HTML"
          ok={hasHtml}
          detail={hasHtml ? `${emailForm.html_content.split('\n').length} linhas` : 'Não adicionado'}
        />
        <CheckRow
          label="Texto simples"
          ok={hasText}
          warn={!hasText}
          detail={hasText ? `${emailForm.text_content.split('\n').length} linhas` : 'Não adicionado (recomendado)'}
        />
      </SummaryCard>

      <SummaryCard title="Audiência" icon={<Users className="size-4 text-[#0f49bd]" />}>
        <p className="text-sm text-slate-500">
          Origem selecionada: <strong>{audienceSource === 'cm_pro' ? 'Base CM Pro' : 'Bases Próprias'}</strong>
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#0f172a]">{audienceFilters.totalCount.toLocaleString('pt-BR')}</span>
          <span className="text-sm text-slate-500">destinatários</span>
        </div>

        {audienceSource === 'customer_base' && selectedCustomerList && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-xs uppercase tracking-wide text-slate-500">Contatos</p><p className="mt-1 font-semibold text-slate-900">{selectedCustomerList.contacts_count.toLocaleString('pt-BR')}</p></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><p className="text-xs uppercase tracking-wide text-emerald-700">Válidos</p><p className="mt-1 font-semibold text-emerald-900">{selectedCustomerList.valid_contacts_count.toLocaleString('pt-BR')}</p></div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"><p className="text-xs uppercase tracking-wide text-amber-700">Inválidos</p><p className="mt-1 font-semibold text-amber-900">{selectedCustomerList.invalid_contacts_count.toLocaleString('pt-BR')}</p></div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"><p className="text-xs uppercase tracking-wide text-rose-700">Duplicados</p><p className="mt-1 font-semibold text-rose-900">{selectedCustomerList.duplicate_contacts_count.toLocaleString('pt-BR')}</p></div>
          </div>
        )}

        {audienceTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {audienceTags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{tag}</span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Sem filtros aplicados — toda a base será usada.</p>
        )}

        {audienceSource === 'customer_base' && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bases Próprias ainda não estão liberadas para envio nesta fase.
          </p>
        )}

        {!hasAudience && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-600"><X className="size-3.5" /> Nenhum destinatário encontrado. Volte e ajuste os filtros.</p>
        )}
      </SummaryCard>
    </div>
  );
}
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

// -----------------------------------------------------------------------------
// Step 4 - Send
// -----------------------------------------------------------------------------

function SendStep({
  audienceSource,
  audienceCount,
  remainingCount,
  selectedAccountId,
  onAccountChange,
  confirmed,
  onConfirmChange,
  sendLimit,
  onSendLimitChange,
  privateQueueStats,
  privateQueueResult,
  isLoadingPrivateQueueStats = false,
  isPreparingPrivateQueue = false,
  isReadOnly = false,
}: {
  audienceSource: AudienceSource;
  audienceCount: number;
  remainingCount: number;
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  confirmed: boolean;
  onConfirmChange: (v: boolean) => void;
  sendLimit: number;
  onSendLimitChange: (v: number) => void;
  privateQueueStats: PrivateQueueStats | null;
  privateQueueResult: PrivateQueuePreparationResult | null;
  isLoadingPrivateQueueStats?: boolean;
  isPreparingPrivateQueue?: boolean;
  isReadOnly?: boolean;
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
  const privateRemainingCount = privateQueueStats?.available_contacts ?? 0;

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
            disabled={isReadOnly}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-60"
          >
            <option value="">Selecionar conta de envio...</option>
            {accounts.filter((a) => a.is_active).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} - {a.sender_email}
              </option>
            ))}
          </select>
        )}

        {/* SPF/DKIM warning */}
        {selected && (selected.spf_status === false || selected.dkim_status === false) && (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>Atenção:</strong> o domínio desta conta não possui{' '}
              {[selected.spf_status === false && 'SPF', selected.dkim_status === false && 'DKIM'].filter(Boolean).join(' e ')}{' '}
              configurados. Isso pode reduzir a entregabilidade dos seus e-mails.{' '}
              <a href="/email/accounts" className="font-medium underline">Configurar agora</a>
            </p>
          </div>
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
                {(selected.hourly_limit ?? 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Limite/dia</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {(selected.daily_limit ?? 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {selected && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {audienceSource === 'customer_base'
              ? 'Bases Próprias ainda não estão liberadas para envio nesta fase. Nesta etapa você apenas prepara a fila privada.'
              : 'Seu envio será processado automaticamente para garantir a melhor performance de entrega.'}
          </div>
        )}
      </div>

      {/* Truncation warning */}
      {audienceSource === 'cm_pro' && remainingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            Você selecionou <strong>{audienceCount.toLocaleString('pt-BR')}</strong> destinatários na audiência.
            {audienceCount === remainingCount ? (
              <> Todos estão disponíveis para este disparo.</>
            ) : (
              <> Destes, <strong>{remainingCount.toLocaleString('pt-BR')}</strong> ainda não foram enviados nesta campanha.</>
            )}
          </p>
        </div>
      )}

      {audienceSource === 'cm_pro' ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
                <Users className="size-4 text-[#0f49bd]" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quantos e-mails deseja enviar? Selecione um % ou o número de destinatários que deseja
              </h3>
            </div>
            <input
              type="number"
              min={1}
              max={remainingCount}
              step={1}
              value={sendLimit}
              onChange={(e) => {
                const val = Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), remainingCount);
                onSendLimitChange(val);
              }}
              disabled={isReadOnly}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[25, 50, 75, 100].map((pct) => {
                const val = Math.max(1, Math.round(remainingCount * pct / 100));
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onSendLimitChange(val)}
                    disabled={isReadOnly}
                    className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {audienceCount === remainingCount ? (
                <>A audiência selecionada tem {audienceCount.toLocaleString('pt-BR')} destinatários, e todos estão disponíveis para este disparo.</>
              ) : (
                <>A audiência selecionada tem {audienceCount.toLocaleString('pt-BR')} destinatários, e {remainingCount.toLocaleString('pt-BR')} ainda não foram enviados nesta campanha.</>
              )}
            </p>
          </div>

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
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50">
              <Database className="size-4 text-[#0f49bd]" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quantos e-mails deseja preparar?
            </h3>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhum e-mail será enviado nesta etapa. Esta ação apenas cria jobs privados.
          </div>

          {privateQueueStats?.has_active_jobs && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Há uma fila privada em andamento. Conclua o processamento antes de preparar novos destinatários.
            </div>
          )}

          <div className="mt-4">
            <input
              type="number"
              min={1}
              max={Math.max(1, privateRemainingCount)}
              step={1}
              value={privateRemainingCount > 0 ? sendLimit : 0}
              onChange={(e) => {
                const val = Math.min(
                  Math.max(1, parseInt(e.target.value, 10) || 1),
                  Math.max(1, privateRemainingCount),
                );
                onSendLimitChange(val);
              }}
              disabled={isReadOnly || privateRemainingCount === 0 || Boolean(privateQueueStats?.has_active_jobs)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[25, 50, 75, 100].map((pct) => {
                const val = Math.max(1, Math.round(privateRemainingCount * pct / 100));
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onSendLimitChange(val)}
                    disabled={isReadOnly || privateRemainingCount === 0 || Boolean(privateQueueStats?.has_active_jobs)}
                    className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {privateQueueStats ? (
                <>
                  A base própria tem {privateQueueStats.eligible_contacts.toLocaleString('pt-BR')} contatos elegíveis,
                  dos quais {privateQueueStats.already_sent_contacts.toLocaleString('pt-BR')} já foram enviados nesta campanha
                  e {privateQueueStats.available_contacts.toLocaleString('pt-BR')} estão disponíveis para nova preparação.
                </>
              ) : (
                <>Carregando disponibilidade da fila privada...</>
              )}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Audiência atual</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{audienceCount.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conta selecionada</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{selected?.name ?? 'Não selecionada'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{isPreparingPrivateQueue ? 'Preparando...' : 'Aguardando ação'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Limite aplicado</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {privateRemainingCount > 0 ? sendLimit.toLocaleString('pt-BR') : '0'}
              </p>
            </div>
          </div>

          {privateQueueResult && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Fila privada preparada</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <div><p className="text-xs uppercase tracking-wide text-emerald-700">Jobs criados</p><p className="mt-1 font-semibold text-emerald-900">{privateQueueResult.created_jobs.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Duplicados ignorados</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.skipped_duplicates.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Já enviados</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.already_sent_contacts.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Disponíveis</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.available_contacts.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Limite aplicado</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.applied_send_limit.toLocaleString('pt-BR')}</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Elegíveis</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.eligible_contacts.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Total</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.total_contacts.toLocaleString('pt-BR')}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-600">Solicitado</p><p className="mt-1 font-semibold text-slate-900">{privateQueueResult.requested_send_limit?.toLocaleString('pt-BR') ?? 'Todos disponíveis'}</p></div>
              </div>
              <p className="mt-3 text-sm text-emerald-900">{privateQueueResult.message}</p>
              <p className="mt-2 text-xs text-emerald-800">Nenhum e-mail foi enviado nesta etapa.</p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Status da fila privada</p>
                <p className="text-xs text-slate-500">
                  {privateQueueStats?.list_name
                    ? `Base: ${privateQueueStats.list_name}`
                    : 'Visão operacional da campanha com Bases Próprias'}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  privateQueueStats?.has_active_jobs
                    ? 'bg-amber-100 text-amber-800'
                    : privateQueueStats?.can_prepare_more
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {privateQueueStats?.has_active_jobs
                  ? 'Fila privada em andamento'
                  : privateQueueStats?.can_prepare_more
                    ? 'Pode preparar nova leva'
                    : 'Todos os contatos disponíveis já foram preparados/enviados'}
              </span>
            </div>

            {isLoadingPrivateQueueStats && !privateQueueStats ? (
              <p className="mt-4 text-sm text-slate-500">Carregando status da fila privada...</p>
            ) : privateQueueStats ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Disponíveis</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.available_contacts.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Preparados/Pendentes</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.pending_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Enviados</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.sent_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Falhas</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.failed_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Em retry</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.retry_jobs.toLocaleString('pt-BR')}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Ignorados</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.skipped_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Em processamento</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.processing_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Total de jobs</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.total_jobs.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Elegíveis</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.eligible_contacts.toLocaleString('pt-BR')}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-600">Total de contatos</p><p className="mt-1 font-semibold text-slate-900">{privateQueueStats.total_contacts.toLocaleString('pt-BR')}</p></div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Último envio:</span>{' '}
                    {privateQueueStats.last_sent_at
                      ? new Date(privateQueueStats.last_sent_at).toLocaleString('pt-BR')
                      : 'Nenhum envio concluído ainda'}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium text-slate-900">Último erro:</span>{' '}
                    {privateQueueStats.last_failure_reason
                      ? `${privateQueueStats.last_failure_reason}${privateQueueStats.last_failure_code ? ` (${privateQueueStats.last_failure_code})` : ''}`
                      : 'Nenhuma falha registrada'}
                  </p>
                  {privateQueueStats.last_failure_at && (
                    <p className="mt-2 text-xs text-slate-500">
                      Registrado em {new Date(privateQueueStats.last_failure_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Não foi possível carregar o status da fila privada.</p>
            )}
          </div>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          disabled={isReadOnly}
          className="mt-0.5 size-4 accent-[#0f49bd] disabled:opacity-50"
        />
        <span className="text-sm text-slate-700">
          {audienceSource === 'customer_base' ? (
            <>
              Confirmo a preparação da fila privada para a campanha
              {selected ? ` usando a conta "${selected.name}"` : ''}.
              Nenhum e-mail será enviado nesta etapa.
            </>
          ) : (
            <>
              Confirmo o envio de{' '}
              <strong>{sendLimit.toLocaleString('pt-BR')} e-mails</strong>
              {selected ? ` via conta "${selected.name}"` : ''}.
              Esta ação não pode ser desfeita.
            </>
          )}
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
            {(result.sent ?? 0).toLocaleString('pt-BR')}
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
            {(result.failed ?? 0).toLocaleString('pt-BR')}
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
  const supabase = useRef(createClient()).current;
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
  const [audienceSource, setAudienceSource] = useState<AudienceSource>('cm_pro');
  const [selectedCustomerListId, setSelectedCustomerListId] = useState('');
  const [selectedCustomerList, setSelectedCustomerList] = useState<CustomerContactList | null>(null);

  const isReadOnly = useIsReadOnly();

  // Step 4 state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isPreparingPrivateQueue, setIsPreparingPrivateQueue] = useState(false);
  const [isLoadingPrivateQueueStats, setIsLoadingPrivateQueueStats] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [privateQueueStats, setPrivateQueueStats] = useState<PrivateQueueStats | null>(null);
  const [privateQueueResult, setPrivateQueueResult] = useState<PrivateQueuePreparationResult | null>(null);
  const [sendLimit, setSendLimit] = useState(audienceFilters.totalCount);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitData, setLimitData] = useState({ emails_used: 0, emails_limit: 10000 });

  useEffect(() => {
    if (audienceSource === 'customer_base') {
      setSendLimit(Math.max(0, privateQueueStats?.available_contacts ?? 0));
      return;
    }

    setSendLimit(Math.max(0, audienceFilters.totalCount - (campaign?.sent_count ?? 0)));
  }, [audienceFilters.totalCount, audienceSource, campaign?.sent_count, privateQueueStats?.available_contacts]);

  const loadPrivateQueueStats = useCallback(async () => {
    if (audienceSource !== 'customer_base' || isNew || !selectedCustomerListId) {
      setPrivateQueueStats(null);
      return;
    }

    try {
      setIsLoadingPrivateQueueStats(true);
      const response = await fetch(`/api/email/campaigns/${campaignId}/customer-send/status`, {
        method: 'GET',
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar status da fila privada.');
      }

      setPrivateQueueStats(result as PrivateQueueStats);
    } catch (error) {
      console.error('Erro ao carregar status da fila privada:', error);
      setPrivateQueueStats(null);
    } finally {
      setIsLoadingPrivateQueueStats(false);
    }
  }, [audienceSource, campaignId, isNew, selectedCustomerListId]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!active) return;
      await loadPrivateQueueStats();
    })();

    return () => {
      active = false;
    };
  }, [loadPrivateQueueStats]);

  // ── Load campaign ──────────────────────────────────────────────────────────
  useEffect(() => {
    // id === 'new': não buscar no banco - apenas inicializar com query params do template
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
        setAudienceSource(c.audience_source === 'customer_base' ? 'customer_base' : 'cm_pro');
        setSelectedCustomerListId(c.customer_contact_list_id ?? '');
        setSelectedCustomerList(null);
        setEmailForm({
          subject: c.subject ?? '',
          preheader: c.preheader ?? '',
          html_content: c.html_content ?? '',
          text_content: c.text_content ?? '',
        });
        if (c.audience_filters) {
          setAudienceFilters({
            ...DEFAULT_AUDIENCE,
            ...c.audience_filters,
            qualityGroups: normalizeQualityGroups(c.audience_filters.qualityGroups),
          });
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
      if (audienceSource === 'customer_base') {
        if (!selectedCustomerListId) {
          toast.error('Selecione uma base própria antes de continuar.');
          return false;
        }
      } else if (audienceFilters.totalCount === 0) {
        toast.error('A audiência está vazia. Ajuste os filtros antes de continuar.');
        return false;
      }

      const qualityGroups = normalizeQualityGroups(audienceFilters.qualityGroups);
      if (audienceSource === 'cm_pro' && !qualityGroups.green && !qualityGroups.yellow && !qualityGroups.white) {
        toast.error('Selecione pelo menos um grupo de e-mails');
        return false;
      }
      try {
        setIsSaving(true);
        const response = await fetch(`/api/email/campaigns/${campaignId}/audience-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience_source: audienceSource,
            customer_contact_list_id: audienceSource === 'customer_base' ? selectedCustomerListId : null,
            audience_filters: {
              ...audienceFilters,
              qualityGroups,
            },
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao salvar audiência.');
        }

        setCampaign((current) =>
          current
            ? {
                ...current,
                audience_source: audienceSource,
                customer_contact_list_id: audienceSource === 'customer_base' ? selectedCustomerListId : null,
                audience_filters: {
                  ...audienceFilters,
                  qualityGroups,
                },
              }
            : current,
        );
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
    [audienceSource, audienceFilters, campaignId, selectedCustomerListId],
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
      toast.success(`Campanha enviada! ${json.sent} e-mails disparados.`);
      router.push('/email/campaigns');
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

  const handlePreparePrivateQueue = async () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta de envio.');
      return;
    }
    if (!sendConfirmed) {
      toast.error('Confirme a preparação da fila privada antes de continuar.');
      return;
    }

    try {
      setIsPreparingPrivateQueue(true);
      const res = await fetch(`/api/email/campaigns/${campaignId}/customer-send/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sending_account_id: selectedAccountId, send_limit: sendLimit }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao preparar fila privada.');
      }

      setPrivateQueueResult(json);
      setCampaign((current) =>
        current
          ? {
              ...current,
              status: 'Agendada',
              sending_account_id: selectedAccountId,
            }
          : current,
      );
      await loadPrivateQueueStats();
      toast.success(json.message || 'Fila privada preparada.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao preparar fila privada.');
    } finally {
      setIsPreparingPrivateQueue(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const summaryIsReady =
    emailForm.subject.trim().length > 0 &&
    (emailForm.html_content.trim().length > 0 || emailForm.text_content.trim().length > 0) &&
    audienceFilters.totalCount > 0;

  const remainingCount = Math.max(0, audienceFilters.totalCount - (campaign?.sent_count ?? 0));

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
      if (audienceSource === 'customer_base') {
        await handlePreparePrivateQueue();
      } else {
        await handleSend();
      }
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
          <EmailEditorStep form={emailForm} onChange={setEmailForm} isReadOnly={isReadOnly} />
        )}
        {currentStep === 2 && (
          <AudienceStep
            filters={audienceFilters}
            onChange={setAudienceFilters}
            source={audienceSource}
            onSourceChange={setAudienceSource}
            selectedCustomerListId={selectedCustomerListId}
            selectedCustomerList={selectedCustomerList}
            onSelectedCustomerListIdChange={setSelectedCustomerListId}
            onSelectedCustomerListChange={setSelectedCustomerList}
            isReadOnly={isReadOnly}
          />
        )}
        {currentStep === 3 && campaign && (
          <SummaryStep
            campaign={campaign}
            emailForm={emailForm}
            audienceFilters={audienceFilters}
            audienceSource={audienceSource}
            selectedCustomerList={selectedCustomerList}
          />
        )}
        {currentStep === 4 && !sendResult && (
          <SendStep
            audienceSource={audienceSource}
            audienceCount={audienceFilters.totalCount}
            remainingCount={remainingCount}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            confirmed={sendConfirmed}
            onConfirmChange={setSendConfirmed}
            sendLimit={sendLimit}
            onSendLimitChange={setSendLimit}
            privateQueueStats={privateQueueStats}
            privateQueueResult={privateQueueResult}
            isLoadingPrivateQueueStats={isLoadingPrivateQueueStats}
            isPreparingPrivateQueue={isPreparingPrivateQueue}
            isReadOnly={isReadOnly}
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

      {/* Footer - hidden after successful send */}
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
                  disabled={isSaving || isReadOnly}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Save className="size-4" />
                  {isSaving ? 'Salvando...' : 'Salvar rascunho'}
                </button>
              )}

              {currentStep === 4 && audienceSource === 'cm_pro' && (
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSendingTest || isSending || !selectedAccountId || isReadOnly}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Mail className="size-4" />
                  {isSendingTest ? 'Enviando...' : 'Enviar teste'}
                </button>
              )}

              {currentStep === 4 && isReadOnly && (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Envio desabilitado no modo demonstração
                </span>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  isSaving ||
                  isSending ||
                  isPreparingPrivateQueue ||
                  (currentStep === 2 &&
                    (audienceSource === 'cm_pro'
                      ? audienceFilters.totalCount === 0
                      : !selectedCustomerListId)) ||
                  (currentStep === 3 && !summaryIsReady) ||
                  (currentStep === 4 &&
                    (!selectedAccountId ||
                      !sendConfirmed ||
                      (audienceSource === 'customer_base' &&
                        (!privateQueueStats || privateQueueStats.available_contacts === 0 || privateQueueStats.has_active_jobs)))) ||
                  isReadOnly
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {currentStep === STEPS.length ? (
                  audienceSource === 'customer_base' ? (
                    isPreparingPrivateQueue ? (
                      'Preparando fila...'
                    ) : (
                      <>
                        <Database className="size-4" />
                        Preparar fila privada
                      </>
                    )
                  ) : isSending ? (
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
