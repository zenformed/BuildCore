/** Thrown when writes are invoked while CRM mock data source is active. */
export class CrmWriteNotAvailableError extends Error {
  constructor(
    message = 'This action is not available in the current environment.'
  ) {
    super(message);
    this.name = 'CrmWriteNotAvailableError';
  }
}

/** @deprecated Use CrmWriteNotAvailableError */
export class CrmCreateNotAvailableError extends CrmWriteNotAvailableError {
  constructor(message = 'Project creation is not available in this environment.') {
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
