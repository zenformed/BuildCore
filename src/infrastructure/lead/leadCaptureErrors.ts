export class LeadCaptureInvalidTokenError extends Error {
  constructor(message = 'Lead link is invalid or expired.') {
    super(message);
    this.name = 'LeadCaptureInvalidTokenError';
  }
}

export class LeadCapturePersistenceError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super('Lead capture persistence failed.');
    this.name = 'LeadCapturePersistenceError';
    this.detail = detail;
  }
}
