import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';

export const DEMO_COMMUNICATION_SIMULATED_MESSAGE =
  'Demo mode: message simulated. No email or SMS was sent.';

/**
 * Operations gated while the demo runtime is active.
 * Mock repository mutations are allowed; live-only paths resolve to simulate or block.
 */
export type DemoOperation =
  | 'crm-direct-upload'
  | 'project-primary-photo-upload'
  | 'communication-send'
  | 'customer-notification'
  | 'billing-action'
  | 'team-management'
  | 'live-crm-mutation';

/** @deprecated Use DemoOperation */
export type DemoRestrictedOperation = DemoOperation;

export type DemoOperationResolution = 'live' | 'simulate' | 'block';

export class DemoOperationBlockedError extends Error {
  readonly operation: DemoOperation;

  constructor(operation: DemoOperation) {
    super(`Operation "${operation}" is not available in the interactive demo.`);
    this.name = 'DemoOperationBlockedError';
    this.operation = operation;
  }
}

export function resolveDemoOperation(operation: DemoOperation): DemoOperationResolution {
  if (!isDemoRuntimeClient()) {
    return 'live';
  }

  switch (operation) {
    case 'crm-direct-upload':
    case 'project-primary-photo-upload':
    case 'communication-send':
    case 'customer-notification':
      return 'simulate';
    case 'billing-action':
    case 'team-management':
    case 'live-crm-mutation':
      return 'block';
    default:
      return 'block';
  }
}

export function isDemoOperationAllowed(operation: DemoOperation): boolean {
  return resolveDemoOperation(operation) !== 'block';
}

export function assertDemoOperationAllowed(operation: DemoOperation): void {
  if (resolveDemoOperation(operation) === 'block') {
    throw new DemoOperationBlockedError(operation);
  }
}

export function shouldSimulateDemoOperation(operation: DemoOperation): boolean {
  return resolveDemoOperation(operation) === 'simulate';
}
