import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, Landmark, MapPin } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

type DealDetailRow = {
  id: string;
  company_id: string;
  municipality_id: string | null;
  title: string;
  estimated_value: number | null;
  status: string | null;
  created_at: string | null;
  source: string | null;
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

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/75 bg-white/80 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1.5 text-sm text-slate-800">{value}</div>
    </div>
  );
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
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    notFound();
  }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, company_id, municipality_id, title, estimated_value, status, created_at, source')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .maybeSingle<DealDetailRow>();

  if (dealError || !deal) {
    notFound();
  }

  let municipality: MunicipalityDetailRow | null = null;

  if (deal.municipality_id) {
    const { data: municipalityData } = await supabase
      .from('municipalities')
      .select('id, name, city, state, mayor_name, website, email, phone')
      .eq('id', deal.municipality_id)
      .maybeSingle<MunicipalityDetailRow>();

    municipality = municipalityData ?? null;
  }

  const websiteUrl = safeWebsite(municipality?.website);

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
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusTone(deal.status)}`}
                >
                  {safeText(deal.status)}
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
                <FieldRow label="Status" value={safeText(deal.status)} />
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

          <aside className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] shadow-[0_14px_36px_rgba(148,163,184,0.12)]">
            <div className="border-b border-slate-200/80 bg-white/55 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Prefeitura
              </p>
              <h2 className="mt-1.5 text-xl font-semibold text-slate-900">Prefeitura vinculada</h2>
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
  );
}
