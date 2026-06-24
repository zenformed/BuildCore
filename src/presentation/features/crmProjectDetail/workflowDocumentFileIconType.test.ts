import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDocumentFileTypeLabel,
  inferWorkflowDocumentFileIconType,
} from '@/presentation/features/crmProjectDetail/workflowDocumentFileIconType';

describe('formatDocumentFileTypeLabel', () => {
  it('prefers extension from filename', () => {
    assert.equal(formatDocumentFileTypeLabel('report.pdf', ''), 'PDF');
    assert.equal(formatDocumentFileTypeLabel('photo.png', ''), 'PNG');
    assert.equal(formatDocumentFileTypeLabel('photo.jpg', ''), 'JPG');
    assert.equal(formatDocumentFileTypeLabel('photo.jpeg', ''), 'JPEG');
    assert.equal(formatDocumentFileTypeLabel('budget.xlsx', ''), 'XLSX');
    assert.equal(formatDocumentFileTypeLabel('export.csv', ''), 'CSV');
    assert.equal(formatDocumentFileTypeLabel('notes.docx', ''), 'DOCX');
    assert.equal(formatDocumentFileTypeLabel('readme.md', ''), 'MD');
    assert.equal(formatDocumentFileTypeLabel('archive.zip', ''), 'ZIP');
  });

  it('falls back to mime type when extension is missing', () => {
    assert.equal(formatDocumentFileTypeLabel('contract', 'application/pdf'), 'PDF');
    assert.equal(formatDocumentFileTypeLabel('sheet', 'text/csv'), 'CSV');
    assert.equal(formatDocumentFileTypeLabel('photo', 'image/png'), 'PNG');
  });

  it('returns OTH for unknown types', () => {
    assert.equal(formatDocumentFileTypeLabel('data', 'application/octet-stream'), 'OTH');
    assert.equal(formatDocumentFileTypeLabel('unknown', ''), 'OTH');
  });
});

describe('inferWorkflowDocumentFileIconType', () => {
  it('maps common file types to icon categories', () => {
    assert.equal(inferWorkflowDocumentFileIconType('a.pdf', ''), 'pdf');
    assert.equal(inferWorkflowDocumentFileIconType('a.png', ''), 'image');
    assert.equal(inferWorkflowDocumentFileIconType('a.xlsx', ''), 'sheet');
    assert.equal(inferWorkflowDocumentFileIconType('a.csv', ''), 'sheet');
    assert.equal(inferWorkflowDocumentFileIconType('a.docx', ''), 'word');
    assert.equal(inferWorkflowDocumentFileIconType('a.txt', ''), 'text');
    assert.equal(inferWorkflowDocumentFileIconType('a.zip', ''), 'archive');
    assert.equal(inferWorkflowDocumentFileIconType('a.bin', 'application/octet-stream'), 'generic');
  });
});
