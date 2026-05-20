import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

/** True when Zenformed Core relays are down and the app is in degraded/offline mode. */
export function useCorePlatformDegraded(): boolean {
  const { corePlatformStatus } = useSaaSProfile();
  return corePlatformStatus === 'unavailable';
}
