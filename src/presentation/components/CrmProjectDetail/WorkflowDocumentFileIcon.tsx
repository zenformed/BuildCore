'use client';

import type { ComponentType, ReactElement } from 'react';
import type { IconBaseProps } from 'react-icons';
import {
  FaFile,
  FaFileCsv,
  FaFileExcel,
  FaFileImage,
  FaFileLines,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaFileZipper,
} from 'react-icons/fa6';
import {
  inferWorkflowDocumentFileIconType,
  type WorkflowDocumentFileIconType,
} from '@/presentation/features/crmProjectDetail/workflowDocumentFileIconType';
import styles from './ProjectDetail.module.css';

const ICON_BY_TYPE: Record<
  WorkflowDocumentFileIconType,
  ComponentType<IconBaseProps>
> = {
  pdf: FaFilePdf,
  word: FaFileWord,
  sheet: FaFileExcel,
  text: FaFileLines,
  presentation: FaFilePowerpoint,
  image: FaFileImage,
  archive: FaFileZipper,
  generic: FaFile,
};

/** CSV uploads use the spreadsheet icon set; show CSV glyph when extension is .csv. */
function resolveIcon(
  fileType: WorkflowDocumentFileIconType,
  fileName: string
): ComponentType<IconBaseProps> {
  if (fileType === 'sheet' && fileName.toLowerCase().endsWith('.csv')) {
    return FaFileCsv;
  }
  return ICON_BY_TYPE[fileType];
}

export type WorkflowDocumentFileIconProps = {
  fileName: string;
  mimeType: string;
  /** Inline workflow task document menu */
  compact?: boolean;
  /** Documents modal / panel list rows */
  modal?: boolean;
};

export function WorkflowDocumentFileIcon({
  fileName,
  mimeType,
  compact = false,
  modal = false,
}: WorkflowDocumentFileIconProps): ReactElement {
  const fileType = inferWorkflowDocumentFileIconType(fileName, mimeType);
  const Icon = resolveIcon(fileType, fileName);
  const variantClass = styles[`docFileIconWrap_${fileType}`] ?? styles.docFileIconWrap_generic;
  const sizeClass = compact
    ? styles.docFileIconWrap_compact
    : modal
      ? styles.docFileIconWrap_modal
      : '';

  return (
    <span className={`${styles.docFileIconWrap} ${sizeClass} ${variantClass}`.trim()} aria-hidden>
      <Icon className={styles.docFileIconSvg} />
    </span>
  );
}
