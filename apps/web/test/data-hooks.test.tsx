import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useAuditCount, useLedgerBalance } from '../src/hooks/useData';
import * as client from '../src/api-client/client';

function LedgerProbe() {
  const { state } = useLedgerBalance();
  return <span data-testid="ledger">{JSON.stringify(state)}</span>;
}
function AuditProbe() {
  const { state } = useAuditCount();
  return <span data-testid="audit">{JSON.stringify(state)}</span>;
}

describe('hooks dados OpenAPI', () => {
  beforeEach(() => cleanup());

  it('useLedgerBalance devolve balanceCents da API', async () => {
    vi.spyOn(client, 'getV1LedgerBalance').mockResolvedValueOnce({ balanceCents: 1234 });
    render(<LedgerProbe />);
    await screen.findByText(/1234/);
    expect(screen.getByTestId('ledger').textContent).toContain('"ok"');
  });

  it('useAuditCount devolve count da API', async () => {
    vi.spyOn(client, 'getV1AuditCount').mockResolvedValueOnce({ count: 8 });
    render(<AuditProbe />);
    await screen.findByText(/"data":8/);
    expect(screen.getByTestId('audit').textContent).toContain('"ok"');
  });

  it('hooks wrappers preservam erro ApiError', async () => {
    vi.spyOn(client, 'getV1LedgerBalance').mockRejectedValueOnce(new client.ApiError(404, {}));
    vi.spyOn(client, 'getV1AuditCount').mockRejectedValueOnce(new client.ApiError(422, {}));
    render(<><LedgerProbe /><AuditProbe /></>);
    await screen.findByText(/não encontrado/);
    await screen.findByText(/Transição de estado inválida/);
  });

  it('sessão escolhida alimenta o header Authorization das requisições reais (tenant vem do token, não do header)', async () => {
    const { TenantProbe } = await import('./helpers.js');
    const userEvent = (await import('@testing-library/user-event')).default;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: vi.fn().mockResolvedValue({ balanceCents: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    client.configureApi({ getAccessToken: () => 'sess-B' });
    render(<TenantProbe />);
    await userEvent.click(screen.getByText('toB'));
    await client.getV1LedgerBalance();
    const init = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers.authorization).toBe('Bearer sess-B');
    expect(init.headers['x-tenant-id']).toBeUndefined();
    client.configureApi({ getAccessToken: () => '' });
    vi.unstubAllGlobals();
  });
});
