import type { CrmRepositories } from '@/application/ports/crm';
import type { IAuthService } from '@/application/ports/IAuthService';
import { GetCurrentUser } from '@/application/use-cases/GetCurrentUser';
import { SupabaseAuthAdapter } from '@/infrastructure/auth/SupabaseAuthAdapter';
import { getCrmRepositories } from '@/infrastructure/crm/crmRepositories';

const authService: IAuthService = new SupabaseAuthAdapter();

export const getCurrentUserUseCase = new GetCurrentUser(authService);
export const crmRepositories: CrmRepositories = getCrmRepositories();
export { authService };
