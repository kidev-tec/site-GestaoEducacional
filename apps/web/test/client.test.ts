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
    configureApi({ baseUrl: 'http://api.test', getTenantId: () => 'tenant-A', getAccessToken: () => 'tok-1' });
  });

  it('GET sem body: health, openapi, saldo e audit', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    await getHealth();
    await getOpenapiJson();
    await getV1LedgerBalance();
    await getV1AuditCount();
    configureApi({ getAccessToken: () => '' });
    await getHealth();
    configureApi({ getAccessToken: () => 'tok-1' });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'http://api.test/health',
      'http://api.test/openapi.json',
      'http://api.test/v1/ledger/balance',
      'http://api.test/v1/audit/count',
      'http://api.test/health',
    ]);
    for (const [index, [, init]] of fetchMock.mock.calls.entries()) {
      expect(init.headers.authorization).toBe(index === 4 ? undefined : 'Bearer tok-1');
      expect(init.headers['x-tenant-id']).toBeUndefined();
      expect(init.body).toBeUndefined();
    }
  });

  it('POST matrícula envia JSON, bearer e idempotency-key', async () => {
    fetchMock.mockResolvedValue(response({ id: 'e1' }));
    await postV1Enrollments({ studentId: 's', offerId: 'o' }, 'key-1');
    const call = fetchMock.mock.calls[0] as [{ href?: string }, { method: string; body: string; headers: Record<string, string> }];
    const init = call[1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ studentId: 's', offerId: 'o' }));
    expect(init.headers).toMatchObject({ 'idempotency-key': 'key-1', authorization: 'Bearer tok-1' });
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

  it('operações auth, people e unidades enviam métodos, paths, body e path params corretos', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    const api = await import('../src/api-client/client.js');
    await api.postV1AuthRegister({ email: 'a@test', password: 'segura' });
    await api.postV1AuthLogin({ email: 'a@test', password: 'segura' });
    await api.postV1AuthLogout({});
    await api.getV1AuthMe();
    await api.getReady();
    await api.postV1Units({ name: 'Sede' });
    fetchMock.mockClear();
    await api.postV1Units({ name: 'Sede' });
    await api.getV1Units();
    await api.postV1People({ name: 'Ana', kind: 'STUDENT', unitId: 'u1' });
    await api.getV1People();
    await api.getV1PeopleId('p/a');
    await api.patchV1PeopleId('p/a', { active: false });
    await api.postV1PeopleIdGuardians('s/a', { guardianId: 'g/a', relation: 'mother' });
    await api.getV1PeopleIdGuardians('s/a');
    expect(fetchMock.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([
      ['http://api.test/v1/units', 'POST'], ['http://api.test/v1/units', 'GET'],
      ['http://api.test/v1/people', 'POST'], ['http://api.test/v1/people', 'GET'],
      ['http://api.test/v1/people/p%2Fa', 'GET'], ['http://api.test/v1/people/p%2Fa', 'PATCH'],
      ['http://api.test/v1/people/s%2Fa/guardians', 'POST'], ['http://api.test/v1/people/s%2Fa/guardians', 'GET'],
    ]);
    expect(fetchMock.mock.calls[0]![1]?.body).toBe(JSON.stringify({ name: 'Sede' }));
    expect(fetchMock.mock.calls[5]![1]?.body).toBe(JSON.stringify({ active: false }));
  });

  it('config default lê access token do localStorage (módulo fresco)', async () => {
    vi.resetModules();
    localStorage.setItem('erp-access-token', 'tok-B');
    fetchMock.mockResolvedValue(response({ ok: true }));
    const fresh = await import('../src/api-client/client.js');
    await fresh.getHealth();
    const init = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers.authorization).toBe('Bearer tok-B');
    localStorage.setItem('erp-access-token', '');
    await fresh.getHealth();
    const init2 = fetchMock.mock.calls[1]![1] as { headers: Record<string, string> };
    expect(init2.headers.authorization).toBeUndefined();
    localStorage.removeItem('erp-access-token');
    await fresh.getHealth();
    const init3 = fetchMock.mock.calls[2]![1] as { headers: Record<string, string> };
    expect(init3.headers.authorization).toBeUndefined();
  });
});
