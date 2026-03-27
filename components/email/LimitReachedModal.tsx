'use client';

import { X, Zap, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailsUsed: number;
  emailsLimit: number;
}

export default function LimitReachedModal({ isOpen, onClose, emailsUsed, emailsLimit }: LimitReachedModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const percent = Math.min(Math.round((emailsUsed / emailsLimit) * 100), 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="size-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Mail className="size-6 text-red-500" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Limite de e-mails atingido</h2>
        <p className="text-sm text-gray-500 mb-6">
          Você utilizou todos os {emailsLimit.toLocaleString('pt-BR')} e-mails do seu plano este mês.
        </p>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>E-mails utilizados</span>
            <span>{emailsUsed.toLocaleString('pt-BR')} / {emailsLimit.toLocaleString('pt-BR')}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percent}% utilizado</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { onClose(); router.push('/settings?tab=Assinatura'); }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="size-4" />
            Fazer upgrade de plano
          </button>

          <button
            onClick={() => { onClose(); router.push('/settings?tab=Assinatura'); }}
            className="w-full py-3 border border-blue-600 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all"
          >
            Comprar 5.000 e-mails por R$ 80
          </button>

          <button onClick={onClose} className="w-full py-3 text-gray-400 text-sm hover:text-gray-600 transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
