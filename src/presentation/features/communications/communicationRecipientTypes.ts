export type CommunicationRecipientType = 'customer' | 'member';

/** Selectable recipient shown in communication compose dialogs. */
export type CommunicationRecipientOption = {
  readonly id: string;
  readonly type: CommunicationRecipientType;
  readonly name: string;
  readonly email: string;
  readonly avatarUrl?: string | null;
  readonly contactId?: string | null;
  readonly memberId?: string | null;
};

export type SendAttachmentRecipient = {
  readonly email: string;
  readonly name: string;
  readonly contactId?: string | null;
  readonly memberId?: string | null;
};

export function communicationRecipientOptionToSendRecipient(
  option: CommunicationRecipientOption
): SendAttachmentRecipient {
  return {
    email: option.email,
    name: option.name,
    contactId: option.type === 'customer' ? option.contactId ?? null : null,
    memberId: option.type === 'member' ? option.memberId ?? null : null,
  };
}

export function findCommunicationRecipientOption(
  options: readonly CommunicationRecipientOption[],
  recipientId: string
): CommunicationRecipientOption | null {
  return options.find((option) => option.id === recipientId) ?? null;
}

export function defaultCommunicationRecipientId(
  options: readonly CommunicationRecipientOption[]
): string | null {
  if (options.length === 0) return null;
  return options.find((option) => option.type === 'customer')?.id ?? options[0]!.id;
}
