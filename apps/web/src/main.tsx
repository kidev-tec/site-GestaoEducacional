import '@erp/tokens/tokens.css';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useTenant } from './hooks/useTenant';
import { EnrollmentsView } from './views/EnrollmentsView';
import { LedgerView } from './views/LedgerView';
import { AuditView } from './views/AuditView';
import { TENANTS } from './lib/domain';

type Tab = 'enrollments' | 'ledger' | 'audit';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'enrollments', label: 'Matrículas' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'audit', label: 'Auditoria' },
];

function App() {
  const { tenant, setTenant } = useTenant();
  const [tab, setTab] = useState<Tab>('enrollments');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--brand-navy)' }}>ERP Platform</h1>
        <label htmlFor="tenant-select" style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
          Tenant
        </label>
        <select
          id="tenant-select"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          aria-label="Selecionar tenant"
        >
          {TENANTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </header>

      <nav aria-label="Seções" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={tab === t.id ? 'primary' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'enrollments' && <EnrollmentsView />}
        {tab === 'ledger' && <LedgerView />}
        {tab === 'audit' && <AuditView />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
