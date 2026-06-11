export type OrganizationExportSheet = {
  readonly name: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export type OrganizationExportWorkbook = {
  readonly sheets: readonly OrganizationExportSheet[];
};

export type OrganizationExportTeamMemberRow = {
  readonly name: string;
  readonly email: string;
  readonly role: string;
};

export type OrganizationExportBuildInput = {
  readonly projects: readonly import('@/domain/crm').CrmProjectDetail[];
  readonly projectTimestampsById: ReadonlyMap<string, { readonly createdAt: string; readonly updatedAt: string }>;
  readonly stageLabelBySlug: ReadonlyMap<string, string>;
  readonly teamMembers: readonly OrganizationExportTeamMemberRow[];
};
