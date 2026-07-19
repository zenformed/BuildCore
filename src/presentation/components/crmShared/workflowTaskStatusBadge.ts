import shared from '@/presentation/components/crmShared/crmShared.module.css';

/** Shared BuildCore workflow/payment status badge class (crmShared tokens). */
export function workflowTaskStatusBadgeClass(status: string): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}
