import { useState } from 'react';
import { postV1Enrollments, ApiError, postV1EnrollmentsIdTransition } from '../api-client/client';
import { canTransition, stateLabel, humanError } from '../lib/domain';

interface Enrollment {
  id: string;
  state: string;
}

const NEXT: Record<string, string[]> = {
  DRAFT: ['PENDING_DOCUMENTS'],
  PENDING_DOCUMENTS: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['ACTIVE'],
  ACTIVE: ['COMPLETED'],
};

export function EnrollmentsView() {
  const [studentId, setStudentId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [list, setList] = useState<Enrollment[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const created = (await postV1Enrollments(
        { studentId, offerId },
        crypto.randomUUID(),
      )) as { id: string; state: string; replay: boolean };
      setList((l) => [...l, { id: created.id, state: created.state }]);
      setFeedback({
        kind: 'ok',
        text: created.replay
          ? `Reenvio detectado — matrícula existente ${created.id} retornada (nenhuma duplicada criada).`
          : `Matrícula ${created.id} criada.`,
      });
      setStudentId('');
      setOfferId('');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      setFeedback({ kind: 'error', text: humanError(status, '') });
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(id: string, to: string) {
    setBusy(true);
    setFeedback(null);
    try {
      // usa o client gerado — transição inválida é recusada pela API (422)
      const updated = (await postV1EnrollmentsIdTransition(id, { to })) as { state: string };
      setList((l) => l.map((r) => (r.id === id ? { ...r, state: updated.state } : r)));
      setFeedback({ kind: 'ok', text: `Matrícula agora está ${stateLabel(updated.state)}.` });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      setFeedback({ kind: 'error', text: humanError(status, '') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="enrollments-heading">
      <h2 id="enrollments-heading">Nova matrícula</h2>
      <form
        onSubmit={handleCreate}
        style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}
      >
        <label htmlFor="student">Aluno</label>
        <input id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
        <label htmlFor="offer">Oferta</label>
        <input id="offer" value={offerId} onChange={(e) => setOfferId(e.target.value)} required />
        <button type="submit" className="primary" disabled={busy || !studentId || !offerId}>
          Matricular
        </button>
      </form>

      {feedback && (
        <p role="status" style={{ color: feedback.kind === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
          {feedback.text}
        </p>
      )}

      <h2>Matrículas desta sessão</h2>
      {list.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Nenhuma matrícula criada ainda. Preencha o formulário acima para criar a primeira.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption className="sr-only">Matrículas criadas nesta sessão</caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>ID</th>
              <th scope="col" style={{ textAlign: 'left' }}>Estado</th>
              <th scope="col" style={{ textAlign: 'left' }}>Avançar</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const nexts = NEXT[r.state] ?? [];
              return (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace' }}>{r.id}</td>
                  <td>{stateLabel(r.state)}</td>
                  <td>
                    {nexts.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>estado final</span>
                    ) : (
                      nexts.map((to) => (
                        <button
                          key={to}
                          disabled={busy || !canTransition(r.state, to)}
                          onClick={() => handleTransition(r.id, to)}
                          style={{ marginRight: 'var(--space-1)' }}
                          aria-label={`Avançar matrícula ${r.id} para ${stateLabel(to)}`}
                        >
                          {stateLabel(to)}
                        </button>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
