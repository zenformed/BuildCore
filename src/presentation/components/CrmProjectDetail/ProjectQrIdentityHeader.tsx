'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { getProjectIndustryDisplayLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ProjectPrimaryPhoto } from './ProjectPrimaryPhoto';
import detailStyles from './ProjectDetail.module.css';
import qrStyles from '@/presentation/components/qr/QrCode.module.css';

export type ProjectQrIdentityHeaderProps = {
  readonly project: CrmProjectSummary;
};

export function ProjectQrIdentityHeader({ project }: ProjectQrIdentityHeaderProps): ReactElement {
  return (
    <div className={qrStyles.qrDialogIdentity}>
      <ProjectPrimaryPhoto
        summary={project}
        canEdit={false}
        onPhotoUpdated={() => {}}
      />
      <div className={`${detailStyles.titleBlockContent} ${qrStyles.qrDialogIdentityText}`}>
        <p className={`${detailStyles.title} ${qrStyles.qrDialogIdentityName}`}>{project.client.name}</p>
        <p className={`${detailStyles.subtitle} ${detailStyles.headerTradeSubtitle} ${qrStyles.qrDialogIdentityIndustry}`}>
          {getProjectIndustryDisplayLabel(project.industry, project.customIndustry)}
        </p>
      </div>
    </div>
  );
}
