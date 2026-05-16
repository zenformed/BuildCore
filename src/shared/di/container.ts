import type { IAuthService } from '@/application/ports/IAuthService';
import { GetCurrentUser } from '@/application/use-cases/GetCurrentUser';
import { SupabaseAuthAdapter } from '@/infrastructure/auth/SupabaseAuthAdapter';
import { env } from '@/infrastructure/config/env';

const authService: IAuthService = new SupabaseAuthAdapter();

export const getCurrentUserUseCase = new GetCurrentUser(authService);
export { authService };
