/** Extensible report export types for PDF and future formats. */
export type ReportExportTypeId =
  | 'full_year'
  | 'mtd'
  | 'qtd'
  | 'ytd'
  | 'custom_range';

export type ReportExportPeriodRange = {
  readonly type: ReportExportTypeId;
  readonly start: Date;
  readonly end: Date;
  readonly year?: number;
};

export type ReportExportContext = {
  readonly organizationName: string;
  readonly type: ReportExportTypeId;
  readonly year: number;
};
