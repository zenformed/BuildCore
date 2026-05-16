/**
 * Base error for domain rule violations.
 * Use for validation and invariant failures within the domain layer.
 * @expandable Add error codes or structured payload for i18n or API responses.
 */
export class DomainError extends Error {
  public readonly entity: string;

  constructor(entity: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.entity = entity;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
