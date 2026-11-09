/* GERADO por scripts/generate-client.mjs — NÃO EDITAR À MÃO (RF-011) */
/* eslint-disable */
export interface ApiConfig {
  baseUrl: string;
  getTenantId: () => string;
  getAccessToken: () => string;
}

let config: ApiConfig = {
  baseUrl: import.meta.env?.VITE_API_URL ?? 'http://localhost:3000',
  getTenantId: () => localStorage.getItem('erp-tenant') ?? '',
  getAccessToken: () => localStorage.getItem('erp-access-token') ?? '',
};

export function configureApi(cfg: Partial<ApiConfig>): void {
  config = { ...config, ...cfg };
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const filled = path.replaceAll(/\{(\w+)\}/g, (_, k) => {
    const v = opts.headers?.[k];
    if (!v) throw new Error(`missing path param ${k}`);
    return encodeURIComponent(v);
  });
  const res = await fetch(config.baseUrl + filled, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(config.getAccessToken() ? { authorization: `Bearer ${config.getAccessToken()}` } : {}),
      ...opts.headers,
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export function getReady(): Promise<unknown> {
  return request<unknown>('GET', '/ready');
}

export function getHealth(): Promise<unknown> {
  return request<unknown>('GET', '/health');
}

export function postV1AuthRegister(body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/auth/register', { body });
}

export function postV1AuthLogin(body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/auth/login', { body });
}

export function postV1AuthLogout(body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/auth/logout', { body });
}

export function getV1AuthMe(): Promise<unknown> {
  return request<unknown>('GET', '/v1/auth/me');
}

export function getOpenapiJson(): Promise<unknown> {
  return request<unknown>('GET', '/openapi.json');
}

export function postV1Enrollments(body: unknown, idempotencyKey: string): Promise<unknown> {
  return request<unknown>('POST', '/v1/enrollments', { body, headers: { 'idempotency-key': idempotencyKey } });
}

export function postV1EnrollmentsIdTransition(id: string, body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/enrollments/{id}/transition', { body, headers: { id: id } });
}

export function getV1EnrollmentsId(id: string): Promise<unknown> {
  return request<unknown>('GET', '/v1/enrollments/{id}', { headers: { id: id } });
}

export function postV1LedgerEntries(body: unknown, idempotencyKey: string): Promise<unknown> {
  return request<unknown>('POST', '/v1/ledger/entries', { body, headers: { 'idempotency-key': idempotencyKey } });
}

export function getV1LedgerBalance(): Promise<unknown> {
  return request<unknown>('GET', '/v1/ledger/balance');
}

export function getV1AuditCount(): Promise<unknown> {
  return request<unknown>('GET', '/v1/audit/count');
}

export function postV1Units(body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/units', { body });
}

export function getV1Units(): Promise<unknown> {
  return request<unknown>('GET', '/v1/units');
}

export function postV1People(body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/people', { body });
}

export function getV1People(): Promise<unknown> {
  return request<unknown>('GET', '/v1/people');
}

export function getV1PeopleId(id: string): Promise<unknown> {
  return request<unknown>('GET', '/v1/people/{id}', { headers: { id: id } });
}

export function patchV1PeopleId(id: string, body: unknown): Promise<unknown> {
  return request<unknown>('PATCH', '/v1/people/{id}', { body, headers: { id: id } });
}

export function postV1PeopleIdGuardians(id: string, body: unknown): Promise<unknown> {
  return request<unknown>('POST', '/v1/people/{id}/guardians', { body, headers: { id: id } });
}

export function getV1PeopleIdGuardians(id: string): Promise<unknown> {
  return request<unknown>('GET', '/v1/people/{id}/guardians', { headers: { id: id } });
}
