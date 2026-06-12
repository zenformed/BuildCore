import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { isPaymentWorkflowTask, applyPaymentBalanceToProjectDetail } from '@/domain/crm/paymentWorkflow';

function clearManualStageCompletionInProject(
  project: CrmProjectDetail,
  stageSlug: PipelineStageSlug
): CrmProjectDetail {
  return {
    ...project,
    manualStageCompletions: project.manualStageCompletions.filter(
      (completion) => completion.stageSlug !== stageSlug
    ),
  };
}

export function applyWorkflowTasksToProject(
  project: CrmProjectDetail,
  workflowTasks: readonly CrmWorkflowTask[]
): CrmProjectDetail {
  return applyPaymentBalanceToProjectDetail({
    ...project,
    workflowTasks,
  });
}

export function patchWorkflowTaskInProject(
  project: CrmProjectDetail,
  task: CrmWorkflowTask
): CrmProjectDetail {
  const hasTask = project.workflowTasks.some((t) => t.id === task.id);
  const workflowTasks = hasTask
    ? project.workflowTasks.map((t) => (t.id === task.id ? task : t))
    : [...project.workflowTasks, task];
  let next = applyWorkflowTasksToProject(project, workflowTasks);
  if (!hasTask && !isPaymentWorkflowTask(task)) {
    next = clearManualStageCompletionInProject(next, task.stageSlug);
  }
  return next;
}

export function removeWorkflowTaskFromProject(
  project: CrmProjectDetail,
  taskId: string
): CrmProjectDetail {
  return applyWorkflowTasksToProject(
    project,
    project.workflowTasks.filter((t) => t.id !== taskId)
  );
}

export function appendWorkflowTaskDocument(
  project: CrmProjectDetail,
  document: CrmDocumentMetadata
): CrmProjectDetail {
  const withoutExisting = project.documents.filter((d) => d.id !== document.id);
  return {
    ...project,
    documents: [document, ...withoutExisting],
  };
}

export function removeWorkflowTaskDocument(
  project: CrmProjectDetail,
  documentId: string
): CrmProjectDetail {
  return {
    ...project,
    documents: project.documents.filter((d) => d.id !== documentId),
  };
}

export function replaceWorkflowTaskDocuments(
  project: CrmProjectDetail,
  taskId: string,
  taskDocuments: readonly CrmDocumentMetadata[]
): CrmProjectDetail {
  const otherDocuments = project.documents.filter((d) => d.workflowTaskId !== taskId);
  return {
    ...project,
    documents: [...taskDocuments, ...otherDocuments],
  };
}
