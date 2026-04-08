'use client';

import { useIsReadOnly } from '@/hooks/useIsReadOnly';

export function DemoBanner() {
  const isReadOnly = useIsReadOnly();

  if (!isReadOnly) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <span className="text-amber-800 font-medium">
        Você está no modo demonstração — navegação liberada, edições desabilitadas.
      </span>
      <a
        href="/signup"
        className="shrink-0 text-amber-900 font-bold underline underline-offset-2 hover:text-amber-700 transition-colors"
      >
        Quero contratar →
      </a>
    </div>
  );
}
