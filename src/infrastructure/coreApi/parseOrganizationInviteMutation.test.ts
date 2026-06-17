import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isOrganizationInviteReactivatedResponse,
  type ZenformedCoreOrganizationInviteMutationResponse,
} from './types';
import { parseOrganizationInviteMutationJson } from './parseResponse';

const sampleInvite = {
  id: 'inv-1',
  email: 'new@example.com',
  firstName: 'New',
  lastName: 'User',
  displayName: 'New User',
  status: 'pending' as const,
  role: 'member' as const,
  invitedBy: 'owner-1',
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-06-01T12:00:00.000Z',
  sentLabel: 'Sent today',
  emailDeliveryStatus: 'sent' as const,
};

const sampleMember = {
  id: 'mem-1',
  userId: 'user-1',
  displayName: 'Returning User',
  firstName: 'Returning',
  lastName: 'User',
  email: 'returning@example.com',
  role: 'member' as const,
  status: 'active' as const,
};

describe('parseOrganizationInviteMutationJson', () => {
  it('accepts standard invite create payload', () => {
    const result = parseOrganizationInviteMutationJson({
      organizationId: 'org-1',
      invite: sampleInvite,
      acceptUrl: 'https://example.com/accept?token=abc',
      emailDeliveryStatus: 'sent',
    });

    assert.ok(result != null);
    assert.equal(result.organizationId, 'org-1');
    assert.equal(isOrganizationInviteReactivatedResponse(result), false);
    if (isOrganizationInviteReactivatedResponse(result)) return;
    assert.equal(result.invite.email, 'new@example.com');
    assert.equal(result.acceptUrl, 'https://example.com/accept?token=abc');
    assert.equal(result.emailDeliveryStatus, 'sent');
  });

  it('accepts reactivation payload without invite', () => {
    const result = parseOrganizationInviteMutationJson({
      organizationId: 'org-1',
      reactivated: true,
      member: sampleMember,
      message: 'Member reactivated successfully.',
    });

    assert.ok(result != null);
    assert.equal(isOrganizationInviteReactivatedResponse(result), true);
    if (!isOrganizationInviteReactivatedResponse(result)) return;
    assert.equal(result.member.email, 'returning@example.com');
    assert.equal(result.message, 'Member reactivated successfully.');
  });

  it('rejects reactivation payload missing member', () => {
    const result = parseOrganizationInviteMutationJson({
      organizationId: 'org-1',
      reactivated: true,
      message: 'Member reactivated successfully.',
    });

    assert.equal(result, null);
  });

  it('rejects invite payload missing invite record', () => {
    const result = parseOrganizationInviteMutationJson({
      organizationId: 'org-1',
      acceptUrl: 'https://example.com/accept?token=abc',
    });

    assert.equal(result, null);
  });
});

describe('isOrganizationInviteReactivatedResponse', () => {
  it('narrows reactivation union member', () => {
    const response: ZenformedCoreOrganizationInviteMutationResponse = {
      organizationId: 'org-1',
      reactivated: true,
      member: sampleMember,
    };
    assert.equal(isOrganizationInviteReactivatedResponse(response), true);
  });
});
