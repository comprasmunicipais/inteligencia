'use client';

import { History } from 'lucide-react';

export default function EmailHistoryPage() {
  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Histórico</h1>
          <p className="text-sm text-slate-600">
            Acompanhe todos os disparos realizados pela plataforma.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
            <History className="size-8 text-[#0f49bd]" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhum disparo registrado</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            O histórico de disparos aparecerá aqui após o primeiro envio.
          </p>
        </div>
      </div>
    </div>
  );
}
