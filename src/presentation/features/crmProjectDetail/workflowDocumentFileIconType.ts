import { extensionFromFileName } from '@/domain/crm/documentUpload';

export type WorkflowDocumentFileIconType =
  | 'pdf'
  | 'word'
  | 'sheet'
  | 'text'
  | 'presentation'
  | 'generic';

const WORD_EXTENSIONS = new Set(['.doc', '.docx', '.rtf', '.odt']);
const SHEET_EXTENSIONS = new Set(['.xls', '.xlsx', '.csv', '.ods']);
const PRESENTATION_EXTENSIONS = new Set(['.ppt', '.pptx']);

export function inferWorkflowDocumentFileIconType(
  fileName: string,
  mimeType: string
): WorkflowDocumentFileIconType {
  const ext = extensionFromFileName(fileName);
  const mime = mimeType.trim().toLowerCase();

  if (ext === '.pdf' || mime === 'application/pdf') return 'pdf';
  if (WORD_EXTENSIONS.has(ext) || mime.includes('word') || mime.includes('opendocument.text')) {
    return 'word';
  }
  if (
    SHEET_EXTENSIONS.has(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('ms-excel') ||
    mime === 'text/csv'
  ) {
    return 'sheet';
  }
  if (ext === '.txt' || mime === 'text/plain') return 'text';
  if (PRESENTATION_EXTENSIONS.has(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return 'presentation';
  }
  return 'generic';
}
