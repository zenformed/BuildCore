import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import type {
  CrmImportColumnMapping,
  CrmImportColumnOwnership,
  CrmImportDestination,
  CrmImportMode,
  CrmImportStandardFieldKey,
} from '@/domain/crm/spreadsheetImportTypes';

export type ExistingCustomFieldDefinition = {
  readonly scope: 'project' | 'subproject';
  readonly fieldKey: string;
  readonly definitionId: string;
  readonly label: string;
};

type AliasRule = {
  readonly key: CrmImportStandardFieldKey;
  readonly entity: 'parent' | 'subproject';
  readonly patterns: readonly RegExp[];
};

const ALIAS_RULES: readonly AliasRule[] = [
  {
    key: 'parent_name',
    entity: 'parent',
    patterns: [
      /^parent\s*name$/i,
      /^account\s*name$/i,
      /^customer\s*name$/i,
      /^company$/i,
      /^complex(\s*name)?$/i,
      /^community(\s*name)?$/i,
      /^property(\s*name)?$/i,
      /^project(\s*name)?$/i,
      /^site(\s*name)?$/i,
      /^hoa$/i,
    ],
  },
  {
    key: 'parent_identifier',
    entity: 'parent',
    patterns: [
      /^parent\s*id$/i,
      /^job\s*#?$/i,
      /^job\s*(number|no\.?)?$/i,
      /^project\s*id$/i,
      /^property\s*id$/i,
    ],
  },
  {
    key: 'subproject_name',
    entity: 'subproject',
    patterns: [
      /^sub\s*project/i,
      /^subproject/i,
      /^unit(\s*name|#)?$/i,
      /^apartment(\s*#|number)?$/i,
      /^suite(\s*#|number)?$/i,
      /^lot(\s*name|#)?$/i,
      /^work\s*order$/i,
      /^lead(\s*name)?$/i,
      /^job\s*name$/i,
    ],
  },
  {
    key: 'contact_name',
    entity: 'subproject',
    patterns: [/^contact(\s*name)?$/i, /^customer(\s*contact)?$/i, /^full\s*name$/i],
  },
  {
    key: 'emails',
    entity: 'subproject',
    patterns: [/^e-?mail(s)?$/i, /^email(\s*address(es)?)?$/i],
  },
  {
    key: 'phones',
    entity: 'subproject',
    patterns: [
      /^phone(s)?$/i,
      /^phone(\s*number(s)?)?$/i,
      /^mobile$/i,
      /^cell(\s*phone)?$/i,
      /^home\s*phone$/i,
    ],
  },
  {
    key: 'address_line_1',
    entity: 'subproject',
    patterns: [/^address(\s*line\s*1)?$/i, /^street(\s*address)?$/i, /^address$/i],
  },
  {
    key: 'city',
    entity: 'subproject',
    patterns: [/^city$/i],
  },
  {
    key: 'state',
    entity: 'subproject',
    patterns: [/^state$/i, /^province$/i],
  },
  {
    key: 'postal_code',
    entity: 'subproject',
    patterns: [/^zip(\s*code)?$/i, /^postal(\s*code)?$/i],
  },
  {
    key: 'notes',
    entity: 'subproject',
    patterns: [/^notes?$/i, /^comments?$/i],
  },
  {
    key: 'deal_value',
    entity: 'subproject',
    patterns: [/^deal(\s*value)?$/i, /^value$/i, /^amount$/i, /^contract(\s*amount)?$/i],
  },
  {
    key: 'assignee_email',
    entity: 'subproject',
    patterns: [/^assignee(\s*email)?$/i, /^owner(\s*email)?$/i, /^assigned(\s*to)?$/i],
  },
  {
    key: 'stage',
    entity: 'subproject',
    patterns: [/^stage$/i, /^pipeline(\s*stage)?$/i, /^status$/i],
  },
];

export function detectLikelyFirstLastNameColumns(
  headers: readonly string[]
): { readonly firstIndex: number; readonly lastIndex: number } | null {
  let firstIndex = -1;
  let lastIndex = -1;
  headers.forEach((header, index) => {
    const n = normalizeImportText(header);
    if (/^first(\s*name)?$/.test(n) || n === 'fname') firstIndex = index;
    if (/^last(\s*name)?$/.test(n) || n === 'lname' || n === 'surname') lastIndex = index;
  });
  if (firstIndex >= 0 && lastIndex >= 0) return { firstIndex, lastIndex };
  return null;
}

export function suggestProjectIdentityColumns(headers: readonly string[]): readonly number[] {
  const scored: { index: number; score: number }[] = [];
  headers.forEach((header, index) => {
    let score = 0;
    if (/\b(complex|community|property|project|site|customer|parent|hoa)\b/i.test(header)) {
      score += 5;
    }
    if (/\b(unit|apartment|suite|lot|email|phone|address)\b/i.test(header)) score -= 3;
    if (score > 0) scored.push({ index, score });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 1).map((s) => s.index);
}

export function suggestSubprojectIdentityColumns(headers: readonly string[]): readonly number[] {
  const scored: { index: number; score: number }[] = [];
  headers.forEach((header, index) => {
    let score = 0;
    if (/\b(unit|apartment|suite|lot|lead|work\s*order|job\s*name|subproject)\b/i.test(header)) {
      score += 5;
    }
    if (/\b(complex|community|property|project)\b/i.test(header)) score -= 2;
    if (score > 0) scored.push({ index, score });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 1).map((s) => s.index);
}

function matchAlias(header: string): AliasRule | null {
  const normalized = normalizeImportText(header);
  for (const rule of ALIAS_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized) || pattern.test(header.trim()))) {
      return rule;
    }
  }
  return null;
}

function matchExistingCustomField(
  header: string,
  definitions: readonly ExistingCustomFieldDefinition[] | undefined
): ExistingCustomFieldDefinition | null {
  if (definitions == null || definitions.length === 0) return null;
  const normalized = normalizeImportText(header);
  return (
    definitions.find((definition) => normalizeImportText(definition.label) === normalized) ?? null
  );
}

function ignoredMapping(sourceIndex: number, originalHeader: string): CrmImportColumnMapping {
  return {
    sourceIndex,
    originalHeader,
    ownership: 'ignored',
    destination: { kind: 'ignored' },
  };
}

function standardMapping(
  sourceIndex: number,
  originalHeader: string,
  key: CrmImportStandardFieldKey,
  entity: 'parent' | 'subproject',
  ownership: CrmImportColumnOwnership
): CrmImportColumnMapping {
  return {
    sourceIndex,
    originalHeader,
    ownership,
    destination: { kind: 'standard_field', entity, key },
  };
}

function resolveOwnership(
  mode: CrmImportMode,
  entity: 'parent' | 'subproject'
): CrmImportColumnOwnership {
  if (mode === 'into_existing_parent') {
    return entity === 'parent' ? 'ignored' : 'subproject';
  }
  return entity;
}

export function suggestColumnMappings(input: {
  readonly headers: readonly string[];
  readonly mode: CrmImportMode;
  readonly existingCustomFields?: readonly ExistingCustomFieldDefinition[];
}): readonly CrmImportColumnMapping[] {
  const usedDestinations = new Set<string>();

  return input.headers.map((header, sourceIndex) => {
    const alias = matchAlias(header);
    if (alias != null) {
      if (input.mode === 'into_existing_parent' && alias.entity === 'parent') {
        return ignoredMapping(sourceIndex, header);
      }
      const destinationKey = `standard:${alias.entity}:${alias.key}`;
      const isMultiValue = alias.key === 'phones' || alias.key === 'emails';
      if (usedDestinations.has(destinationKey) && !isMultiValue) {
        // Leave unmatched for the UI to prompt “Choose a destination” rather than trapping as ignored.
        return ignoredMapping(sourceIndex, header);
      }
      usedDestinations.add(destinationKey);
      const ownership = resolveOwnership(input.mode, alias.entity);
      if (ownership === 'ignored') {
        return ignoredMapping(sourceIndex, header);
      }
      return standardMapping(sourceIndex, header, alias.key, alias.entity, ownership);
    }

    const existingField = matchExistingCustomField(header, input.existingCustomFields);
    if (existingField != null) {
      const destinationKey = `cf:${existingField.scope}:${existingField.fieldKey}`;
      if (usedDestinations.has(destinationKey)) {
        return ignoredMapping(sourceIndex, header);
      }
      usedDestinations.add(destinationKey);
      const ownership =
        input.mode === 'into_existing_parent'
          ? existingField.scope === 'project'
            ? 'ignored'
            : 'subproject'
          : existingField.scope === 'project'
            ? 'parent'
            : 'subproject';
      if (ownership === 'ignored') {
        return ignoredMapping(sourceIndex, header);
      }
      const destination: CrmImportDestination = {
        kind: 'existing_custom_field',
        scope: existingField.scope,
        fieldKey: existingField.fieldKey,
        definitionId: existingField.definitionId,
      };
      return {
        sourceIndex,
        originalHeader: header,
        ownership,
        destination,
      };
    }

    return ignoredMapping(sourceIndex, header);
  });
}
