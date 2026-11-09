import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

beforeEach(() => cleanup());
afterEach(() => cleanup());
import userEvent from '@testing-library/user-event';
import { useTenant, initialTenant } from '../src/hooks/useTenant';
import { configureApi, ApiError } from '../src/api-client/client';
import { useAsync } from '../src/hooks/useData';

// ---- useTenant ----
function TenantProbe({ onChange }: { onChange?: (t: string) => void }) {
  const { tenant, setTenant } = useTenant();
  return (
    <div>
      <span data-testid="current">{tenant}</span>
      <button onClick={() => { setTenant('B'); onChange?.('B'); }}>toB</button>
      <button onClick={() => { setTenant('A'); onChange?.('A'); }}>toA</button>
    </div>
  );
}

describe('useTenant (RF-015)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('default A quando storage vazio, e sincroniza o client', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<TenantProbe onChange={spy} />);
    expect(screen.getByTestId('current').textContent).toBe('A');
    expect(screen.getByTestId('current').textContent).toBe('A');
    await user.click(screen.getByText('toB'));
    expect(screen.getByTestId('current').textContent).toBe('B');
    expect(localStorage.getItem('erp-tenant')).toBe('B');
    expect(spy).toHaveBeenCalledWith('B');
  });

  it('restaura tenant do localStorage', () => {
    localStorage.setItem('erp-tenant', 'B');
    render(<TenantProbe />);
    expect(screen.getByTestId('current').textContent).toBe('B');
  });

  it('tenant inválido no storage cai no default', async () => {
    localStorage.setItem('erp-tenant', 'GHOST');
    vi.resetModules();
    const { TenantProbe: Fresh } = await import('./helpers.js');
    render(<Fresh />);
    expect(screen.getByTestId('current').textContent).toBe('A');
  });

  it('initialTenant lê storage com os três casos', () => {
    localStorage.setItem('erp-tenant', 'B');
    expect(initialTenant()).toBe('B');
    localStorage.setItem('erp-tenant', 'GHOST');
    expect(initialTenant()).toBe('A');
    localStorage.removeItem('erp-tenant');
    expect(initialTenant()).toBe('A');
  });
});

// ---- configureApi ----
describe('configureApi', () => {
  it('permite trocar baseUrl e getTenantId', () => {
    configureApi({ baseUrl: 'http://outro:1234', getTenantId: () => 'X' });
    configureApi({ baseUrl: 'http://localhost:3000', getTenantId: () => 'A' });
    expect(true).toBe(true); // sem throw é o contrato
  });
});

// ---- ApiError ----
describe('ApiError', () => {
  it('carrega status e body', () => {
    const e = new ApiError(409, { error: 'conflict' });
    expect(e.status).toBe(409);
    expect(e.body).toEqual({ error: 'conflict' });
    expect(e.name).toBe('ApiError');
    expect(e.message).toContain('409');
  });
});

// ---- useAsync (RF-016: loading/ok/erro + reload) ----
describe('useAsync', () => {
  function Probe({ fn }: { fn: () => Promise<string> }) {
    const { state, reload } = useAsync(fn);
    return (
      <div>
        <span data-testid="state">{JSON.stringify(state)}</span>
        <button onClick={reload}>reload</button>
      </div>
    );
  }

  it('caminho ok', async () => {
    render(<Probe fn={() => Promise.resolve('dados')} />);
    expect(screen.getByTestId('state').textContent).toContain('"status":"loading"');
    await screen.findByText(/"status":"ok"/);
    expect(screen.getByTestId('state').textContent).toContain('dados');
  });

  it('caminho erro com ApiError vira mensagem humana', async () => {
    render(
      <Probe
        fn={() => Promise.reject(new ApiError(409, {}))}
      />,
    );
    await screen.findByText(/"status":"error"/);
    expect(screen.getByTestId('state').textContent).toContain('idempotência');
  });

  it('caminho erro genérico vira falha de conexão', async () => {
    render(<Probe fn={() => Promise.reject(new Error('boom'))} />);
    await screen.findByText(/"status":"error"/);
    expect(screen.getByTestId('state').textContent).toContain('conexão');
  });

  it('reload dispara nova carga', async () => {
    let calls = 0;
    render(<Probe fn={() => { calls++; return Promise.resolve(`c${calls}`); }} />);
    await screen.findByText(/c1/);
    await userEvent.click(screen.getByText('reload'));
    await screen.findByText(/c2/);
    expect(calls).toBe(2);
  });
});
