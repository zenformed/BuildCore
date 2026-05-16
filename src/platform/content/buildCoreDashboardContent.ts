import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

export const buildCoreDashboardContent = {
  loading: {
    page: 'Loading…',
  },
  licenseLockout: {
    title: 'You do not have a valid license',
    message:
      'Your license key is invalid or missing. Please contact your administrator to continue.',
  },
  branding: {
    defaultShopNameFallback: buildcoreAppDefinition.displayName,
    logoSaveFailedFallback: 'Failed to save logo',
  },
  dashboard: {
    title: 'Projects',
    overviewTitle: 'Overview',
    overviewBody: 'Pipeline metrics and reports will appear here in a later phase.',
    aboutSectionTitle: 'BuildCore',
    aboutSectionBody:
      'Construction/trades CRM shell: SaaS auth, ZenformedCore profile/entitlement relay, and shared dashboard chrome from @zenformed/core.',
  },
  crm: {
    resultCount: (filtered: number, total: number): string =>
      `Showing ${filtered} of ${total} projects`,
    filters: {
      toolbarAriaLabel: 'Project filters',
      stageLabel: 'Stage',
      stageAll: 'All stages',
      priorityLabel: 'Priority',
      priorityAll: 'All priorities',
    },
    table: {
      regionAriaLabel: 'All projects',
      empty: 'No projects match your search or filters.',
      unassigned: 'Unassigned',
      rowAriaLabel: (name: string): string => `Open project ${name}`,
      columns: {
        project: 'Project / customer',
        contact: 'Contact',
        phone: 'Phone',
        priority: 'Priority',
        stage: 'Stage',
        waitingOn: 'Waiting on',
        notes: 'Notes',
        dealValue: 'Deal value',
        balance: 'Balance',
        assigned: 'Assigned',
        updated: 'Updated',
      },
    },
  },
  projectDetail: {
    backToProjects: 'All projects',
    pageTitleFallback: 'Project',
    pipelineAriaLabel: 'Pipeline stage progress',
    currentStage: 'Current stage',
    unassigned: 'Unassigned',
    nextStepLabel: 'Next step',
    noNextStep: 'No blockers noted',
    notFound: {
      title: 'Project not found',
      message: 'This project does not exist or the link is invalid.',
      back: 'Back to projects',
    },
    sections: {
      contact: 'Contact & project',
      financials: 'Deal & payments',
      pipeline: 'Pipeline progress',
      workflow: 'Workflow tasks',
      documents: 'Documents',
      accountability: 'Accountability',
    },
    fields: {
      contact: 'Contact',
      email: 'Email',
      phone: 'Phone',
      customer: 'Customer',
      assigned: 'Assigned',
      updated: 'Last updated',
      dealValue: 'Deal value',
      balance: 'Balance remaining',
      invoiced: 'Invoiced',
      paid: 'Paid',
    },
    milestones: {
      empty: 'No milestones on file.',
    },
    workflow: {
      empty: 'No workflow tasks for this project.',
      columns: {
        task: 'Task',
        stage: 'Stage',
        status: 'Status',
        assignee: 'Assignee',
        due: 'Due',
      },
    },
    documents: {
      empty: 'No documents yet.',
      uploadHint: 'Uploads coming in a later phase.',
      columns: {
        name: 'Document',
        kind: 'Type',
        stage: 'Stage',
        uploaded: 'Uploaded',
        status: 'Status',
      },
      statusReviewed: 'Reviewed',
      statusPending: 'Pending review',
    },
    accountability: {
      empty: 'No activity logged yet.',
    },
  },
} as const;
