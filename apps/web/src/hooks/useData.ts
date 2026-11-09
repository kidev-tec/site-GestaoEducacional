/** Hooks de dados (RF-013/014/016): estados loading/erro/vazio explícitos. */
import { useState, useEffect, useCallback } from 'react';
import { ApiError, getV1LedgerBalance, getV1AuditCount } from '../api-client/client';
import { humanError } from '../lib/domain';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

function toMessage(e: unknown): string {
  if (e instanceof ApiError) return humanError(e.status, String(e.body));
  return 'Falha de conexão com a API. Verifique se ela está rodando.';
}

/** Looping de carga simples com retry manual. */
export function useAsync<T>(fn: () => Promise<T>): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fn().then(
      (data) => {
        if (!cancelled) setState({ status: 'ok', data });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: toMessage(e) });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, reload };
}

export function useLedgerBalance() {
  return useAsync(async () => {
    const r = (await getV1LedgerBalance()) as { balanceCents: number };
    return r.balanceCents;
  });
}

export function useAuditCount() {
  return useAsync(async () => {
    const r = (await getV1AuditCount()) as { count: number };
    return r.count;
  });
}
