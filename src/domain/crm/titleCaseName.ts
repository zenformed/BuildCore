/** Common business suffixes kept uppercase when title-casing entity names. */
const PRESERVED_ACRONYMS = new Set([
  'LLC',
  'INC',
  'LLP',
  'LP',
  'PLLC',
  'PC',
  'DBA',
  'CO',
  'LTD',
]);

function capitalizeWordPart(part: string): string {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function titleCaseToken(token: string): string {
  const upper = token.toUpperCase();
  if (PRESERVED_ACRONYMS.has(upper)) return upper;

  if (token.includes("'")) {
    return token
      .split("'")
      .map((segment, index) => (index === 0 ? capitalizeWordPart(segment) : segment.toLowerCase()))
      .join("'");
  }

  if (token.includes('-')) {
    return token
      .split('-')
      .map((segment) => capitalizeWordPart(segment))
      .join('-');
  }

  return capitalizeWordPart(token);
}

/** Title-case person or customer/project names for create flows (not emails). */
export function titleCasePersonOrEntityName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/).map(titleCaseToken).join(' ');
}
