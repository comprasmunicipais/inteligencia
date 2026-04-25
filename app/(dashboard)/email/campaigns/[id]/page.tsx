'use client';

/**
 * P?gina de wizard da campanha de e-mail.
 *
 * Migra??es necess?rias no Supabase (SQL Editor):
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

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FilterSegment = {
  region: string;
  state: string;
  municipalityId: string;
  populationRange: string;
  department: string;
  strategic: 'all' | 'yes' | 'no';
  minScore: string;
  emailSearch: string;
};

type AudienceFilters = {
  segments: FilterSegment[];
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
  audience_filters: AudienceFilters | (FilterSegment & { totalCount?: number }) | null;
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

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: 'E-mail' },
  { id: 2, label: 'Audi?ncia' },
  { id: 3, label: 'Resumo' },
  { id: 4, label: 'Enviar' },
] as const;

const DEFAULT_SEGMENT: FilterSegment = {
  region: '',
  state: '',
  municipalityId: '',
  populationRange: '',
  department: '',
  strategic: 'all',
  minScore: '',
  emailSearch: '',
};

const DEFAULT_AUDIENCE: AudienceFilters = {
  segments: [{ ...DEFAULT_SEGMENT }],
  totalCount: 0,
};

const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

const DEPARTMENT_OPTIONS = [
  'Sa?de',
  'Educa??o',
  'Compras / Licita??o',
  'Administra??o',
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
  'Maior que Um Milh?o',
];

function normalizeAudienceFilters(
  value: AudienceFilters | (Partial<FilterSegment> & { totalCount?: number }) | null | undefined,
): AudienceFilters {
  if (!value) {
    return { ...DEFAULT_AUDIENCE, segments: [{ ...DEFAULT_SEGMENT }] };
  }

  if (Array.isArray((value as AudienceFilters).segments) && (value as AudienceFilters).segments.length > 0) {
    return {
      segments: (value as AudienceFilters).segments.map((segment) => ({
        ...DEFAULT_SEGMENT,
        ...segment,
      })),
      totalCount: Number((value as AudienceFilters).totalCount) || 0,
    };
  }

  return {
    segments: [{ ...DEFAULT_SEGMENT, ...(value as Partial<FilterSegment>) }],
    totalCount: Number((value as { totalCount?: number }).totalCount) || 0,
  };
}

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
    <h1>Ol?, [Nome]!</h1>
    <p>Escreva o conte?do do seu e-mail aqui.</p>
    <a class="cta" href="#">Saiba mais</a>
  </div>
</body>
</html>`;

// -----------------------------------------------------------------------------
// Stepper
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Step 1 ? Email editor
// -----------------------------------------------------------------------------

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
        toast.error(data.error || 'Erro ao gerar conte?do com IA.');
        return;
      }
      onChange({ ...form, html_content: data.html });
      setTab('html');
      toast.success('Conte?do gerado com sucesso!');
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
      : '<p style="font-family:sans-serif;color:#94a3b8;padding:24px">Nenhum HTML para pr?-visualizar.</p>';
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
          Informa??es do e-mail
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
              placeholder="Ex.: Como reduzir custos em licita??es p?blicas"
              maxLength={150}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd] focus:ring-2 focus:ring-[#0f49bd]/10 disabled:opacity-60"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{form.subject.length}/150</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Preheader{' '}
              <span className="font-normal text-slate-400">(pr?via exibida no cliente de e-mail)</span>
            </label>
            <input
              type="text"
              value={form.preheader}
              onChange={set('preheader')}
              disabled={isReadOnly}
              placeholder="Ex.: Descubra como nossos clientes economizam at? 30%..."
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
            Conte?do do e-mail
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
              {isGenerating ? 'Gerando?' : 'Gerar com IA'}
            </button>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {tabBtn('html', <Code className="size-3.5" />, 'HTML')}
              {tabBtn('preview', <Eye className="size-3.5" />, 'Pr?via')}
              {tabBtn('text', <AlignLeft className="size-3.5" />, 'Texto simples')}
            </div>
          </div>
        </div>

        {tab === 'html' && (
          <div className="p-4">
            <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              <button
                type="button"
                onClick={() => setHtmlSubTab('visual')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  htmlSubTab === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Visual
              </button>
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
            {htmlSubTab === 'visual' && hasFullHtml && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Conte?dos em HTML completo devem ser editados no modo HTML Raw para preservar a estrutura original do e-mail.
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
                  Atualizar Pr?via
                </button>
              </div>
              <iframe
                ref={iframeRef}
                title="Pr?via do e-mail"
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
              Vers?o em texto simples para clientes de e-mail que n?o suportam HTML.
            </p>
            <textarea
              value={form.text_content}
              onChange={set('text_content')}
              disabled={isReadOnly}
              placeholder={'Ol? [Nome],\n\nEscreva a vers?o em texto simples aqui.\n\nAtenciosamente,\nSua equipe'}
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
            <span className="font-semibold">Vari?veis dispon?veis: </span>
            <code className="rounded bg-blue-100 px-1">[Nome]</code>,{' '}
            <code className="rounded bg-blue-100 px-1">[Municipio]</code>,{' '}
            <code className="rounded bg-blue-100 px-1">[Estado]</code> ? substitu?das no momento do envio.
          </p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 2 ? Audience selector
// -----------------------------------------------------------------------------

function AudienceStep({
  filters,
  onChange,
  isReadOnly = false,
}: {
  filters: AudienceFilters;
  onChange: (f: AudienceFilters) => void;
  isReadOnly?: boolean;
}) {
  const supabase = useRef(createClient()).current;

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingCount, setLoadingCount] = useState(false);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [populationRanges, setPopulationRanges] = useState<string[]>([]);

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
        console.error('Erro ao carregar op??es de audi?ncia:', err);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingCount(true);
        const res = await fetch('/api/email/audiences/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          cache: 'no-store',
          body: JSON.stringify({
            segments: filters.segments,
            page: 1,
            pageSize: 1,
          }),
        });
        if (!res.ok) return;
        const json = await res.json();
        onChange({ ...filters, totalCount: json.total ?? 0 });
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Erro ao contar audi?ncia:', err);
      } finally {
        setLoadingCount(false);
      }
    })();

    return () => controller.abort();
  }, [filters.segments]); // eslint-disable-line react-hooks/exhaustive-deps

  function getFilteredMunicipalities(segment: FilterSegment) {
    if (segment.state) return municipalities.filter((m) => m.state === segment.state);
    if (segment.region) {
      const regionStates = REGIONS[segment.region] ?? [];
      return municipalities.filter((m) => regionStates.includes(m.state));
    }
    return municipalities;
  }

  function updateSegment(index: number, key: keyof FilterSegment, value: string) {
    const nextSegments = filters.segments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) return segment;

      const next = { ...segment, [key]: value };
      if (key === 'region') {
        next.state = '';
        next.municipalityId = '';
      }
      if (key === 'state') next.municipalityId = '';
      return next;
    });

    onChange({ ...filters, segments: nextSegments });
  }

  function addSegment() {
    onChange({
      ...filters,
      segments: [...filters.segments, { ...DEFAULT_SEGMENT }],
    });
  }

  function removeSegment(index: number) {
    onChange({
      ...filters,
      segments: filters.segments.filter((_, segmentIndex) => segmentIndex !== index),
    });
  }

  const clear = () => onChange({ ...DEFAULT_AUDIENCE, segments: [{ ...DEFAULT_SEGMENT }], totalCount: 0 });

  const labelClass = 'text-sm font-medium text-slate-700';
  const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f49bd] disabled:opacity-50';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtros da audi?ncia</h2>
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

        <div className="flex flex-col gap-4">
          {filters.segments.map((segment, index) => {
            const filteredMunicipalities = getFilteredMunicipalities(segment);

            return (
              <div key={index} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Segmento {index + 1}</h3>
                    <p className="text-xs text-slate-500">
                      Os segmentos s?o combinados por uni?o de e-mails.
                    </p>
                  </div>
                  {filters.segments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSegment(index)}
                      disabled={isReadOnly}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                      aria-label={`Remover segmento ${index + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Regi?o</label>
                    <select
                      value={segment.region}
                      onChange={(e) => updateSegment(index, 'region', e.target.value)}
                      disabled={loadingFilters || isReadOnly}
                      className={selectClass}
                    >
                      <option value="">Todas as regi?es</option>
                      {Object.keys(REGIONS).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Estado</label>
                    <select
                      value={segment.state}
                      onChange={(e) => updateSegment(index, 'state', e.target.value)}
                      disabled={loadingFilters || isReadOnly}
                      className={selectClass}
                    >
                      <option value="">Todos os estados</option>
                      {(segment.region ? (REGIONS[segment.region] ?? []) : BRAZILIAN_STATES).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Munic?pio</label>
                    <select
                      value={segment.municipalityId}
                      onChange={(e) => updateSegment(index, 'municipalityId', e.target.value)}
                      disabled={loadingFilters || isReadOnly}
                      className={selectClass}
                    >
                      <option value="">Todos os munic?pios</option>
                      {filteredMunicipalities.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Faixa populacional</label>
                    <select
                      value={segment.populationRange}
                      onChange={(e) => updateSegment(index, 'populationRange', e.target.value)}
                      disabled={loadingFilters || isReadOnly}
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
                      value={segment.department}
                      onChange={(e) => updateSegment(index, 'department', e.target.value)}
                      disabled={isReadOnly}
                      className={selectClass}
                    >
                      <option value="">Todos os departamentos</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Estrat?gico</label>
                    <select
                      value={segment.strategic}
                      onChange={(e) => updateSegment(index, 'strategic', e.target.value)}
                      disabled={isReadOnly}
                      className={selectClass}
                    >
                      <option value="all">Todos</option>
                      <option value="yes">Somente estrat?gicos</option>
                      <option value="no">Somente n?o estrat?gicos</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Score m?nimo</label>
                    <input
                      type="number"
                      min="0"
                      value={segment.minScore}
                      onChange={(e) => updateSegment(index, 'minScore', e.target.value)}
                      disabled={isReadOnly}
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
                        value={segment.emailSearch}
                        onChange={(e) => updateSegment(index, 'emailSearch', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Ex.: saude, adm, compras"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0f49bd]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addSegment}
            disabled={isReadOnly}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            + Adicionar segmento
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Users className="size-7 text-[#0f49bd]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">
              E-mails dispon?veis com esta segmenta??o
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

  const audienceTags = audienceFilters.segments.flatMap((segment, index) => {
    const tags: string[] = [];
    const prefix = audienceFilters.segments.length > 1 ? `Segmento ${index + 1}: ` : '';

    if (segment.region) tags.push(`${prefix}Regi?o: ${segment.region}`);
    if (segment.state) tags.push(`${prefix}Estado: ${segment.state}`);
    if (segment.municipalityId) tags.push(`${prefix}1 munic?pio espec?fico`);
    if (segment.populationRange) tags.push(`${prefix}Pop.: ${segment.populationRange}`);
    if (segment.department) tags.push(`${prefix}Depto.: ${segment.department}`);
    if (segment.strategic === 'yes') tags.push(`${prefix}Somente estrat?gicos`);
    if (segment.strategic === 'no') tags.push(`${prefix}Somente n?o estrat?gicos`);
    if (segment.minScore.trim()) tags.push(`${prefix}Score = ${segment.minScore}`);
    if (segment.emailSearch.trim()) tags.push(`${prefix}Cont?m "${segment.emailSearch.trim()}"`);

    return tags;
  });

  const objectiveLabel: Record<string, string> = {
    'Prospecção': 'Prospecção',
    Relacionamento: 'Relacionamento',
    'Apresentação comercial': 'Apresentação comercial',
    'Follow-up': 'Follow-up',
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">

      {/* -- Validation banner --------------------------------------------- */}
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
            <p className="text-sm font-semibold text-amber-800">Aten??o: campos obrigat?rios incompletos</p>
            <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
              {!hasSubject && <li>Assunto do e-mail n?o preenchido</li>}
              {!hasHtml && <li>Conte?do HTML do e-mail ausente</li>}
              {!hasAudience && <li>Audi?ncia com 0 destinat?rios</li>}
            </ul>
          </div>
        </div>
      )}

      {/* -- Campaign info -------------------------------------------------- */}
      <SummaryCard title="Campanha" icon={<Mail className="size-4 text-[#0f49bd]" />}>
        <Row label="Nome" value={campaign.name} />
        <Row label="Objetivo" value={objectiveLabel[campaign.objective] ?? campaign.objective} />
        <Row label="Status" value={campaign.status} badge />
        {campaign.description && <Row label="Descri??o" value={campaign.description} />}
      </SummaryCard>

      {/* -- Email content -------------------------------------------------- */}
      <SummaryCard title="E-mail" icon={<FileText className="size-4 text-[#0f49bd]" />}>
        <CheckRow label="Assunto" ok={hasSubject} detail={emailForm.subject || '?'} />
        {emailForm.preheader && <Row label="Preheader" value={emailForm.preheader} />}
        <CheckRow label="HTML" ok={hasHtml} detail={
          hasHtml
            ? `${emailForm.html_content.split('\n').length} linhas`
            : 'N?o adicionado'
        } />
        <CheckRow
          label="Texto simples"
          ok={hasText}
          warn={!hasText}
          detail={hasText ? `${emailForm.text_content.split('\n').length} linhas` : 'N?o adicionado (recomendado)'}
        />
      </SummaryCard>

      {/* -- Audience ------------------------------------------------------- */}
      <SummaryCard title="Audi?ncia" icon={<Users className="size-4 text-[#0f49bd]" />}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#0f172a]">
            {audienceFilters.totalCount.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm text-slate-500">destinat?rios</span>
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
          <p className="mt-2 text-sm text-slate-500">Sem filtros aplicados ? toda a base ser? usada.</p>
        )}

        {!hasAudience && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <X className="size-3.5" /> Nenhum destinat?rio encontrado. Volte e ajuste os filtros.
          </p>
        )}
      </SummaryCard>
    </div>
  );
}

