import { DomainError } from '../errors/DomainError';

/**
 * Tenant identifier value object.
 * Ensures all multi-tenant operations are explicitly scoped.
 * @expandable Use for sub-tenants or tenant hierarchies by extending or composing.
 */
export type TenantId = string & { readonly __brand: 'TenantId' };

const TENANT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Creates a validated TenantId from a string.
 * @param value - Raw string (e.g. from session or config).
 * @returns TenantId if valid.
 * @throws {DomainError} If value is empty or invalid format.
 */
export function createTenantId(value: string): TenantId {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('TenantId', 'TenantId cannot be empty');
  }
  const trimmed = value.trim();
  if (!TENANT_ID_REGEX.test(trimmed)) {
    throw new DomainError(
      'TenantId',
      'TenantId must be 1-64 alphanumeric, underscore, or hyphen characters'
    );
  }
  return trimmed as TenantId;
}

/**
 * Type guard for TenantId.
 */
export function isTenantId(value: unknown): value is TenantId {
  return typeof value === 'string' && TENANT_ID_REGEX.test(value);
}
