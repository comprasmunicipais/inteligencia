'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Algo deu errado</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', maxWidth: 360 }}>
        {error?.message || 'Ocorreu um erro inesperado. Nossa equipe foi notificada.'}
      </p>
      <button
        onClick={reset}
        style={{ padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
