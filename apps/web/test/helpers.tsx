/** Probe compartilhado dos testes de tenant. */
import { useTenant } from '../src/hooks/useTenant';

export function TenantProbe({ onChange }: { onChange?: (t: string) => void }) {
  const { tenant, setTenant } = useTenant();
  return (
    <div>
      <span data-testid="current">{tenant}</span>
      <button onClick={() => { setTenant('B'); onChange?.('B'); }}>toB</button>
      <button onClick={() => { setTenant('A'); onChange?.('A'); }}>toA</button>
    </div>
  );
}
