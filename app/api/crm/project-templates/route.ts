/**
 * GET /api/crm/project-templates — list organization project templates.
 * POST /api/crm/project-templates — save workflow tasks + payments blueprint from a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isBuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireCanManageBuildCoreProjectTemplates } from '@/infrastructure/crm/server/buildCoreProjectTemplatePermissionService';
import {
  createBuildCoreProjectTemplateFromProject,
  listBuildCoreProjectTemplatesForOrg,
} from '@/infrastructure/crm/server/crmProjectTemplateService';

export const dynamic = 'force-dynamic';

type CreateProjectTemplateBody = {
  name?: unknown;
  projectSlug?: unknown;
  templateScope?: unknown;
  setAsDefault?: unknown;
};

function parseSetAsDefault(raw: unknown): boolean {
  return raw === true;
}

function parseTemplateName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseProjectSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTemplateScope(raw: unknown): 'project' | 'subproject' | null {
  if (typeof raw !== 'string') return 'project';
  return isBuildCoreProjectTemplateScope(raw) ? raw : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const permission = await requireCanManageBuildCoreProjectTemplates(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!permission.ok) return permission.response;

  try {
    const scopeParam = request.nextUrl.searchParams.get('scope');
    const templateScope =
      scopeParam == null || scopeParam.trim() === ''
        ? undefined
        : parseTemplateScope(scopeParam);
    if (templateScope === null) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Template scope is invalid.' },
        { status: 400 }
      );
    }

    const templates = await listBuildCoreProjectTemplatesForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      templateScope != null ? { templateScope } : undefined
    );
    return NextResponse.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list project templates';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const permission = await requireCanManageBuildCoreProjectTemplates(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!permission.ok) return permission.response;

  let body: CreateProjectTemplateBody;
  try {
    body = (await request.json()) as CreateProjectTemplateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const name = parseTemplateName(body.name);
  const projectSlug = parseProjectSlug(body.projectSlug);
  if (name == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Template name is required.' },
      { status: 400 }
    );
  }
  if (projectSlug == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Project slug is required.' },
      { status: 400 }
    );
  }

  const templateScope = parseTemplateScope(body.templateScope);
  if (templateScope === null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Template scope is invalid.' },
      { status: 400 }
    );
  }

  try {
    const template = await createBuildCoreProjectTemplateFromProject(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      projectSlug,
      name,
      templateScope,
      parseSetAsDefault(body.setAsDefault)
    );
    return NextResponse.json({ template });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save project template';
    if (message === 'project_not_found') {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    if (message === 'template_scope_mismatch') {
      return NextResponse.json(
        { error: 'validation_error', message: 'Template scope does not match this project type.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
