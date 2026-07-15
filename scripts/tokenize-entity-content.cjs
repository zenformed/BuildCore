const fs = require('fs');
const path = 'src/platform/content/buildCoreDashboardContent.ts';
const src = fs.readFileSync(path, 'utf8');

const T = {
  project: '§E1§',
  projects: '§E2§',
  subproject: '§E3§',
  subprojects: '§E4§',
  projectLc: '§E5§',
  projectsLc: '§E6§',
  subprojectLc: '§E7§',
  subprojectsLc: '§E8§',
};

const protections = [
  ['Projected', '__TK_PROJECTED__'],
  ['projection', '__TK_PROJECTION__'],
  ['Projection', '__TK_PROJECTION_C__'],
];

function tokenizeStringBody(body) {
  let s = body;
  for (const [from, to] of protections) s = s.split(from).join(to);
  const reps = [
    [/Subprojects/g, T.subprojects],
    [/Subproject/g, T.subproject],
    [/subprojects/g, T.subprojectsLc],
    [/subproject/g, T.subprojectLc],
    [/Projects/g, T.projects],
    [/Project/g, T.project],
    [/projects/g, T.projectsLc],
    [/project/g, T.projectLc],
  ];
  for (const [re, tok] of reps) s = s.replace(re, tok);
  for (const [from, to] of protections) s = s.split(to).join(from);
  return s;
}

function transformAll(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      let content = '';
      let built = quote;
      while (j < input.length) {
        if (input[j] === '\\') {
          content += input[j] + (input[j + 1] ?? '');
          j += 2;
          continue;
        }
        if (quote === '`' && input[j] === '$' && input[j + 1] === '{') {
          built += tokenizeStringBody(content) + '${';
          content = '';
          let depth = 1;
          j += 2;
          while (j < input.length && depth > 0) {
            const c = input[j];
            if (c === '{') depth++;
            else if (c === '}') depth--;
            if (depth > 0) built += c;
            j++;
          }
          built += '}';
          continue;
        }
        if (input[j] === quote) {
          built += tokenizeStringBody(content) + quote;
          j++;
          break;
        }
        content += input[j];
        j++;
      }
      out += built;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function restoreDeferredSections(original, transformed) {
  const sections = ['leadCapture', 'customerTaskPortal'];
  let result = transformed;
  for (const name of sections) {
    const re = new RegExp(`(\\n  ${name}: \\{[\\s\\S]*?\\n  \\},)`, 'm');
    const origMatch = original.match(re);
    const transMatch = result.match(re);
    if (origMatch && transMatch) {
      result = result.replace(transMatch[1], origMatch[1]);
      console.log('Restored deferred section:', name);
    } else {
      console.warn('Could not restore section:', name, !!origMatch, !!transMatch);
    }
  }
  return result;
}

const marker = 'export const buildCoreDashboardContent = {';
const eqIdx = src.indexOf(marker);
if (eqIdx < 0) throw new Error('export not found');
const head = src.slice(0, eqIdx);
const originalBody = src.slice(eqIdx);
let body = transformAll(originalBody);
body = restoreDeferredSections(originalBody, body);
body = body.replace(marker, 'const buildCoreDashboardContentSource = {');
body = body.replace(/\n\} as const;\s*$/, '\n} as const;\n');

const importBlock = `import type { ResolvedEntityTerminology } from '@/domain/buildcore/entityTerminology';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';
import { deepResolveEntityTerminologyTokens } from '@/platform/content/resolveEntityTerminologyTokens';
`;

const headWithImports = head.includes('resolveEntityTerminologyTokens')
  ? head
  : head.replace(
      "import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';\n",
      "import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';\n" +
        importBlock
    );

const footerFns = `
export type BuildCoreDashboardContent = ReturnType<typeof createBuildCoreDashboardContent>;

export function createBuildCoreDashboardContent(
  terms: ResolvedEntityTerminology = resolveEntityTerminology()
) {
  return deepResolveEntityTerminologyTokens(buildCoreDashboardContentSource, terms);
}

let activeDashboardContent = createBuildCoreDashboardContent();

export function bindBuildCoreDashboardContent(terms: ResolvedEntityTerminology): void {
  activeDashboardContent = createBuildCoreDashboardContent(terms);
}

export function getBuildCoreDashboardContent() {
  return activeDashboardContent;
}

/** Live-bound content. Prefer reading during render after EntityTerminologyProvider binds terms. */
export const buildCoreDashboardContent = new Proxy(
  {} as ReturnType<typeof createBuildCoreDashboardContent>,
  {
    get(_target, prop, receiver) {
      const current = activeDashboardContent;
      const value = Reflect.get(current as object, prop, receiver);
      return typeof value === 'function' ? (value as Function).bind(current) : value;
    },
    ownKeys() {
      return Reflect.ownKeys(activeDashboardContent as object);
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(activeDashboardContent as object, prop);
    },
    has(_target, prop) {
      return Reflect.has(activeDashboardContent as object, prop);
    },
  }
);
`;

fs.writeFileSync(path, headWithImports + body.trimEnd() + '\n' + footerFns);
const out = fs.readFileSync(path, 'utf8');
console.log('Transformed', path);
for (const s of [
  '§E1§ Stages',
  '§E3§ Stages',
  '§E2§',
  'Projected Profit',
  '§E5§',
  "projectLabel: 'Project'",
  '§E1§§',
]) {
  console.log(JSON.stringify(s), out.includes(s) ? 'OK' : 'MISSING');
}
