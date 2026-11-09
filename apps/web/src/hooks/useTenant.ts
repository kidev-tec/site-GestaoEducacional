/** Hook de tenant (RF-015): persistido em localStorage, alimenta o client. */
import { useState, useCallback } from 'react';
import { TENANTS, TENANT_STORAGE_KEY } from '../lib/domain';
import { configureApi } from '../api-client/client';

/** Resolve o tenant inicial a partir do storage; inválido → default. */
export const initialTenant = (): string => {
  const stored = localStorage.getItem(TENANT_STORAGE_KEY);
  return TENANTS.includes(stored as (typeof TENANTS)[number]) ? (stored as string) : TENANTS[0];
};

/** Estado do tenant atualmente sincronizado com o client (fonte única p/ as arrows do getTenantId). */
let currentTenant = initialTenant();

function tenantProvider(): string {
  return currentTenant;
}

function applyTenant(t: string): void {
  currentTenant = t;
  localStorage.setItem(TENANT_STORAGE_KEY, t);
  configureApi({ getTenantId: tenantProvider });
}

export function useTenant(): {
  tenant: string;
  setTenant: (t: string) => void;
} {
  const [tenant, setTenantState] = useState<string>(currentTenant);

  const setTenant = useCallback((t: string) => {
    applyTenant(t);
    setTenantState(t);
  }, []);

  // garante client sincronizado no primeiro render
  if (configNeedsSync(tenant)) applyTenant(tenant);

  return { tenant, setTenant };
}

let syncedWith: string | null = null;
function configNeedsSync(tenant: string): boolean {
  if (syncedWith === tenant) return false;
  syncedWith = tenant;
  return true;
}
