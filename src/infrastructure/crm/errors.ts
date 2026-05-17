/** Thrown when create is invoked while CRM mock data source is active. */
export class CrmCreateNotAvailableError extends Error {
  constructor(
    message = 'Creating projects requires NEXT_PUBLIC_CRM_DATA_SOURCE=api.'
  ) {
    super(message);
    this.name = 'CrmCreateNotAvailableError';
  }
}
