import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          CM <span style={{ color: '#3b82f6' }}>PRO</span>
        </span>
      </div>
      <p style={{ fontSize: 72, fontWeight: 900, color: '#e2e8f0', margin: '0 0 8px', lineHeight: 1 }}>404</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Página não encontrada</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', maxWidth: 360 }}>
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        style={{ padding: '12px 28px', background: '#1d4ed8', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
