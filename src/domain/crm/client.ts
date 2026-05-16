/** Company or property-owner customer record tied to a project. */
export type CrmClient = {
  readonly id: string;
  readonly name: string;
  readonly segment: string | null;
};
