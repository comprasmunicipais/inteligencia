import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, ExternalLink, Landmark, MapPin } from 'lucide-react';

import { evaluateCompanyAccess, type AccessReason } from '@/lib/billing-guard';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

type DealDetailRow = {
  id: string;
  company_id: string;
  municipality_id: string | null;
  opportunity_id: string | null;
  title: string;
  estimated_value: number | null;
  status: string | null;
  created_at: string | null;
  source: string | null;
};

type OpportunityDetailRow = {
  id: string;
  title: string | null;
  organ_name: string | null;
  modality: string | null;
  estimated_value: number | null;
  situation: string | null;
  internal_status: string | null;
  publication_date: string | null;
  opening_date: string | null;
  official_url: string | null;
};

type MunicipalityDetailRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  mayor_name: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
};

type PipelineStageDetailRow = {
  id: string;
  title: string;
  color: string | null;
};

type ContactDetailRow = {
  id: string;
  name: string;
  role: string | null;
  department: string | null;
  secretariat: string | null;
  email: string | null;
  whatsapp: string | null;
};

type TaskDetailRow = {
  id: string;
  title: string | null;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
};

type LatestTaskMovementRow = {
  id: string;
  title: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type RelatedProposalRow = {
  id: string;
  title: string | null;
  status: string | null;
  value: number | null;
  date: string | null;
  created_at: string | null;
  opportunity_id: string | null;
};

const emptyLabel = 'Não informado';

function safeText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : emptyLabel;
}

