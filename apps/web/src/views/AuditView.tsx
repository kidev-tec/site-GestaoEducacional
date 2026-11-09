import { useAuditCount } from '../hooks/useData';

export function AuditView() {
  const { state, reload } = useAuditCount();

  return (
    <section aria-labelledby="audit-heading">
      <h2 id="audit-heading">Auditoria</h2>
      {state.status === 'loading' && <p role="status">Carregando…</p>}
      {state.status === 'error' && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {state.message} <button onClick={reload}>Tentar novamente</button>
        </p>
      )}
      {state.status === 'ok' && (
        <p>
          Registros de auditoria deste tenant: <strong data-testid="audit-count">{state.data}</strong>
        </p>
      )}
    </section>
  );
}
