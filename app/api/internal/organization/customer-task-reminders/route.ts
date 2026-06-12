/**
 * GET/PATCH /api/internal/organization/customer-task-reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
  DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS,
  isCustomerTaskReminderFrequencyMinutes,
  type CustomerTaskReminderFrequencyMinutes,
} from '@/domain/buildcore/buildCoreOrganizationSettings';
import { organizationRoleCanAccessPipelineStagesAdmin } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  loadBuildCoreOrganizationCustomerTaskReminderSettings,
  saveBuildCoreOrganizationCustomerTaskReminderSettings,
} from '@/infrastructure/crm/server/buildCoreOrganizationSettingsService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

function defaultResponse(canEdit: boolean) {
  return NextResponse.json(
    {
      ...DEFAULT_BUILDCORE_ORGANIZATION_CUSTOMER_TASK_REMINDER_SETTINGS,
      frequencyOptions: CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
      canEdit,
    },
    { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return defaultResponse(true);
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const actorRole = await loadActiveOrganizationMemberRole(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    const settings = await loadBuildCoreOrganizationCustomerTaskReminderSettings(
      auth.context.supabase,
      auth.context.organizationId
    );
    return NextResponse.json(
      {
        ...settings,
        frequencyOptions: CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
        canEdit: organizationRoleCanAccessPipelineStagesAdmin(actorRole),
      },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not load customer task reminder settings.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return defaultResponse(true);
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!organizationRoleCanAccessPipelineStagesAdmin(actorRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to update workflow settings.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_payload', message: 'Invalid request body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const patch: {
    customerTaskRemindersEnabled?: boolean;
    customerTaskReminderFrequencyMinutes?: CustomerTaskReminderFrequencyMinutes;
  } = {};

  if ('customerTaskRemindersEnabled' in record) {
    if (typeof record.customerTaskRemindersEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'invalid_payload', message: 'customerTaskRemindersEnabled must be a boolean.' },
        { status: 400 }
      );
    }
    patch.customerTaskRemindersEnabled = record.customerTaskRemindersEnabled;
  }

  if ('customerTaskReminderFrequencyMinutes' in record) {
    if (
      typeof record.customerTaskReminderFrequencyMinutes !== 'number' ||
      !isCustomerTaskReminderFrequencyMinutes(record.customerTaskReminderFrequencyMinutes)
    ) {
      return NextResponse.json(
        { error: 'invalid_payload', message: 'customerTaskReminderFrequencyMinutes is invalid.' },
        { status: 400 }
      );
    }
    patch.customerTaskReminderFrequencyMinutes = record.customerTaskReminderFrequencyMinutes;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'invalid_payload', message: 'No settings to update.' }, { status: 400 });
  }

  try {
    const existing = await loadBuildCoreOrganizationCustomerTaskReminderSettings(
      auth.context.supabase,
      auth.context.organizationId
    );
    const saved = await saveBuildCoreOrganizationCustomerTaskReminderSettings(
      auth.context.supabase,
      auth.context.organizationId,
      { ...existing, ...patch }
    );
    return NextResponse.json(
      {
        ...saved,
        frequencyOptions: CUSTOMER_TASK_REMINDER_FREQUENCY_OPTIONS,
        canEdit: true,
      },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save customer task reminder settings.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
