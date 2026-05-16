import type { TenantId } from '../value-objects/TenantId';

/**
 * Domain user entity.
 * Represents an authenticated user within a tenant context.
 * @expandable Add roles, permissions, or profile fields as value objects.
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly tenantId: TenantId;
  readonly displayName?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
