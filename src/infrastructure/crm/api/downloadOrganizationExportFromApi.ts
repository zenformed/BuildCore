import { organizationExportFilename } from '@/export/organization/organizationExportFilename';
import { downloadCrmDocumentAttachment } from './downloadCrmDocumentAttachment';

const ORGANIZATION_EXPORT_API_PATH = '/api/crm/organization/export';

export async function downloadOrganizationExportFromApi(): Promise<void> {
  await downloadCrmDocumentAttachment(
    ORGANIZATION_EXPORT_API_PATH,
    organizationExportFilename()
  );
}
