import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  UNSET_DESTINATION_KEY,
  areFieldsReadyToContinue,
  buildFieldsDestinationGroups,
  disableFieldForImport,
  enableFieldForImport,
  fieldNeedsDestinationAttention,
  fieldsMappingSummary,
  fieldsRowClassName,
  findDuplicateSingleValueDestinations,
  isDestinationTakenByOtherRow,
  isKnownDestinationKey,
  isRemainingFieldDestinationReady,
  isRemainingFieldEnabled,
  resolveFieldsSelectValue,
  shouldConfirmAutoMatch,
} from '@/presentation/features/crmImport/interview/fieldsPresentation';
import { suggestColumnMappings } from '@/presentation/features/crmImport/suggestColumnMappings';

describe('fieldsPresentation', () => {
  it('treats ordinary remaining columns as enabled unless ignored', () => {
    assert.equal(
      isRemainingFieldEnabled({
        sourceIndex: 0,
        destinationKey: 'standard:subproject:city',
        placement: 'subproject',
      }),
      true
    );
    assert.equal(
      isRemainingFieldEnabled({
        sourceIndex: 1,
        destinationKey: 'ignored',
        placement: 'ignore',
      }),
      false
    );
  });

  it('unchecking maps to ignored and rechecking restores the prior destination', () => {
    const enabled = {
      sourceIndex: 2,
      destinationKey: 'standard:subproject:emails',
      placement: 'subproject' as const,
    };
    const disabled = disableFieldForImport(enabled);
    assert.equal(disabled.destinationKey, 'ignored');
    assert.equal(disabled.placement, 'ignore');
    assert.equal(isRemainingFieldEnabled(disabled), false);

    const restored = enableFieldForImport(disabled, {
      destinationKey: enabled.destinationKey,
      placement: enabled.placement,
    });
    assert.equal(restored.destinationKey, 'standard:subproject:emails');
    assert.equal(restored.placement, 'subproject');
  });

  it('a checked ignored/unset mapping is not permanently disabled', () => {
    const trapped = {
      sourceIndex: 3,
      destinationKey: 'ignored',
      placement: 'ignore' as const,
    };
    const reopened = enableFieldForImport(trapped, null);
    assert.equal(reopened.destinationKey, UNSET_DESTINATION_KEY);
    assert.equal(reopened.placement, 'subproject');
    assert.equal(isRemainingFieldEnabled(reopened), true);
    assert.equal(isRemainingFieldDestinationReady(reopened), false);
  });

  it('blocks duplicate single-value destinations but allows multiple phones up to 4', () => {
    const fields = [
      {
        sourceIndex: 0,
        destinationKey: 'standard:subproject:city',
        placement: 'subproject' as const,
      },
      {
        sourceIndex: 1,
        destinationKey: 'standard:subproject:city',
        placement: 'subproject' as const,
      },
      {
        sourceIndex: 2,
        destinationKey: 'standard:subproject:phones',
        placement: 'subproject' as const,
      },
      {
        sourceIndex: 3,
        destinationKey: 'standard:subproject:phones',
        placement: 'subproject' as const,
      },
    ];
    const duplicates = findDuplicateSingleValueDestinations(fields);
    assert.equal(duplicates.has('standard:subproject:city'), true);
    assert.equal(duplicates.has('standard:subproject:phones'), false);
    assert.equal(
      isDestinationTakenByOtherRow({
        fields,
        sourceIndex: 4,
        destinationKey: 'standard:subproject:city',
      }),
      true
    );
    assert.equal(
      isDestinationTakenByOtherRow({
        fields,
        sourceIndex: 4,
        destinationKey: 'standard:subproject:phones',
      }),
      false
    );

    const fourPhones = [0, 1, 2, 3].map((sourceIndex) => ({
      sourceIndex,
      destinationKey: 'standard:subproject:phones',
      placement: 'subproject' as const,
    }));
    assert.equal(
      isDestinationTakenByOtherRow({
        fields: fourPhones,
        sourceIndex: 4,
        destinationKey: 'standard:subproject:phones',
      }),
      true
    );
    assert.equal(
      findDuplicateSingleValueDestinations([
        ...fourPhones,
        {
          sourceIndex: 4,
          destinationKey: 'standard:subproject:phones',
          placement: 'subproject',
        },
      ]).has('standard:subproject:phones'),
      true
    );
  });

  it('treats orphaned destination keys as needing attention', () => {
    const groups = buildFieldsDestinationGroups({
      mode: 'into_existing_parent',
      existingCustomFields: [],
      labels: {
        standardFields: {
          contact_name: 'Contact name',
          emails: 'Email',
          phones: 'Phone',
          address_line_1: 'Address',
          city: 'City',
          state: 'State',
          postal_code: 'Zip code',
          notes: 'Notes',
          deal_value: 'Deal value',
          assignee_email: 'Assignee',
          stage: 'Stage',
          industry: 'Industry',
          custom_industry: 'Custom industry',
          priority: 'Priority',
          address_line_2: 'Address 2',
        },
        contactGroup: 'Contact',
        subprojectGroup: 'Subproject',
        projectGroup: 'Project',
        customGroup: 'Custom',
        newCustomField: 'New custom field',
        chooseDestination: 'Choose a destination',
      },
    });

    const orphaned = {
      sourceIndex: 0,
      destinationKey: 'existing_cf:project:gone:def-1',
      placement: 'project' as const,
    };
    assert.equal(isKnownDestinationKey(orphaned.destinationKey, groups), false);
    assert.equal(fieldNeedsDestinationAttention(orphaned, groups), true);
    assert.equal(resolveFieldsSelectValue(orphaned, groups), UNSET_DESTINATION_KEY);
    assert.equal(areFieldsReadyToContinue([orphaned], groups), false);
    assert.equal(fieldsMappingSummary([orphaned], groups).needsAttentionCount, 1);

    const mapped = {
      sourceIndex: 1,
      destinationKey: 'standard:subproject:state',
      placement: 'subproject' as const,
    };
    assert.equal(isKnownDestinationKey(mapped.destinationKey, groups), true);
    assert.equal(fieldNeedsDestinationAttention(mapped, groups), false);
    assert.equal(resolveFieldsSelectValue(mapped, groups), 'standard:subproject:state');
  });

  it('updates imported-column counts and readiness live', () => {
    const fields = [
      {
        sourceIndex: 0,
        destinationKey: 'standard:subproject:city',
        placement: 'subproject' as const,
      },
      {
        sourceIndex: 1,
        destinationKey: UNSET_DESTINATION_KEY,
        placement: 'subproject' as const,
      },
      {
        sourceIndex: 2,
        destinationKey: 'ignored',
        placement: 'ignore' as const,
      },
    ];
    const summary = fieldsMappingSummary(fields);
    assert.equal(summary.total, 3);
    assert.equal(summary.enabledCount, 2);
    assert.equal(summary.needsAttentionCount, 1);
    assert.equal(areFieldsReadyToContinue(fields), false);
    assert.equal(
      areFieldsReadyToContinue([
        fields[0]!,
        { ...fields[1]!, destinationKey: 'standard:subproject:notes' },
        fields[2]!,
      ]),
      true
    );
  });

  it('asks before auto-match overwrites deliberate user changes', () => {
    assert.equal(
      shouldConfirmAutoMatch({
        current: [
          {
            sourceIndex: 0,
            destinationKey: 'standard:subproject:notes',
            placement: 'subproject',
          },
        ],
        suggested: [
          {
            sourceIndex: 0,
            destinationKey: 'standard:subproject:city',
            placement: 'subproject',
          },
        ],
      }),
      true
    );
    assert.equal(
      shouldConfirmAutoMatch({
        current: [
          {
            sourceIndex: 0,
            destinationKey: 'standard:subproject:city',
            placement: 'subproject',
          },
        ],
        suggested: [
          {
            sourceIndex: 0,
            destinationKey: 'standard:subproject:city',
            placement: 'subproject',
          },
        ],
      }),
      false
    );
  });

  it('builds selected/muted row classes', () => {
    assert.equal(
      fieldsRowClassName({
        enabled: false,
        needsAttention: false,
        styles: { row: 'row', muted: 'muted', attention: 'attention' },
      }),
      'row muted'
    );
    assert.equal(
      fieldsRowClassName({
        enabled: true,
        needsAttention: true,
        styles: { row: 'row', muted: 'muted', attention: 'attention' },
      }),
      'row attention'
    );
  });

  it('auto-match suggestions map Cell Phone and Home Phone without trapping the second as ignored', () => {
    const suggestions = suggestColumnMappings({
      headers: ['Cell Phone', 'Home Phone', 'Mystery'],
      mode: 'into_existing_parent',
    });
    assert.equal(suggestions[0]?.destination.kind, 'standard_field');
    assert.equal(suggestions[1]?.destination.kind, 'standard_field');
    if (suggestions[0]?.destination.kind === 'standard_field') {
      assert.equal(suggestions[0].destination.key, 'phones');
    }
    if (suggestions[1]?.destination.kind === 'standard_field') {
      assert.equal(suggestions[1].destination.key, 'phones');
    }
    assert.equal(suggestions[2]?.destination.kind, 'ignored');
  });
});
