export type CrmContact = {
  readonly id: string;
  readonly name: string;
  /** Primary email (first entry in `emails`). */
  readonly email: string;
  /** Primary phone (first entry in `phones`). */
  readonly phone: string;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly title: string | null;
};
