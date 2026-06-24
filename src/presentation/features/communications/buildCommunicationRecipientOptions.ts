import type { CrmContact, CrmTeamMemberRef } from '@/domain/crm';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';

export function buildCustomerCommunicationRecipientOption(
  contact: CrmContact
): CommunicationRecipientOption | null {
  const email = contact.email?.trim() ?? '';
  if (email.length === 0) return null;

  return {
    id: `customer:${contact.id}`,
    type: 'customer',
    name: contact.name.trim() || 'Customer',
    email,
    contactId: contact.id,
    avatarUrl: null,
  };
}

export function buildMemberCommunicationRecipientOption(
  member: CrmTeamMemberRef
): CommunicationRecipientOption | null {
  const email = member.email?.trim() ?? '';
  if (email.length === 0) return null;

  const name = member.displayName.replace(/\s*\(Customer\)\s*$/i, '').trim() || member.displayName;

  return {
    id: `member:${member.id}`,
    type: 'member',
    name,
    email,
    memberId: member.id,
    avatarUrl: member.avatarUrl,
  };
}

export function buildCommunicationRecipientOptions(input: {
  readonly customer?: CrmContact | null;
  readonly members?: readonly CrmTeamMemberRef[];
}): readonly CommunicationRecipientOption[] {
  const options: CommunicationRecipientOption[] = [];
  const seenEmails = new Set<string>();

  const customerOption =
    input.customer != null ? buildCustomerCommunicationRecipientOption(input.customer) : null;
  if (customerOption != null) {
    options.push(customerOption);
    seenEmails.add(customerOption.email.toLowerCase());
  }

  const members = input.members ?? [];
  const memberOptions = members
    .map((member) => buildMemberCommunicationRecipientOption(member))
    .filter((option): option is CommunicationRecipientOption => option != null)
    .filter((option) => {
      const key = option.email.toLowerCase();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  options.push(...memberOptions);
  return options;
}

export function buildCommunicationRecipientOptionsFromCatalog(input: {
  readonly customer?: CrmContact | null;
  readonly catalog: AssignmentIdentityCatalog | null;
}): readonly CommunicationRecipientOption[] {
  return buildCommunicationRecipientOptions({
    customer: input.customer,
    members: input.catalog?.assignableMembers ?? [],
  });
}
