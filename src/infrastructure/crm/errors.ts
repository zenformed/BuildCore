/** Thrown when writes are invoked while CRM mock data source is active. */
export class CrmWriteNotAvailableError extends Error {
  constructor(
    message = 'CRM writes require NEXT_PUBLIC_CRM_DATA_SOURCE=api.'
  ) {
    super(message);
    this.name = 'CrmWriteNotAvailableError';
  }
}

/** @deprecated Use CrmWriteNotAvailableError */
export class CrmCreateNotAvailableError extends CrmWriteNotAvailableError {
  constructor(message = 'Creating projects requires NEXT_PUBLIC_CRM_DATA_SOURCE=api.') {
    super(message);
    this.name = 'CrmCreateNotAvailableError';
  }
}

export class CrmDocumentServiceError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CrmDocumentServiceError';
  }
}