function safeWebsite(url: string | null | undefined) {
  if (!url || url.trim().length === 0) return null;
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

function formatSource(source: string | null) {
  if (!source) return emptyLabel;

  return source
    .split(/[_-]/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getStatusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? '';

  if (
    normalized.includes('ganho') ||
    normalized.includes('ativo') ||
    normalized.includes('fechado')
  ) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (
    normalized.includes('proposta') ||
    normalized.includes('andamento') ||
    normalized.includes('negocia')
  ) {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }

  if (
    normalized.includes('perdido') ||
    normalized.includes('cancel')
  ) {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getStageBadgeTone(color: string | null, title: string | null) {
  switch (color) {
    case 'bg-green-500':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'bg-blue-500':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'bg-yellow-400':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'bg-orange-500':
      return 'bg-orange-50 text-orange-700 ring-orange-200';
    case 'bg-red-500':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'bg-purple-500':
      return 'bg-purple-50 text-purple-700 ring-purple-200';
    case 'bg-cyan-500':
      return 'bg-cyan-50 text-cyan-700 ring-cyan-200';
    case 'bg-gray-400':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    default:
      return getStatusTone(title);
  }
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/75 bg-white/80 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1.5 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function getBlockedRoute(reason: AccessReason) {
  if (reason === 'no_plan') {
    return '/signup/plan?error=plan_required';
  }

  return `/settings?billing=blocked&reason=${reason}`;
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    notFound();
  }

  const isDemo = user.user_metadata?.is_demo === true;
  const isDevUser = user.email === 'feddamico@hotmail.com';
  const isPlatformAdmin = profile.role === 'platform_admin';

  if (!isPlatformAdmin && !isDemo && !isDevUser) {
    const [{ data: companyBilling, error: companyBillingError }, { data: subscription, error: subscriptionError }] = await Promise.all([
      supabase
        .from('companies')
        .select('plan_id, status')
        .eq('id', profile.company_id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status')
        .eq('company_id', profile.company_id)
        .maybeSingle(),
    ]);

    const decision = evaluateCompanyAccess({
      companyStatus: companyBillingError ? '__invalid__' : companyBilling?.status ?? null,
      planId: companyBilling?.plan_id ?? null,
      subscriptionStatus: subscriptionError ? '__invalid__' : subscription?.status ?? null,
    });

    if (!decision.allowed) {
      redirect(getBlockedRoute(decision.reason));
    }
  }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, company_id, municipality_id, opportunity_id, title, estimated_value, status, created_at, source')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .maybeSingle<DealDetailRow>();

  if (dealError || !deal) {
    notFound();
  }

  let municipality: MunicipalityDetailRow | null = null;
  let stage: PipelineStageDetailRow | null = null;
  let contacts: ContactDetailRow[] = [];
  let openTasks: TaskDetailRow[] = [];
  let latestTaskMovement: LatestTaskMovementRow | null = null;
  let relatedProposals: RelatedProposalRow[] = [];
  let linkedOpportunity: OpportunityDetailRow | null = null;
  let linkedOpportunityUnavailable = false;

  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, priority, status')
    .eq('company_id', profile.company_id)
    .eq('deal_id', deal.id)
    .neq('status', 'concluÃ­do')
    .neq('status', 'finalizado')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5);

  openTasks = (tasksData ?? []) as TaskDetailRow[];

  if (deal.status) {
    const { data: stageData } = await supabase
      .from('pipeline_stages')
      .select('id, title, color')
      .eq('id', deal.status)
      .eq('company_id', profile.company_id)
      .maybeSingle<PipelineStageDetailRow>();

    stage = stageData ?? null;
  }

  if (deal.opportunity_id) {
    const { data: opportunityData, error: opportunityError } = await supabase
      .from('opportunities')
      .select(
        'id, title, organ_name, modality, estimated_value, situation, internal_status, publication_date, opening_date, official_url'
      )
      .eq('id', deal.opportunity_id)
      .maybeSingle<OpportunityDetailRow>();

    if (opportunityError || !opportunityData) {
      linkedOpportunityUnavailable = true;
    } else {
      linkedOpportunity = opportunityData;
    }
  }

  if (deal.municipality_id) {
    const { data: municipalityData } = await supabase
      .from('municipalities')
      .select('id, name, city, state, mayor_name, website, email, phone')
      .eq('id', deal.municipality_id)
      .maybeSingle<MunicipalityDetailRow>();

    municipality = municipalityData ?? null;

    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, name, role, department, secretariat, email, whatsapp')
      .eq('company_id', profile.company_id)
      .eq('municipality_id', deal.municipality_id)
      .order('name', { ascending: true })
      .limit(6);

    contacts = (contactsData ?? []) as ContactDetailRow[];

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, priority, status')
      .eq('company_id', profile.company_id)
      .eq('deal_id', deal.id)
      .neq('status', 'concluÃ­do')
      .neq('status', 'finalizado')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);

    openTasks = (tasksData ?? []) as TaskDetailRow[];

    const { data: latestTaskData } = await supabase
      .from('tasks')
      .select('id, title, priority, status, due_date, updated_at, created_at')
      .eq('company_id', profile.company_id)
      .eq('municipality_id', deal.municipality_id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1);

    latestTaskMovement = ((latestTaskData ?? [])[0] ?? null) as LatestTaskMovementRow | null;

    const { data: proposalsData } = await supabase
      .from('proposals')
      .select('id, title, status, value, date, created_at, opportunity_id')
      .eq('company_id', profile.company_id)
      .eq('municipality_id', deal.municipality_id)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(5);

    relatedProposals = (proposalsData ?? []) as RelatedProposalRow[];
  }

  const websiteUrl = safeWebsite(municipality?.website);
  const stageLabel = stage?.title ?? 'Etapa não encontrada';
  const stageBadgeTone = getStageBadgeTone(stage?.color ?? null, stage?.title ?? null);
  const latestMovementDate = latestTaskMovement?.updated_at ?? latestTaskMovement?.created_at ?? null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f2f5fa] px-5 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Link
          href="/crm/pipeline"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#0f49bd]"
        >
          <ArrowLeft className="size-4" />
          Voltar para o funil
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#13294b_58%,#173867_100%)] text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
                  Deal Room
                </span>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                    {deal.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-200">
                    Visão consolidada do negócio e da prefeitura vinculada, preservando o contexto
                    operacional atual do CRM.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stageBadgeTone}`}
                >
                  {stageLabel}
                </span>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left shadow-sm backdrop-blur-[2px] lg:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                    Valor estimado
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatCurrency(deal.estimated_value ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Origem
                </p>
                <p className="mt-1 text-sm font-medium text-white">{formatSource(deal.source)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Criação
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {deal.created_at ? formatDate(deal.created_at) : emptyLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Prefeitura vinculada
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {municipality?.name ?? 'Nenhuma prefeitura vinculada'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] shadow-[0_14px_36px_rgba(148,163,184,0.12)]">
            <div className="border-b border-slate-200/80 bg-white/55 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Negócio
              </p>
              <h2 className="mt-1.5 text-xl font-semibold text-slate-900">Dados do Negócio</h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#e8f0ff] p-3 text-[#0f49bd]">
                    <Building2 className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Título do negócio
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{deal.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Registro comercial em modo consulta, sem edição e sem alteração de fluxo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label="Status" value={stageLabel} />
                <FieldRow
                  label="Valor estimado"
                  value={<span className="font-medium text-slate-900">{formatCurrency(deal.estimated_value ?? 0)}</span>}
                />
                <FieldRow label="Origem" value={formatSource(deal.source)} />
                <FieldRow
                  label="Data de criação"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-slate-400" />
                      {deal.created_at ? formatDate(deal.created_at) : emptyLabel}
                    </span>
                  }
                />
              </div>
            </div>
          </section>

          <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Execução
              </p>
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Próximas Ações
                </h3>
                <Link
                  href="/crm/tasks"
                  className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#0f49bd] hover:text-[#0f49bd]"
                >
                  Nova tarefa
                </Link>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Ações comerciais abertas relacionadas a este negócio
              </p>
            </div>

            {openTasks.length > 0 ? (
              <div className="space-y-3">
                {openTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={index !== openTasks.length - 1 ? 'border-b border-slate-200/70 pb-3' : ''}
                  >
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {safeText(task.title)}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Prazo: {task.due_date ? formatDate(task.due_date) : 'Sem prazo'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          Prioridade: {safeText(task.priority)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Status: {safeText(task.status)}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs leading-5 text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                <p className="text-sm leading-6 text-slate-600">
                  Nenhuma ação comercial aberta para este negócio.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] shadow-[0_14px_36px_rgba(148,163,184,0.12)]">
            <div className="p-5">
              <div className="mb-5 rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Movimento
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                    Última movimentação
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Registro operacional mais recente relacionado a esta prefeitura
                  </p>
                </div>

                {latestTaskMovement ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {safeText(latestTaskMovement.title)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        Status: {safeText(latestTaskMovement.status)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Prioridade: {safeText(latestTaskMovement.priority)}
                      </span>
                      {latestTaskMovement.due_date && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Prazo: {formatDate(latestTaskMovement.due_date)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      Atualizado em {latestMovementDate ? formatDate(latestMovementDate) : emptyLabel}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                      Nenhuma movimentação operacional recente.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Licitação
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                    Licitação vinculada
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Oportunidade original associada a este negócio
                  </p>
                </div>

                {linkedOpportunity ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200/75 bg-slate-50/85 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Título / objeto
                      </p>
                      <h4 className="mt-2 text-base font-semibold text-slate-900">
                        {safeText(linkedOpportunity.title)}
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {safeText(linkedOpportunity.organ_name)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldRow label="Modalidade" value={safeText(linkedOpportunity.modality)} />
                      <FieldRow
                        label="Valor estimado"
                        value={
                          <span className="font-medium text-slate-900">
                            {linkedOpportunity.estimated_value !== null
                              ? formatCurrency(linkedOpportunity.estimated_value)
                              : emptyLabel}
                          </span>
                        }
                      />
                      <FieldRow label="Status" value={safeText(linkedOpportunity.situation || linkedOpportunity.internal_status)} />
                      <FieldRow
                        label="Data de abertura"
                        value={
                          linkedOpportunity.opening_date ? (
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="size-4 text-slate-400" />
                              {formatDate(linkedOpportunity.opening_date)}
                            </span>
                          ) : (
                            emptyLabel
                          )
                        }
                      />
                      <FieldRow
                        label="Data de publicação"
                        value={
                          linkedOpportunity.publication_date ? (
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="size-4 text-slate-400" />
                              {formatDate(linkedOpportunity.publication_date)}
                            </span>
                          ) : (
                            emptyLabel
                          )
                        }
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/intel/opportunities?opportunityId=${linkedOpportunity.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f49bd] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a3690]"
                      >
                        Ver oportunidade
                      </Link>
                      {linkedOpportunity.official_url && (
                        <a
                          href={linkedOpportunity.official_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0f49bd] hover:text-[#0f49bd]"
                        >
                          Abrir edital
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : linkedOpportunityUnavailable ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                      A licitação vinculada não está mais disponível para exibição.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                      Este negócio não possui licitação vinculada.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Propostas
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                    Propostas relacionadas
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Propostas registradas para esta prefeitura
                  </p>
                </div>

                {relatedProposals.length > 0 ? (
                  <div className="space-y-3">
                    {relatedProposals.map((proposal, index) => (
                      <div
                        key={proposal.id}
                        className={index !== relatedProposals.length - 1 ? 'border-b border-slate-200/70 pb-3' : ''}
                      >
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {safeText(proposal.title)}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getStatusTone(proposal.status)}`}
                            >
                              Status: {safeText(proposal.status)}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              Valor: {proposal.value !== null ? formatCurrency(proposal.value) : emptyLabel}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              Data: {proposal.date ? formatDate(proposal.date) : proposal.created_at ? formatDate(proposal.created_at) : emptyLabel}
                            </span>
                            {deal.opportunity_id && proposal.opportunity_id === deal.opportunity_id && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                Mesma licitação
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5">
                    <p className="text-sm leading-6 text-slate-600">
                      Nenhuma proposta registrada para esta prefeitura.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </section>

          <aside className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] shadow-[0_14px_36px_rgba(148,163,184,0.12)]">
            <div className="border-b border-slate-200/80 bg-white/55 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Prefeitura
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Prefeitura vinculada</h2>
                {municipality?.id && (
                  <Link
                    href={`/crm/accounts/${municipality.id}`}
                    className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#0f49bd] hover:text-[#0f49bd]"
                  >
                    Ver prefeitura
                  </Link>
                )}
              </div>
            </div>

            <div className="p-5">
              {municipality ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#edf3fb] p-3 text-slate-700">
                        <Landmark className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Prefeitura vinculada
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{municipality.name}</h3>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="size-4 text-slate-400" />
                          {safeText(
                            municipality.city || municipality.state
                              ? `${municipality.city ?? ''}${municipality.city && municipality.state ? '/' : ''}${municipality.state ?? ''}`
                              : null
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <FieldRow label="Prefeito" value={safeText(municipality.mayor_name)} />
                    <FieldRow
                      label="Website"
                      value={
                        websiteUrl ? (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[#0f49bd] hover:underline"
                          >
                            {safeText(municipality.website)}
                          </a>
                        ) : (
                          safeText(municipality.website)
                        )
                      }
                    />
                    <FieldRow label="E-mail" value={safeText(municipality.email)} />
                    <FieldRow label="Telefone" value={safeText(municipality.phone)} />
                  </div>

                  <div className="rounded-[24px] border border-slate-200/75 bg-white/85 p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Relacionamento
                      </p>
                      <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                        Contatos da prefeitura
                      </h3>
                    </div>

                    {contacts.length > 0 ? (
                      <div className="space-y-3">
                        {contacts.map((contact, index) => (
                          <div
                            key={contact.id}
                            className={`pb-3 ${index !== contacts.length - 1 ? 'border-b border-slate-200/70' : ''}`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                            {contact.role && (
                              <p className="mt-1 text-sm text-slate-600">{contact.role}</p>
                            )}
                            {(contact.secretariat || contact.department) && (
                              <p className="mt-1 text-xs text-slate-500">
                                {[contact.secretariat, contact.department].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {(contact.email || contact.whatsapp) && (
                              <div className="mt-1.5 space-y-1 text-xs text-slate-500">
                                {contact.email && <p>{contact.email}</p>}
                                {contact.whatsapp && <p>{contact.whatsapp}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-slate-600">
                        Nenhum contato cadastrado para esta prefeitura.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/75 px-5 py-8 text-center shadow-sm">
                  <Landmark className="mx-auto size-8 text-slate-300" />
                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    Prefeitura não vinculada
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Este negócio ainda não possui uma prefeitura vinculada para exibição nesta
                    visualização.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}



