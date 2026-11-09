import { useState } from 'react';
import { postV1LedgerEntries } from '../api-client/client';
import { ApiError } from '../api-client/client';
import { useLedgerBalance } from '../hooks/useData';
import { formatBRL, humanError } from '../lib/domain';

export function LedgerView() {
  const { state, reload } = useLedgerBalance();
  const [type, setType] = useState<'CHARGE' | 'PAYMENT'>('CHARGE');
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    // client insere centavos INTEIROS a partir de R$ digitado (nunca float na conta)
    const reais = Number(amount.replace(',', '.'));
    if (!Number.isFinite(reais)) {
      setFeedback({ kind: 'error', text: 'Valor inválido.' });
      return;
    }
    const cents = Math.round(reais * 100);
    if (!Number.isInteger(cents) || cents <= 0) {
      setFeedback({ kind: 'error', text: 'Valor deve ser positivo (mínimo R$ 0,01).' });
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
