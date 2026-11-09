import { useEffect, useState } from 'react';
import {
  ApiError,
  getV1People,
  getV1Units,
  patchV1PeopleId,
  postV1People,
  postV1PeopleIdGuardians,
} from '../api-client/client';
import { humanError } from '../lib/domain';

type Kind = 'STUDENT' | 'GUARDIAN' | 'STAFF';
type Unit = { id: string; name: string };
type Person = { id: string; kind: Kind; name: string; active: boolean; unitId: string };

function apiMessage(err: unknown): string {
  return humanError(err instanceof ApiError ? err.status : 500, 'Dados inválidos.');
}

/** E05-A: cadastro mínimo de pessoas/unidades. Sessão vem do login; nada de tenant header. */
export function PeopleView() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [unitName, setUnitName] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('STUDENT');
  const [unitId, setUnitId] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [u, p] = await Promise.all([
        getV1Units() as Promise<{ units: Unit[] }>,
        getV1People() as Promise<{ people: Person[] }>,
      ]);
      setUnits(u.units);
      setPeople(p.people);
      if (!unitId && u.units[0]) setUnitId(u.units[0].id);
    } catch (err) { setFeedback(apiMessage(err)); }
  }
  useEffect(() => { void refresh(); }, []);

  async function createUnit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFeedback('');
    try {
      await (await import('../api-client/client')).postV1Units({ name: unitName });
      setUnitName(''); setFeedback('Unidade criada.'); await refresh();
    } catch (err) { setFeedback(apiMessage(err)); } finally { setBusy(false); }
  }
  async function createPerson(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFeedback('');
    try {
      await postV1People({ name, kind, unitId });
      setName(''); setFeedback('Pessoa cadastrada.'); await refresh();
    } catch (err) { setFeedback(apiMessage(err)); } finally { setBusy(false); }
  }
  async function toggle(person: Person) {
    setBusy(true); setFeedback('');
    try {
      await patchV1PeopleId(person.id, { active: !person.active });
      setFeedback(person.active ? 'Pessoa desativada.' : 'Pessoa reativada.'); await refresh();
    } catch (err) { setFeedback(apiMessage(err)); } finally { setBusy(false); }
  }
  async function link(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFeedback('');
    try {
      await postV1PeopleIdGuardians(studentId, { guardianId, relation: 'responsável', isPrimary: true });
      setFeedback('Responsável vinculado.');
    } catch (err) { setFeedback(apiMessage(err)); } finally { setBusy(false); }
  }

  const students = people.filter((p) => p.kind === 'STUDENT');
  const guardians = people.filter((p) => p.kind === 'GUARDIAN');
  return <section aria-labelledby="people-heading">
    <h2 id="people-heading">Pessoas e unidades</h2>
    <p role="status">{feedback}</p>
    <form onSubmit={createUnit} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
      <label htmlFor="unit-name">Nova unidade</label>
      <input id="unit-name" value={unitName} onChange={(e) => setUnitName(e.target.value)} required />
      <button type="submit" disabled={busy}>Criar unidade</button>
    </form>
    <form onSubmit={createPerson} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
      <label htmlFor="person-name">Nome</label><input id="person-name" value={name} onChange={(e) => setName(e.target.value)} required />
      <label htmlFor="person-kind">Tipo</label><select id="person-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}><option value="STUDENT">Aluno</option><option value="GUARDIAN">Responsável</option><option value="STAFF">Colaborador</option></select>
      <label htmlFor="person-unit">Unidade</label><select id="person-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <button type="submit" className="primary" disabled={busy || !unitId}>Cadastrar pessoa</button>
    </form>
    <form onSubmit={link} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
      <label htmlFor="student">Aluno</label><select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required><option value="">Selecione</option>{students.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <label htmlFor="guardian">Responsável</label><select id="guardian" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} required><option value="">Selecione</option>{guardians.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button type="submit" disabled={busy || !studentId || !guardianId}>Vincular responsável</button>
    </form>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}><caption className="sr-only">Pessoas cadastradas</caption><thead><tr><th scope="col">Nome</th><th scope="col">Tipo</th><th scope="col">Situação</th><th scope="col">Ação</th></tr></thead><tbody>{people.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.kind}</td><td>{p.active ? 'Ativa' : 'Inativa'}</td><td><button disabled={busy} onClick={() => void toggle(p)}>{p.active ? 'Desativar' : 'Reativar'}</button></td></tr>)}</tbody></table>
  </section>;
}
