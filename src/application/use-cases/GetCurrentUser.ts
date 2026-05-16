import type { User } from '@/domain/entities/User';
import type { IAuthService } from '@/application/ports/IAuthService';

/**
 * Use case: get the currently authenticated user and tenant context.
 * Used by layout, dashboard, and any component that needs user/tenant.
 * @expandable Add optional tenantId to resolve specific tenant membership.
 */
export class GetCurrentUser {
  constructor(private readonly authService: IAuthService) {}

  /**
   * Executes the use case.
   * @returns Current user with tenantId, or null if not authenticated.
   */
  async execute(): Promise<User | null> {
    return this.authService.getCurrentUser();
  }
}
