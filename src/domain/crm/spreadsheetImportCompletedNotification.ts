export type SpreadsheetImportCompletedSignal = {
  readonly recipientUserId: string | null;
  readonly status: string;
  readonly transitionedToTerminal: boolean;
};

export function shouldNotifySpreadsheetImportCompleted(
  input: SpreadsheetImportCompletedSignal
): boolean {
  const recipient = input.recipientUserId?.trim() ?? '';
  if (!recipient) return false;
  if (input.status !== 'completed') return false;
  return input.transitionedToTerminal;
}

export function buildSpreadsheetImportCompletedIdempotencyKey(input: {
  readonly jobId: string;
  readonly recipientUserId: string;
  readonly status: string;
}): string {
  return `spreadsheet-import-completed:${input.jobId}:${input.recipientUserId}:${input.status}`;
}
