'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Filter,
  Building2,
  Users,
  FileText,
  Handshake,
  CheckSquare,
  Search,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  BarChart2,
  Target,
  RefreshCw,
  ShieldCheck,
  Terminal,
  History,
  Mail,
  Layout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { toast } from 'sonner';

const sidebarItems = [
  {
    group: 'CRM OPERACIONAL',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Funil de Vendas', href: '/crm/pipeline', icon: Filter },
      { name: 'Prefeituras', href: '/crm/accounts', icon: Building2 },
      { name: 'Contatos', href: '/crm/contacts', icon: Users },
      { name: 'Propostas', href: '/crm/proposals', icon: FileText },
      { name: 'Contratos', href: '/crm/contracts', icon: Handshake },
      { name: 'Minhas Ações', href: '/crm/tasks', icon: CheckSquare },
    ],
  },
  {
    group: 'INTELIGÊNCIA',
    items: [
      { name: 'Oportunidades', href: '/intel/opportunities', icon: Search },
      { name: 'Análise de Mercado', href: '/intel/market-analysis', icon: BarChart3 },
      { name: 'Perfil Estratégico', href: '/intel/profile', icon: Target },
      { name: 'Relatórios', href: '/intel/reports', icon: FileText },
    ],
  },
  {
    group: 'DISPAROS DE E-MAIL',
    items: [
      { name: 'Campanhas', href: '/email/campaigns', icon: Mail },
      { name: 'Audiências', href: '/email/audiences', icon: Users },
      { name: 'Contas de envio', href: '/email/accounts', icon: Settings },
      { name: 'Templates', href: '/email/templates', icon: Layout },
      { name: 'Histórico', href: '/email/history', icon: History },
      { name: 'Estatísticas', href: '/email/estatisticas', icon: BarChart2 },
    ],
  },
  {
    group: 'SISTEMA',
    items: [
      { name: 'Configurações', href: '/settings', icon: Settings },
      { name: 'Ajuda', href: '/help', icon: HelpCircle },
    ],
  },
];

const adminItems = {
  group: 'ADMINISTRAÇÃO',
  items: [
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: ShieldCheck },
    { name: 'Importar Municípios', href: '/admin/municipalities-import', icon: Building2 },
    { name: 'Monitor PNCP', href: '/admin/pncp-sync', icon: RefreshCw },
    { name: 'Logs do Sistema', href: '/admin/system-logs', icon: Terminal },
    { name: 'Diagnóstico', href: '/admin/system-health', icon: History },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useCompany();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada com sucesso.');
      router.push('/login');
    } catch {
      toast.error('Erro ao encerrar sessão.');
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0d121b] text-white border-r border-gray-800 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-[#0f49bd] aspect-square rounded-lg size-10 flex items-center justify-center text-white font-bold text-xl">
          CM
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-base font-bold leading-tight">CM Pro</h1>
          <p className="text-gray-400 text-xs font-normal">Plataforma B2G</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {role === 'platform_admin' && (
          <div className="flex flex-col gap-1">
            <h3 className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {adminItems.group}
            </h3>
            {adminItems.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-[#0f49bd] text-white shadow-md'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-5',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}

        {sidebarItems.map((group) => (
          <div key={group.group} className="flex flex-col gap-1">
            <h3 className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {group.group}
            </h3>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-[#0f49bd] text-white shadow-md'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-5',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div
          onClick={handleSignOut}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          <div className="bg-gray-600 h-8 w-8 rounded-full flex items-center justify-center overflow-hidden relative">
            <Image
              src={`https://picsum.photos/seed/${user?.id || 'user'}/100/100`}
              alt="Profile"
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {user?.email?.split('@')[0] || 'Usuário'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email || 'email@empresa.com.br'}
            </p>
          </div>
          <LogOut className="size-4 text-gray-500 ml-auto" />
        </div>
      </div>
    </aside>
  );
}
