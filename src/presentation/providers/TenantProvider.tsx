'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { TenantId } from '@/domain/value-objects/TenantId';
import { createTenantId } from '@/domain/value-objects/TenantId';

/**
 * Tenant context value.
 * @expandable Add tenant display name, settings, or feature flags.
 */
export interface TenantContextValue {
  tenantId: TenantId | null;
  setTenantId: (id: TenantId | string | null) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

/**
 * Provider that holds the current tenant for the session.
 * Resolve tenant from auth (e.g. user.tenantId) in layout and set via setTenantId.
 * @expandable Add tenant list, switching UI, or sub-tenant support.
 */
export function TenantProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [tenantId, setTenantIdState] = useState<TenantId | null>(null);

  const setTenantId = useCallback((id: TenantId | string | null) => {
    if (id === null) {
      setTenantIdState(null);
      return;
    }
    setTenantIdState(typeof id === 'string' ? createTenantId(id) : id);
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({ tenantId, setTenantId }),
    [tenantId, setTenantId]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to read and set the current tenant.
 * @throws If used outside TenantProvider.
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}
