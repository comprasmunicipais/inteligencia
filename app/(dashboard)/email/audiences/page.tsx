'use client';

import { Users } from 'lucide-react';

export default function EmailAudiencesPage() {
  return (
    <div className="min-h-full bg-[#f8fafc] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">Audiências</h1>
          <p className="text-sm text-slate-600">
            Gerencie os públicos para seus disparos de e-mail.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
            <Users className="size-8 text-[#0f49bd]" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma audiência cadastrada</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Em breve você poderá segmentar contatos por prefeitura, região, oportunidade e perfil.
          </p>
        </div>
      </div>
    </div>
  );
}
```

E substitua o arquivo de Templates:
```
inteligencia/app/(dashboard)/email/templates/page.tsx
