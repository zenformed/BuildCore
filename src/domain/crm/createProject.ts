import type { CrmPriority, CrmTradeType } from './project';
import type { PipelineStageSlug } from './pipelineStage';

/** Input for creating a CRM project + linked client/contact. */
export type CreateCrmProjectInput = {
  readonly name: string;
  readonly tradeType: CrmTradeType;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly priority: CrmPriority;
  readonly currentStageSlug: PipelineStageSlug;
  readonly waitingOn: string | null;
  readonly notes: string | null;
  readonly dealValueCents: number;
  readonly balanceRemainingCents: number;
  readonly assignedMemberId: string | null;
};

export type CreateCrmProjectResult = {
  readonly id: string;
  readonly slug: string;
};
