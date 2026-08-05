import type { SupabaseClient } from '@supabase/supabase-js';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { relayCommunicationSend } from '@/infrastructure/crm/server/communicationSendRelay';
import { loadCrmMemberMap } from '@/infrastructure/crm/server/crmMemberMap';
import { notifySpreadsheetImportCompletedInApp } from '@/infrastructure/crm/server/notifySpreadsheetImportCompletedInApp';
import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';
import {
  buildSpreadsheetImportCompletedEmailMessage,
  buildSpreadsheetImportCompletedEmailSubject,
} from '@/domain/crm/spreadsheetImportCompletedNotificationCopy';

const SPREADSHEET_IMPORT_EMAIL_TEMPLATE_KEY = 'buildcore.generic_attachment';

type JobDestinationContext = {
  readonly destinationPath: string;
  readonly fixedParentProjectId: string | null;
};

async function resolveImportDestinationContext(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string
): Promise<JobDestinationContext> {
  const { data: job } = await supabase
    .from('crm_import_jobs')
    .select('fixed_parent_project_id')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  const fixedParentProjectId = (job?.fixed_parent_project_id as string | null) ?? null;
  if (!fixedParentProjectId) {
    return { destinationPath: '/projects', fixedParentProjectId: null };
  }

  const { data: project } = await supabase
    .from('crm_projects')
    .select('slug')
    .eq('id', fixedParentProjectId)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .maybeSingle();

  const slug = (project?.slug as string | null)?.trim() ?? '';
  if (!slug) {
    return { destinationPath: '/projects', fixedParentProjectId };
  }

  return {
    destinationPath: `/projects/${encodeURIComponent(slug)}`,
    fixedParentProjectId,
  };
}

export async function dispatchSpreadsheetImportCompletedNotifications(input: {
  readonly supabase: SupabaseClient;
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly jobId: string;
  readonly status: string;
  readonly counts: CrmImportJobCounts;
  readonly transitionedToTerminal: boolean;
}): Promise<void> {
  if (runtimeModes.isDemoRuntime()) return;

  try {
    const destination = await resolveImportDestinationContext(
      input.supabase,
      input.organizationId,
      input.jobId
    );
    await notifySpreadsheetImportCompletedInApp({
      accessToken: input.accessToken,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      recipientUserId: input.actorUserId,
      jobId: input.jobId,
      status: input.status,
      counts: input.counts,
      destinationPath: destination.destinationPath,
      transitionedToTerminal: input.transitionedToTerminal,
      supabase: input.supabase,
    });

    if (input.status !== 'completed' || !input.transitionedToTerminal) return;

    const memberMap = await loadCrmMemberMap(input.supabase, [input.actorUserId], {
      organizationId: input.organizationId,
    });
    const recipient = memberMap.get(input.actorUserId);
    const recipientEmail = recipient?.email?.trim() ?? '';
    if (!recipientEmail) return;

    const destinationUrl = joinBuildCorePublicAppUrl(destination.destinationPath);
    const emailResult = await relayCommunicationSend(input.accessToken, input.organizationId, {
      templateKey: SPREADSHEET_IMPORT_EMAIL_TEMPLATE_KEY,
      channel: 'email',
      recipient: {
        email: recipientEmail,
        name: recipient?.displayName ?? null,
        memberId: input.actorUserId,
      },
      ...(destination.fixedParentProjectId != null
        ? {
            entity: {
              type: 'project' as const,
              id: destination.fixedParentProjectId,
            },
          }
        : {}),
      subject: buildSpreadsheetImportCompletedEmailSubject(),
      message: buildSpreadsheetImportCompletedEmailMessage({
        counts: input.counts,
        destinationUrl,
      }),
    });

    if (!emailResult.ok) {
      console.info(
        JSON.stringify({
          tag: 'buildcore_spreadsheet_import_completed_email',
          event: 'send_failed',
          jobId: input.jobId,
          organizationId: input.organizationId,
          recipientUserId: input.actorUserId,
          errorKind: emailResult.error.kind,
          status: emailResult.error.kind === 'http_error' ? emailResult.error.status : undefined,
        })
      );
    }
  } catch (err: unknown) {
    console.info(
      JSON.stringify({
        tag: 'buildcore_spreadsheet_import_completed_notification',
        event: 'dispatch_exception',
        jobId: input.jobId,
        organizationId: input.organizationId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
