/**
 * One-off chain verifier: Core storage → BFF parsers → hook-shaped checks.
 * Usage: npx tsx scripts/verify-org-workspace-chain.ts
 */
import { config } from 'dotenv';
import path from 'node:path';
import {
  parseOrganizationAppAccessJson,
  parseOrganizationInvitesJson,
  parseOrganizationMembersJson,
  parseOrganizationSeatsJson,
} from '../src/infrastructure/coreApi/parseResponse';
import {
  createCoreServiceClient,
  getOrganizationSeats,
  listOrganizationAppAccess,
  listOrganizationInvites,
  listOrganizationMembers,
} from '../../ZenformedCore/src/http/organizationWorkspaceStorage';

const coreRoot = path.resolve(__dirname, '..', '..', 'ZenformedCore');
config({ path: path.join(coreRoot, '.env.local') });

function hookAcceptsMembers(json: unknown): boolean {
  if (json == null || typeof json !== 'object') return false;
  const o = json as Record<string, unknown>;
  if (!Array.isArray(o.members)) return false;
  for (const m of o.members) {
    if (m == null || typeof m !== 'object') return false;
    const row = m as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.userId !== 'string') return false;
    if (typeof row.displayName !== 'string') return false;
    if (row.role !== 'owner' && row.role !== 'admin' && row.role !== 'member') return false;
    if (row.status !== 'active' && row.status !== 'invited' && row.status !== 'removed') return false;
  }
  return true;
}

async function main(): Promise<void> {
  const service = createCoreServiceClient();
  if (service == null) {
    console.error('FAIL: Core service client unavailable');
    process.exit(1);
  }

  const { data: memberRow, error: memberErr } = await service
    .from('platform_organization_members')
    .select('user_id')
    .eq('membership_status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberErr != null || memberRow?.user_id == null) {
    console.error('FAIL: no active platform_organization_members row', memberErr?.message);
    process.exit(1);
  }

  const userId = memberRow.user_id as string;
  console.log('Using userId:', userId);

  const cases = [
    {
      label: 'members',
      core: await listOrganizationMembers(service, userId),
      bffParse: parseOrganizationMembersJson,
      hookOk: hookAcceptsMembers,
    },
    {
      label: 'invites',
      core: await listOrganizationInvites(service, userId),
      bffParse: parseOrganizationInvitesJson,
      hookOk: (json: unknown) =>
        json != null &&
        typeof json === 'object' &&
        Array.isArray((json as Record<string, unknown>).invites),
    },
    {
      label: 'seats',
      core: await getOrganizationSeats(service, userId),
      bffParse: parseOrganizationSeatsJson,
      hookOk: (json: unknown) =>
        json != null &&
        typeof json === 'object' &&
        typeof (json as Record<string, unknown>).organizationId === 'string',
    },
    {
      label: 'app-access',
      core: await listOrganizationAppAccess(service, userId),
      bffParse: parseOrganizationAppAccessJson,
      hookOk: (json: unknown) =>
        json != null &&
        typeof json === 'object' &&
        Array.isArray((json as Record<string, unknown>).orgApps),
    },
  ] as const;

  let failed = false;
  for (const { label, core, bffParse, hookOk } of cases) {
    if ('error' in core) {
      console.log(`\n[${label}] CORE ERROR:`, core.error);
      failed = true;
      continue;
    }
    const bffPayload = { relay: 'zenformed_core', ...core };
    const bffParsed = bffParse(core);
    const hookParsed = hookOk(bffPayload);
    console.log(`\n[${label}] CORE payload:`);
    console.log(JSON.stringify(core, null, 2));
    console.log(`[${label}] BFF relay payload:`);
    console.log(JSON.stringify(bffPayload, null, 2));
    console.log(`[${label}] BFF parse:`, bffParsed == null ? 'REJECTED' : 'OK');
    console.log(`[${label}] Hook parse:`, hookParsed ? 'OK' : 'REJECTED');
    if (bffParsed == null || !hookParsed) failed = true;
  }

  if (failed) process.exit(1);
  console.log('\nAll layers OK.');
}

void main();
