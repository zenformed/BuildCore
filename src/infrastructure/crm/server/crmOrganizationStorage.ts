import type { SupabaseClient } from '@supabase/supabase-js';

import {

  STORAGE_LIMIT_EXCEEDED_CODE,

  STORAGE_LIMIT_EXCEEDED_MESSAGE,

} from '@/domain/crm/documentUpload';

import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';



export async function reserveOrganizationStorage(

  supabase: SupabaseClient,

  organizationId: string,

  bytes: number

): Promise<void> {

  const { error } = await supabase.rpc('crm_reserve_organization_storage', {

    p_organization_id: organizationId,

    p_bytes: bytes,

  });

  if (error) {

    if (error.message.includes('STORAGE_LIMIT_EXCEEDED')) {

      throw new CrmDocumentServiceError(STORAGE_LIMIT_EXCEEDED_CODE, STORAGE_LIMIT_EXCEEDED_MESSAGE);

    }

    throw new Error(error.message);

  }

}



export async function releaseOrganizationStorage(

  supabase: SupabaseClient,

  organizationId: string,

  bytes: number

): Promise<void> {

  const { error } = await supabase.rpc('crm_release_organization_storage', {

    p_organization_id: organizationId,

    p_bytes: bytes,

  });

  if (error) {

    throw new Error(error.message);

  }

}

