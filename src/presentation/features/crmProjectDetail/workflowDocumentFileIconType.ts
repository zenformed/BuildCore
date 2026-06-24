import { extensionFromFileName } from '@/domain/crm/documentUpload';

export type WorkflowDocumentFileIconType =
  | 'pdf'
  | 'word'
  | 'sheet'
  | 'text'
  | 'presentation'
  | 'image'
  | 'archive'
  | 'generic';

const WORD_EXTENSIONS = new Set(['.doc', '.docx', '.rtf', '.odt']);
const SHEET_EXTENSIONS = new Set(['.xls', '.xlsx', '.csv', '.ods']);
const PRESENTATION_EXTENSIONS = new Set(['.ppt', '.pptx']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif', '.bmp', '.tif', '.tiff']);
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown']);

const MIME_TYPE_LABELS: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'text/csv': 'CSV',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/vnd.rar': 'RAR',
  'application/x-7z-compressed': '7Z',
};

function normalizeExtensionLabel(ext: string): string {
  const trimmed = ext.trim().toLowerCase();
  if (trimmed === '.jpeg') return 'JPEG';
  if (trimmed === '.jpg') return 'JPG';
  if (trimmed === '.md' || trimmed === '.markdown') return 'MD';
  return trimmed.slice(1).toUpperCase();
}

/** Human-readable file type label for document rows (extension-first). */
export function formatDocumentFileTypeLabel(fileName: string, mimeType: string): string {
  const ext = extensionFromFileName(fileName);
  if (ext.length > 1) {
    return normalizeExtensionLabel(ext);
  }

  const mime = mimeType.trim().toLowerCase();
  if (mime in MIME_TYPE_LABELS) {
    return MIME_TYPE_LABELS[mime]!;
  }
  if (mime.startsWith('image/')) {
    const subtype = mime.split('/')[1]?.split('+')[0]?.trim() ?? '';
    if (subtype === 'jpeg') return 'JPEG';
    if (subtype === 'svg+xml') return 'SVG';
    return subtype ? subtype.toUpperCase() : 'IMG';
  }

  return 'OTH';
}

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
  if (TEXT_EXTENSIONS.has(ext) || mime === 'text/plain' || mime === 'text/markdown') {
    return 'text';
  }
  if (PRESENTATION_EXTENSIONS.has(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return 'presentation';
  }
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
    return 'image';
  }
  if (
    ARCHIVE_EXTENSIONS.has(ext) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('archive') ||
    mime.includes('x-rar') ||
    mime.includes('x-7z')
  ) {
    return 'archive';
  }
  return 'generic';
}
