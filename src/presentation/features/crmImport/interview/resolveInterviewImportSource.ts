import type {
  CrmImportColumnMapping,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import type { ParsedSpreadsheetFile } from '@/presentation/features/crmImport/parseSpreadsheetFile';
import type { CrmImportInterviewState } from '@/presentation/features/crmImport/interview/interviewState';
import { buildHeaderRowImportSource } from '@/presentation/features/crmImport/interview/buildHeaderRowImportSource';
import {
  buildSelectedSheetsImportSource,
  buildWorksheetImportSource,
} from '@/presentation/features/crmImport/interview/buildWorksheetImportSource';
import { buildImportPayloadFromInterview } from '@/presentation/features/crmImport/interview/buildImportPayloadFromInterview';
import type { HeaderRowProjectGroup } from '@/domain/crm/spreadsheetImportProjectHeaderDetection';

export type ResolvedInterviewImportSource = {
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly sheetName: string;
  readonly headerRowIndex: number;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly importMode: ReturnType<typeof buildImportPayloadFromInterview>['importMode'];
  readonly fixedParentProjectId: string | null;
};

/**
 * Resolve the same import rows/mappings that Start Import will use, without
 * mutating wizard sheet state. Used by duplicate review and draft creation.
 */
export async function resolveInterviewImportSource(input: {
  readonly interview: CrmImportInterviewState;
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly sheetName: string;
  readonly headerRowIndex: number;
  readonly sheetMatrix: readonly (readonly string[])[];
  readonly headerRowGroups: readonly HeaderRowProjectGroup[];
  readonly parsedFile: ParsedSpreadsheetFile | null;
  readonly parseFailedMessage: string;
}): Promise<ResolvedInterviewImportSource> {
  const { interview } = input;
  const isWorksheetPerProject = interview.multiProjectOrganization === 'worksheet_per_project';
  const isHeaderRows = interview.multiProjectOrganization === 'header_rows';
  const isOneProjectSheets =
    interview.structureChoice === 'one_project' &&
    (interview.worksheetProjects ?? []).some((config) => config.included);

  let sourceHeaders = input.headers;
  let sourceRows = input.rows;
  let draftSheetName = input.sheetName;
  let draftHeaderRowIndex = input.headerRowIndex;

  if (isHeaderRows) {
    const combined = buildHeaderRowImportSource({
      matrix: input.sheetMatrix,
      columnHeaderRowIndex: input.headerRowIndex,
      sheetName: input.sheetName,
      groups: input.headerRowGroups,
      configs: interview.worksheetProjects ?? [],
      resolutions: interview.worksheetResolutions ?? {},
    });
    sourceHeaders = [...combined.headers];
    sourceRows = [...combined.rows];
    draftSheetName = combined.sheetName;
    draftHeaderRowIndex = combined.headerRowIndex;
  } else if (isWorksheetPerProject || isOneProjectSheets) {
    if (input.parsedFile == null) {
      throw new Error(input.parseFailedMessage);
    }
    const combined = isWorksheetPerProject
      ? await buildWorksheetImportSource({
          workbook: input.parsedFile.workbook,
          configs: interview.worksheetProjects ?? [],
          resolutions: interview.worksheetResolutions ?? {},
        })
      : await buildSelectedSheetsImportSource({
          workbook: input.parsedFile.workbook,
          configs: interview.worksheetProjects ?? [],
        });
    sourceHeaders = [...combined.headers];
    sourceRows = [...combined.rows];
    draftSheetName = combined.sheetName;
    draftHeaderRowIndex = combined.headerRowIndex;
  }

  const payload = buildImportPayloadFromInterview({
    state: interview,
    headers: sourceHeaders,
    rows: sourceRows,
  });

  return {
    headers: sourceHeaders,
    // Composed contact/subproject/parent values live on payload.rows (e.g. First+Last).
    // Mappings point at those injected cells — never return the raw source rows here.
    rows: payload.rows,
    sheetName: draftSheetName,
    headerRowIndex: draftHeaderRowIndex,
    mappings: payload.mappings,
    importMode: payload.importMode,
    fixedParentProjectId: payload.fixedParentProjectId,
  };
}
