export class CrmProjectsListV2NotWiredError extends Error {
  constructor(operation: string) {
    super(
      `Projects list v2 "${operation}" is not wired yet. Use v1 endpoints until the matching phase ships.`
    );
    this.name = 'CrmProjectsListV2NotWiredError';
  }
}

export class CrmProjectsListV2InvalidRequestError extends Error {
  readonly code = 'invalid_request' as const;

  constructor(message: string) {
    super(message);
    this.name = 'CrmProjectsListV2InvalidRequestError';
  }
}
