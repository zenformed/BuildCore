import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDocumentsZipFileName,
  uniqueZipEntryFileNames,
} from './documentZipEntryNames';

describe('uniqueZipEntryFileNames', () => {
  it('keeps the first name and suffixes duplicates', () => {
    assert.deepEqual(uniqueZipEntryFileNames(['photo.jpg', 'photo.jpg', 'photo.jpg']), [
      'photo.jpg',
      'photo (2).jpg',
      'photo (3).jpg',
    ]);
  });

  it('handles names without extensions', () => {
    assert.deepEqual(uniqueZipEntryFileNames(['readme', 'readme']), [
      'readme',
      'readme (2)',
    ]);
  });

  it('falls back for blank names', () => {
    assert.deepEqual(uniqueZipEntryFileNames(['', '  ']), ['file', 'file (2)']);
  });
});

describe('buildDocumentsZipFileName', () => {
  it('includes a sanitized project name and timestamp', () => {
    const name = buildDocumentsZipFileName('North Wing / Phase 1', new Date('2026-07-16T14:05:00'));
    assert.equal(name, 'North-Wing-Phase-1-documents-20260716-1405.zip');
  });

  it('falls back when the project name is empty', () => {
    const name = buildDocumentsZipFileName('   ', new Date('2026-07-16T14:05:00'));
    assert.equal(name, 'documents-20260716-1405.zip');
  });
});
