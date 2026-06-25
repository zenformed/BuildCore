import { randomUUID } from 'node:crypto';

/** Generates a permanent random lead token for CRM projects. */
export function generateCrmProjectLeadToken(): string {
  return randomUUID();
}
