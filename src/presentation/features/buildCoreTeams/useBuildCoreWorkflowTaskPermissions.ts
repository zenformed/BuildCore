'use client';

import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import { useBuildCoreRolePermissions } from './useBuildCoreRolePermissions';

export function useBuildCoreWorkflowTaskPermissions(enabled: boolean): {
  data: BuildCoreRolePermissionsResponse | null;
  isLoading: boolean;
  loadError: string | null;
  statusMessage: string | null;
  statusKind: 'success' | 'error' | null;
  busyCell: { roleKey: BuildCorePermissionRoleKey; columnId: BuildCorePermissionColumnId } | null;
  canEditRow: (roleKey: BuildCorePermissionRoleKey) => boolean;
  togglePermission: (
    roleKey: BuildCorePermissionRoleKey,
    columnId: BuildCorePermissionColumnId,
    nextValue: boolean
  ) => Promise<void>;
  refetch: () => Promise<void>;
} {
  return useBuildCoreRolePermissions('workflow_tasks', enabled);
}
