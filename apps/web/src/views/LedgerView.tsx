import { useState } from 'react';
import { postV1LedgerEntries } from '../api-client/client';
import { ApiError } from '../api-client/client';
import { useLedgerBalance } from '../hooks/useData';
import { formatBRL, humanError, parseReaisToCents } from '../lib/domain';

export function LedgerView() {
  const { state, reload } = useLedgerBalance();
  const [type, setType] = useState<'CHARGE' | 'PAYMENT'>('CHARGE');
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    // parser estrito: recusa >2 casas, sinal, notação científica — nunca arredonda (RF-014)
    const cents = parseReaisToCents(amount);
    if (cents === null) {
      setFeedback({ kind: 'error', text: 'Valor inválido. Use até 2 casas decimais (ex.: 150,00). Valores devem ser positivos.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const created = (await postV1LedgerEntries(
        { type, amountCents: type === 'PAYMENT' ? -cents : cents },
        crypto.randomUUID(),
      )) as { id: string; replay: boolean };
      setFeedback({
        kind: 'ok',
        text: created.replay ? 'Reenvio detectado — nenhum lançamento duplicado.' : `Lançamento ${created.id} registrado.`,
      });
      reload();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      setFeedback({ kind: 'error', text: humanError(status, '') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ledger-heading">
      <h2 id="ledger-heading">Ledger</h2>

      {state.status === 'loading' && <p role="status">Carregando saldo…</p>}
      {state.status === 'error' && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {state.message}{' '}
          <button onClick={reload}>Tentar novamente</button>
        </p>
      )}
      {state.status === 'ok' && (
        <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--brand-navy)' }}>
          Saldo: <span data-testid="balance">{formatBRL(state.data)}</span>
        </p>
      )}

      <form onSubmit={handlePost} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
        <label htmlFor="ltype">Tipo</label>
        <select id="ltype" value={type} onChange={(e) => setType(e.target.value as 'CHARGE' | 'PAYMENT')}>
          <option value="CHARGE">Cobrança</option>
          <option value="PAYMENT">Pagamento</option>
        </select>
        <label htmlFor="lamount">Valor (R$)</label>
        <input
          id="lamount"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" className="primary" disabled={busy || !amount}>
          Lançar
        </button>
      </form>
      {feedback && (
        <p role="status" style={{ color: feedback.kind === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
          {feedback.text}
        </p>
      )}
    </section>
  );
}
