/**
 * RF-020 — Banner Modo Desenvolvimento + diagnóstico offline.
 * Mocka o client getHealth; valida estados online/offline/retry/a11y.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DevBanner } from '../src/components/DevBanner';
import { getHealth } from '../src/api-client/client';

vi.mock('../src/api-client/client', () => ({
  getHealth: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(getHealth).mockReset();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DevBanner', () => {
  it('online: exibe "Modo Desenvolvimento local" com role=status e o endpoint', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' });
    render(<DevBanner />);
    await vi.waitFor(() => expect(screen.getByLabelText('Modo desenvolvimento local')).toBeTruthy());
    expect(screen.getByText(/Modo Desenvolvimento local/)).toBeTruthy();
    expect(screen.getByText(/localhost:3000/)).toBeTruthy();
  });

  it('offline: exibe diagnóstico humano (role=alert) + botão retry', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('down'));
    render(<DevBanner />);
    await vi.waitFor(() =>
      expect(screen.getByText(/API indisponível/)).toBeTruthy(),
    );
    expect(screen.getByText(/localhost:3000/)).toBeTruthy();
    const retry = screen.getByRole('button', { name: /Tentar de novo/i }) as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
  });

  it('retry: após sucesso o banner volta ao modo online', async () => {
    vi.mocked(getHealth).mockRejectedValueOnce(new Error('down'));
    render(<DevBanner />);
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /Tentar de novo/i })).toBeTruthy(),
    );
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' });
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));
    await vi.waitFor(() => expect(screen.getByLabelText('Modo desenvolvimento local')).toBeTruthy());
  });
});
