export type CustomerTaskRequestStatus = 'pending' | 'submitted' | 'revoked';

export type CustomerTaskPortalState = 'ready' | 'submitted' | 'expired' | 'invalid';

export type CustomerTaskPortalUploadedFile = {
  readonly id: string;
  readonly fileName: string;
};

export type CustomerTaskPortalView = {
  readonly state: CustomerTaskPortalState;
  readonly organizationName: string;
  readonly projectName: string;
  readonly taskTitle: string;
  readonly taskInstructions: string | null;
  readonly canSubmit: boolean;
  readonly uploadedFiles: readonly CustomerTaskPortalUploadedFile[];
};

export const CUSTOMER_TASK_REQUEST_DEFAULT_TTL_DAYS = 30;
