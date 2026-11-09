import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  configureApi,
  getHealth,
  getOpenapiJson,
  getV1AuditCount,
  getV1EnrollmentsId,
  getV1LedgerBalance,
  postV1Enrollments,
  postV1EnrollmentsIdTransition,
  postV1LedgerEntries,
} from '../src/api-client/client';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function response(body: unknown, ok = true, status = 200, contentType = 'application/json') {
  return {
    ok,
    status,
    headers: { get: () => contentType },
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  };
}

describe('client OpenAPI gerado', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    configureApi({ baseUrl: 'http://api.test', getTenantId: () => 'tenant-A' });
  });

  it('GET sem body: health, openapi, saldo e audit', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    await getHealth();
    await getOpenapiJson();
    await getV1LedgerBalance();
    await getV1AuditCount();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'http://api.test/health',
      'http://api.test/openapi.json',
      'http://api.test/v1/ledger/balance',
      'http://api.test/v1/audit/count',
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers['x-tenant-id']).toBe('tenant-A');
      expect(init.body).toBeUndefined();
    }
  });

  it('POST matrícula envia JSON, tenant e idempotency-key', async () => {
    fetchMock.mockResolvedValue(response({ id: 'e1' }));
    await postV1Enrollments({ studentId: 's', offerId: 'o' }, 'key-1');
    const call = fetchMock.mock.calls[0] as [{ href?: string }, { method: string; body: string; headers: Record<string, string> }];
    const init = call[1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ studentId: 's', offerId: 'o' }));
    expect(init.headers).toMatchObject({ 'idempotency-key': 'key-1', 'x-tenant-id': 'tenant-A' });
  });

  it('substitui e URL-encoda path param para GET e transition', async () => {
    fetchMock.mockResolvedValue(response({ id: 'x' }));
    await getV1EnrollmentsId('id/ com espaço');
    await postV1EnrollmentsIdTransition('x/y', { to: 'ACTIVE' });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/v1/enrollments/id%2F%20com%20espa%C3%A7o');
    expect(fetchMock.mock.calls[1]![0]).toBe('http://api.test/v1/enrollments/x%2Fy/transition');
  });

  it('POST ledger envia a chave idempotente', async () => {
    fetchMock.mockResolvedValue(response({ id: 'l1' }));
    await postV1LedgerEntries({ type: 'CHARGE', amountCents: 100 }, 'ledger-key');
    const call = fetchMock.mock.calls[0] as [unknown, { headers: Record<string, string> }];
    expect(call[1].headers['idempotency-key']).toBe('ledger-key');
  });

  it('resposta JSON não-2xx vira ApiError com body', async () => {
    fetchMock.mockResolvedValue(response({ error: 'conflict' }, false, 409));
    const err = (await getHealth().catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.body).toEqual({ error: 'conflict' });
  });

  it('resposta texto válida retorna texto; não-JSON com erro preserva body', async () => {
    fetchMock.mockResolvedValueOnce(response('OK', true, 200, 'text/plain'));
    await expect(getHealth()).resolves.toBe('OK');
    fetchMock.mockResolvedValueOnce(response('nope', false, 503, 'text/plain'));
    const err = (await getHealth().catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(503);
    expect(err.body).toBe('nope');
  });

  it('parametro ausente falha antes da rede', async () => {
    // função gerada é TS-safe; ataque em runtime ainda deve falhar localmente.
    await expect(getV1EnrollmentsId('' as string)).rejects.toThrow('missing path param id');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('config default lê tenant do localStorage (módulo fresco)', async () => {
    vi.resetModules();
    localStorage.setItem('erp-tenant', 'B');
    fetchMock.mockResolvedValue(response({ ok: true }));
    const fresh = await import('../src/api-client/client.js');
    await fresh.getHealth();
    const init = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers['x-tenant-id']).toBe('B');
    localStorage.setItem('erp-tenant', '');
    await fresh.getHealth();
    const init2 = fetchMock.mock.calls[1]![1] as { headers: Record<string, string> };
    expect(init2.headers['x-tenant-id']).toBe('');
    localStorage.removeItem('erp-tenant');
    await fresh.getHealth();
    const init3 = fetchMock.mock.calls[2]![1] as { headers: Record<string, string> };
    expect(init3.headers['x-tenant-id']).toBe('');
  });
});
