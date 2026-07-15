import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pluralizeDisplayTerm,
  resolveEntityTerminology,
  validateEntityTerminologyDisplayName,
  DEFAULT_ENTITY_TERMINOLOGY,
} from './entityTerminology';

describe('entityTerminology', () => {
  it('resolves default Project/Subproject values', () => {
    const terms = resolveEntityTerminology();
    assert.equal(terms.project, 'Project');
    assert.equal(terms.subproject, 'Subproject');
    assert.equal(terms.projects, 'Projects');
    assert.equal(terms.subprojects, 'Subprojects');
    assert.deepEqual(DEFAULT_ENTITY_TERMINOLOGY, {
      project: 'Project',
      subproject: 'Subproject',
    });
  });

  it('derives plurals from organization overrides', () => {
    const terms = resolveEntityTerminology({
      project: 'Bridal Show',
      subproject: 'Lead',
    });
    assert.equal(terms.project, 'Bridal Show');
    assert.equal(terms.projects, 'Bridal Shows');
    assert.equal(terms.subproject, 'Lead');
    assert.equal(terms.subprojects, 'Leads');
  });

  it('keeps organization overrides isolated per resolve call', () => {
    const orgA = resolveEntityTerminology({ project: 'Bridal Show' });
    const orgB = resolveEntityTerminology({ project: 'Jobsite' });
    assert.equal(orgA.project, 'Bridal Show');
    assert.equal(orgA.projects, 'Bridal Shows');
    assert.equal(orgB.project, 'Jobsite');
    assert.equal(orgB.projects, 'Jobsites');
    assert.equal(resolveEntityTerminology().project, 'Project');
  });

  it('capitalizes the first letter on validate and resolve', () => {
    const validated = validateEntityTerminologyDisplayName('lead');
    assert.equal(validated.ok, true);
    if (validated.ok) assert.equal(validated.value, 'Lead');

    const terms = resolveEntityTerminology({ project: 'bridal show', subproject: 'lead' });
    assert.equal(terms.project, 'Bridal show');
    assert.equal(terms.subproject, 'Lead');
    assert.equal(terms.projects, 'Bridal shows');
    assert.equal(terms.subprojects, 'Leads');
  });

  it('rejects empty values and trims whitespace', () => {
    assert.equal(validateEntityTerminologyDisplayName('').ok, false);
    assert.equal(validateEntityTerminologyDisplayName('   ').ok, false);
    const trimmed = validateEntityTerminologyDisplayName('  Bridal Show  ');
    assert.equal(trimmed.ok, true);
    if (trimmed.ok) assert.equal(trimmed.value, 'Bridal Show');
  });

  it('rejects oversized values', () => {
    const tooLong = 'x'.repeat(41);
    assert.equal(validateEntityTerminologyDisplayName(tooLong).ok, false);
  });

  it('pluralizes with a trailing s only when needed', () => {
    assert.equal(pluralizeDisplayTerm('Bridal Show'), 'Bridal Shows');
    assert.equal(pluralizeDisplayTerm('Lead'), 'Leads');
    assert.equal(pluralizeDisplayTerm('Projects'), 'Projects');
    assert.equal(pluralizeDisplayTerm('leads'), 'leads');
  });
});
