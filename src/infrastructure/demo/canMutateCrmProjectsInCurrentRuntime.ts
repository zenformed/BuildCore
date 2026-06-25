import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

/** True when project/subproject CRUD should run locally (production API or interactive demo). */
export function canMutateCrmProjectsInCurrentRuntime(): boolean {
  if (isDemoRuntimeClient()) {
    return true;
  }
  return getCrmDataSource() === 'api';
}
