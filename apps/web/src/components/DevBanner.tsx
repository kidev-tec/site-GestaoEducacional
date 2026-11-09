/**
 * RF-020 — Banner "Modo Desenvolvimento local" + diagnóstico de API.
 * Estados: checking → online → offline (com retry). Acessível (role=status,
 * aria-live), sem fricção: banner fixo, diagnóstico humano quando offline.
 */
import { useApiStatus } from '../hooks/useApiStatus';

export function DevBanner() {
  const { status, endpoint, retry, checking } = useApiStatus();

  if (status === 'online') {
    return (
      <div
        role="status"
        aria-label="Modo desenvolvimento local"
        style={{
          background: 'var(--brand-teal, #0F8E98)',
          color: '#fff',
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Modo Desenvolvimento local · endpoint {endpoint}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-label="API indisponível"
      style={{
        background: 'var(--brand-gold, #C19B55)',
        color: '#14243A',
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <p style={{ margin: '0 0 6px' }}>
        {checking
          ? 'Verificando conexão com a API…'
          : 'API indisponível — o app funciona, mas os dados não carregam.'}
      </p>
      <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
        <li>Verifique se a API está rodando em {endpoint}</li>
        <li>Verifique se o banco de dados local está ativo</li>
      </ul>
      <button onClick={retry} disabled={checking} className="primary">
        {checking ? 'Verificando…' : 'Tentar de novo'}
      </button>
    </div>
  );
}
