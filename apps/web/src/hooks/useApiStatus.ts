/**
 * RF-020 — Status da API para o banner: verifica /health periodicamente
 * e sob demanda (retry). ONLINE após primeira resposta OK; offline caso falhe.
 */
import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../api-client/client';

export type ApiStatus = 'checking' | 'online' | 'offline';

const CHECK_INTERVAL_MS = 30_000;

export function useApiStatus(): {
  status: ApiStatus;
  endpoint: string;
  checking: boolean;
  retry: () => void;
} {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    getHealth()
      .then(() => {
        if (!cancelled) {
          setStatus('online');
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('offline');
          setChecking(false);
        }
      });
    const timer = setInterval(() => setAttempt((a) => a + 1), CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const endpoint =
    (import.meta.env?.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

  return { status, endpoint, checking, retry };
}
