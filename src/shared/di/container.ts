import type { CrmRepositories } from '@/application/ports/crm';
import type { IAuthService } from '@/application/ports/IAuthService';
import { GetCurrentUser } from '@/application/use-cases/GetCurrentUser';
import { SupabaseAuthAdapter } from '@/infrastructure/auth/SupabaseAuthAdapter';
import { getCrmRepositories } from '@/infrastructure/crm/crmRepositories';

const authService: IAuthService = new SupabaseAuthAdapter();

export const getCurrentUserUseCase = new GetCurrentUser(authService);
/**
 * Resolve the repository bag at property-access time so a soft LIVE ↔ DEMO
 * navigation cannot retain adapters selected for the previous runtime.
 */
export const crmRepositories: CrmRepositories = new Proxy({} as CrmRepositories, {
  get(_target, property: keyof CrmRepositories) {
    return getCrmRepositories()[property];
  },
});
export { authService };
