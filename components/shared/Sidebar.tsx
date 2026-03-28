'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

function getInitials(email?: string) {
  if (!email) return 'U';
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');

        .sb-root {
          width: 256px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: #0d1120;
          border-right: 1px solid rgba(255,255,255,0.06);
          height: 100vh;
          position: sticky;
          top: 0;
          font-family: 'Outfit', sans-serif;
        }

        /* Header */
        .sb-header {
          padding: 20px 18px 18px;
          display: flex;
          align-items: center;
          gap: 11px;
          flex-shrink: 0;
        }

        .sb-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          box-shadow: 0 0 0 1px rgba(59,130,246,0.35), 0 4px 12px rgba(37,99,235,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sb-brand-name {
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .sb-brand-name span {
          color: #3b82f6;
        }

        .sb-brand-sub {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.4);
          margin-top: 1px;
        }

        /* Nav */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          padding: 4px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }

        .sb-nav::-webkit-scrollbar {
          width: 3px;
        }
        .sb-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sb-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.07);
          border-radius: 2px;
        }

        .sb-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 6px 4px 10px;
        }

        .sb-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
          margin-bottom: 4px;
        }

        .sb-group-label {
          padding: 8px 10px 5px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.35);
        }

        .sb-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(148,163,184,0.7);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 400;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
        }

        .sb-item:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(203,213,225,0.9);
        }

        .sb-item.active {
          background: rgba(37,99,235,0.12);
          color: #93c5fd;
        }

        .sb-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 2.5px;
          border-radius: 0 2px 2px 0;
          background: #3b82f6;
        }

        .sb-item-icon {
          flex-shrink: 0;
          color: inherit;
          transition: color 0.15s;
        }

        .sb-item.active .sb-item-icon {
          color: #60a5fa;
        }

        /* Footer */
        .sb-footer {
          padding: 10px 12px 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .sb-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .sb-user:hover {
          background: rgba(255,255,255,0.04);
        }

        .sb-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }

        .sb-user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sb-user-name {
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(226,232,240,0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-user-email {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: rgba(100,116,139,0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-logout-icon {
          flex-shrink: 0;
          color: rgba(100,116,139,0.5);
          transition: color 0.15s;
        }

        .sb-user:hover .sb-logout-icon {
          color: rgba(148,163,184,0.7);
        }
      `}</style>

      <aside className="sb-root">
        {/* Header */}
        <div className="sb-header">
          <div className="sb-logo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9"/>
              <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <div className="sb-brand-name">CM <span>PRO</span></div>
            <div className="sb-brand-sub">Plataforma B2G</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          {role === 'platform_admin' && (
            <>
              <div className="sb-group">
                <div className="sb-group-label">{adminItems.group}</div>
                {adminItems.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn('sb-item', isActive && 'active')}
                    >
                      <item.icon className="sb-item-icon" size={15} strokeWidth={1.75} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
              <div className="sb-divider" />
            </>
          )}

          {sidebarItems.map((group, gi) => (
            <React.Fragment key={group.group}>
              {gi > 0 && <div className="sb-divider" />}
              <div className="sb-group">
                <div className="sb-group-label">{group.group}</div>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn('sb-item', isActive && 'active')}
                    >
                      <item.icon className="sb-item-icon" size={15} strokeWidth={1.75} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-user" onClick={handleSignOut}>
            <div className="sb-avatar">
              {getInitials(user?.email)}
            </div>
            <div className="sb-user-info">
              <div className="sb-user-name">{user?.email?.split('@')[0] || 'Usuário'}</div>
              <div className="sb-user-email">{user?.email || 'email@empresa.com.br'}</div>
            </div>
            <LogOut className="sb-logout-icon" size={14} strokeWidth={1.75} />
          </div>
        </div>
      </aside>
    </>
  );
}
