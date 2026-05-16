import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';

export type CrmAccountabilityAction = {
  readonly id: string;
  readonly at: string;
  readonly actor: CrmTeamMemberRef;
  readonly action: string;
  readonly stageSlug: PipelineStageSlug | null;
};
