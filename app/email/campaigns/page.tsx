'use client';

import { Mail, Plus, Search, Filter } from 'lucide-react';

export default function EmailCampaignsPage() {
  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Campanhas</h1>
          <p className="text-sm text-slate-600">
            Gerencie campanhas de e-mail, públicos, modelos e histórico de disparos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Campanhas Ativas
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Rascunhos
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Enviadas
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Taxa de Resposta
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-900">0%</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar campanhas"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0f49bd]"
                />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Filter className="size-4" />
                Filtrar
              </button>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f49bd] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0c3c9c]"
            >
              <Plus className="size-4" />
              Nova Campanha
            </button>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
              <Mail className="size-8 text-[#0f49bd]" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Nenhuma campanha cadastrada
            </h2>

            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Este é o ponto inicial do módulo de Disparos de E-mail. No próximo passo,
              vamos transformar esta tela em uma listagem real de campanhas com criação,
              filtros e status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