// -- Helper sub-components ----------------------------------------------------

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
// Step 4 ? Send
// -----------------------------------------------------------------------------

function SendStep({
  audienceCount,
  remainingCount,
  selectedAccountId,
  onAccountChange,
  confirmed,
  onConfirmChange,
  sendLimit,
  onSendLimitChange,
  isReadOnly = false,
}: {
  audienceCount: number;
  remainingCount: number;
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  confirmed: boolean;
  onConfirmChange: (v: boolean) => void;
  sendLimit: number;
  onSendLimitChange: (v: number) => void;
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
                {a.name} ? {a.sender_email}
              </option>
            ))}
          </select>
        )}

        {/* SPF/DKIM warning */}
        {selected && (selected.spf_status === false || selected.dkim_status === false) && (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>Aten??o:</strong> o dom?nio desta conta n?o possui{' '}
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
      </div>

      {/* Truncation warning */}
      {remainingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            O envio ser? feito apenas para destinat?rios ainda n?o enviados desta campanha.{' '}
            Ser?o disparados em lotes de 100 e-mails por hora at? atingir todos os{' '}
            <strong>{remainingCount.toLocaleString('pt-BR')}</strong> restantes.
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
            Quantos e-mails deseja enviar? Selecione um % ou o n?mero de destinat?rios que deseja
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
          O envio ser? feito apenas para destinat?rios ainda n?o enviados desta campanha.{' '}
          <strong>{remainingCount.toLocaleString('pt-BR')}</strong> restantes de{' '}
          {audienceCount.toLocaleString('pt-BR')} na audi?ncia.
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
          <span className="text-sm text-slate-500">destinat?rios no total</span>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          disabled={isReadOnly}
          className="mt-0.5 size-4 accent-[#0f49bd] disabled:opacity-50"
        />
        <span className="text-sm text-slate-700">
          Confirmo o envio de{' '}
          <strong>{sendLimit.toLocaleString('pt-BR')} e-mails</strong>
          {selected ? ` via conta "${selected.name}"` : ''}.
          Esta a??o n?o pode ser desfeita.
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
          O envio foi limitado pelo limite hor?rio da conta. Os demais destinat?rios podem ser alcan?ados em um pr?ximo disparo.
        </p>
      )}

      <button
        type="button"
        onClick={onGoBack}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0f49bd] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
      >
        <ChevronLeft className="size-4" />
        Voltar ?s Campanhas
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Unused placeholder (kept for forward compatibility)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------

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

  const isReadOnly = useIsReadOnly();

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
    setSendLimit(Math.max(0, audienceFilters.totalCount - (campaign?.sent_count ?? 0)));
  }, [audienceFilters.totalCount, campaign?.sent_count]);

  // -- Load campaign ----------------------------------------------------------
  useEffect(() => {
    // id === 'new': n?o buscar no banco ? apenas inicializar com query params do template
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
          setAudienceFilters(normalizeAudienceFilters(c.audience_filters));
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

  // -- Save helpers -----------------------------------------------------------
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
        toast.error('A audi?ncia est? vazia. Ajuste os filtros antes de continuar.');
        return false;
      }
      try {
        setIsSaving(true);
        const { error } = await supabase
          .from('email_campaigns')
          .update({ audience_filters: audienceFilters })
          .eq('id', campaignId);

        if (error) throw error;
        toast.success('Audi?ncia salva.');
        return true;
      } catch (err) {
        console.error('Erro ao salvar audi?ncia:', err);
        toast.error('Erro ao salvar audi?ncia.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [campaignId, audienceFilters, supabase],
  );

  // -- Send campaign ----------------------------------------------------------
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

  // -- Send test --------------------------------------------------------------
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

  // -- Navigation -------------------------------------------------------------
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
        toast.error('Corrija os itens pendentes antes de avan?ar para o envio.');
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

  // -- Render -----------------------------------------------------------------
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
          <AudienceStep filters={audienceFilters} onChange={setAudienceFilters} isReadOnly={isReadOnly} />
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
            remainingCount={remainingCount}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            confirmed={sendConfirmed}
            onConfirmChange={setSendConfirmed}
            sendLimit={sendLimit}
            onSendLimitChange={setSendLimit}
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

      {/* Footer ? hidden after successful send */}
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
              {currentStep === 1 ? 'Voltar ?s Campanhas' : 'Anterior'}
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

              {currentStep === 4 && (
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
                  Envio desabilitado no modo demonstra??o
                </span>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  isSaving ||
                  isSending ||
                  (currentStep === 2 && audienceFilters.totalCount === 0) ||
                  (currentStep === 3 && !summaryIsReady) ||
                  (currentStep === 4 && (!selectedAccountId || !sendConfirmed)) ||
                  isReadOnly
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



