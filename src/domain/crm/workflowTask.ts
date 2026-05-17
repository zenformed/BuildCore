import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';

export type WorkflowTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done' | 'skipped';

export type CrmWorkflowTask = {
  readonly id: string;
  readonly stageSlug: PipelineStageSlug;
  readonly title: string;
  readonly status: WorkflowTaskStatus;
  readonly documentsRequired: boolean;
  readonly notes: string | null;
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly dueAt: string | null;
  readonly completedAt: string | null;
  readonly completedBy: CrmTeamMemberRef | null;
  readonly sortOrder: number;
};
