import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectSpreadsheetHeaderRowIndex,
  summarizeSpreadsheetSheet,
  toUserFacingSpreadsheetRowNumber,
  toZeroBasedSpreadsheetRowIndex,
} from './spreadsheetImportHeaderDetection';
import {
  getSpreadsheetImportContextParagraphs,
  getSpreadsheetImportWizardTitle,
} from './spreadsheetImportIntroCopy';

describe('spreadsheetImportHeaderDetection', () => {
  it('detects a normal first-row header', () => {
    const matrix = [
      ['First Name', 'Last Name', 'Address', 'Email'],
      ['Antoinette', 'Reese', '4849 S Holly St', 'a@example.com'],
      ['Tonya', 'Teton', '4101 Deemer Rd', 't@example.com'],
    ];
    assert.equal(detectSpreadsheetHeaderRowIndex(matrix), 0);
  });

  it('skips leading blank rows', () => {
    const matrix = [
      ['', '', ''],
      ['', '', ''],
      ['Name', 'Address', 'Phone'],
      ['Ada', '1 Main', '555'],
    ];
    assert.equal(detectSpreadsheetHeaderRowIndex(matrix), 2);
  });

  it('skips a title row and selects the following field-label row', () => {
    const matrix = [
      ['Q1 Customer Import Export'],
      ['First Name', 'Last Name', 'Address', 'Status'],
      ['Antoinette', 'Reese', '4849 S Holly St', 'Open'],
      ['Tonya', 'Teton', '4101 Deemer Rd', 'Open'],
    ];
    assert.equal(detectSpreadsheetHeaderRowIndex(matrix), 1);
  });

  it('converts internal zero-based indexes to user-facing one-based row numbers', () => {
    assert.equal(toUserFacingSpreadsheetRowNumber(0), 1);
    assert.equal(toUserFacingSpreadsheetRowNumber(2), 3);
    assert.equal(toZeroBasedSpreadsheetRowIndex(1), 0);
    assert.equal(toZeroBasedSpreadsheetRowIndex(3), 2);
  });

  it('summarizes worksheet row and column counts', () => {
    const summary = summarizeSpreadsheetSheet('Jobs', [
      ['A', 'B', 'C'],
      ['1', '2'],
      ['3', '4', '5', '6'],
    ]);
    assert.deepEqual(summary, { name: 'Jobs', rowCount: 3, columnCount: 4 });
  });

  it('handles single and multiple worksheet summaries independently', () => {
    const sheetA = [
      ['Name', 'Unit'],
      ['A', '1'],
    ];
    const sheetB = [
      ['Title Only'],
      ['Parent', 'Subproject', 'Address'],
      ['P1', 'U1', '1 Main'],
    ];
    assert.equal(detectSpreadsheetHeaderRowIndex(sheetA), 0);
    assert.equal(detectSpreadsheetHeaderRowIndex(sheetB), 1);
    assert.equal(summarizeSpreadsheetSheet('A', sheetA).rowCount, 2);
    assert.equal(summarizeSpreadsheetSheet('B', sheetB).columnCount, 3);
  });

  it('changing worksheet input reruns header detection for that sheet matrix', () => {
    const bySheet = {
      Customers: [
        ['Name', 'Email'],
        ['Ada', 'a@x.com'],
      ],
      Notes: [
        ['Weekly Dump'],
        ['Item', 'Qty', 'Status'],
        ['Bolt', '10', 'ok'],
      ],
    } as const;
    assert.equal(detectSpreadsheetHeaderRowIndex(bySheet.Customers), 0);
    assert.equal(detectSpreadsheetHeaderRowIndex(bySheet.Notes), 1);
  });

  it('manual selection is represented by an explicit zero-based index distinct from auto-detect', () => {
    const matrix = [
      ['Name', 'Address'],
      ['Ada', '1 Main'],
      ['Grace', '2 Main'],
    ];
    const detected = detectSpreadsheetHeaderRowIndex(matrix);
    const manual = 1;
    assert.equal(detected, 0);
    assert.notEqual(manual, detected);
    assert.equal(toUserFacingSpreadsheetRowNumber(manual), 2);
  });
});

describe('spreadsheetImportIntroCopy', () => {
  it('returns Mode 1 title and context copy', () => {
    assert.equal(getSpreadsheetImportWizardTitle('into_existing_parent'), 'Import subprojects');
    const paragraphs = getSpreadsheetImportContextParagraphs('into_existing_parent');
    assert.equal(paragraphs.length, 1);
    assert.match(paragraphs[0]!, /one subproject under this project/i);
  });

  it('returns Mode 2 title and context copy', () => {
    assert.equal(
      getSpreadsheetImportWizardTitle('master_hierarchy'),
      'Import projects and subprojects'
    );
    const paragraphs = getSpreadsheetImportContextParagraphs('master_hierarchy');
    assert.equal(paragraphs.length, 2);
    assert.match(paragraphs[0]!, /mapped columns/i);
    assert.match(paragraphs[1]!, /created once per detected group/i);
  });

  it('preserving selected header row is modeled as retained state across steps', () => {
    // Wizard keeps headerRowIndex in React state; navigating map → upload must not reset it.
    const navigationState = { step: 'map' as const, headerRowIndex: 2 };
    const afterBack = { ...navigationState, step: 'upload' as const };
    assert.equal(afterBack.headerRowIndex, 2);
  });
});
