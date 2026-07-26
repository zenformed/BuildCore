'use client';

import type { ComponentType, DragEvent, ReactElement, RefObject } from 'react';
import { useRef, useState } from 'react';
import Image from 'next/image';
import type { IconBaseProps } from 'react-icons';
import {
  BsChevronRight,
  BsCloudArrowUp,
  BsDiagram3,
  BsFileEarmarkExcel,
  BsFolder2,
  BsGrid3X3Gap,
  BsInfoCircle,
} from 'react-icons/bs';
import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';
import { SPREADSHEET_IMPORT_LIMITS } from '@/domain/crm/spreadsheetImportLimits';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ParsedSpreadsheetFile } from '@/presentation/features/crmImport/parseSpreadsheetFile';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

/** Hero artwork only — UI icons use react-icons/bs. */
const UPLOAD_ILLUSTRATION = '/images/import/spreadsheet-upload-illustration.svg';

export type UploadScreenProps = {
  readonly mode: CrmImportMode;
  readonly fixedParentDisplayName?: string | null;
  readonly fixedParentContextLine?: string | null;
  readonly busy: boolean;
  readonly canImport: boolean;
  readonly selectedFile: File | null;
  readonly parsedFile: ParsedSpreadsheetFile | null;
  readonly sheetName: string;
  /** When false, sheet picker is deferred to a later interview step. */
  readonly showSheetPicker?: boolean;
  readonly onFileChange: (file: File | null) => void;
  readonly onSheetChange: (sheetName: string) => void;
};

function openFilePicker(inputRef: RefObject<HTMLInputElement | null>): void {
  inputRef.current?.click();
}

export function UploadScreen({
  mode,
  fixedParentDisplayName,
  fixedParentContextLine,
  busy,
  canImport,
  selectedFile,
  parsedFile,
  sheetName,
  showSheetPicker = true,
  onFileChange,
  onSheetChange,
}: UploadScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const upload = copy.interview.upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = busy || !canImport;

  const features: readonly {
    readonly Icon: ComponentType<IconBaseProps>;
    readonly title: string;
  }[] = [
    { Icon: BsDiagram3, title: upload.features.detectProjects.title },
    { Icon: BsGrid3X3Gap, title: upload.features.createSubprojects.title },
    { Icon: BsFolder2, title: upload.features.attachExisting.title },
  ];

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) onFileChange(file);
  };

  const DropzoneIcon = selectedFile ? BsFileEarmarkExcel : BsCloudArrowUp;

  return (
    <div className={styles.uploadHero}>
      <div className={styles.uploadHeroVisual}>
        <Image
          className={styles.uploadHeroIllustration}
          src={UPLOAD_ILLUSTRATION}
          alt={upload.illustrationAlt}
          width={480}
          height={400}
          priority
          unoptimized
        />
      </div>

      <div className={styles.uploadHeroContent}>
        {mode === 'into_existing_parent' ? (
          <div className={styles.contextBlock}>
            <p className={styles.contextLabel}>{copy.upload.importingIntoLabel}</p>
            {fixedParentDisplayName ? (
              <p className={styles.contextProjectName}>{fixedParentDisplayName}</p>
            ) : null}
            {fixedParentContextLine ? (
              <p className={styles.contextMeta}>{fixedParentContextLine}</p>
            ) : null}
          </div>
        ) : null}

        <h2 className={styles.uploadHeroHeading}>{upload.heading}</h2>
        <p className={styles.uploadHeroDescription}>{upload.description}</p>

        <ol className={styles.uploadProcessList} aria-label={upload.heading}>
          {features.map((feature, index) => (
            <li key={feature.title} className={styles.uploadProcessStep}>
              {index > 0 ? (
                <span className={styles.uploadProcessChevron} aria-hidden="true">
                  <BsChevronRight size={14} />
                </span>
              ) : null}
              <span className={styles.uploadProcessCard}>
                <span className={styles.uploadProcessIconTile} aria-hidden="true">
                  <feature.Icon className={styles.uploadProcessIcon} size={20} />
                </span>
                <span className={styles.uploadProcessLabel}>{feature.title}</span>
              </span>
            </li>
          ))}
        </ol>

        <div
          className={[
            styles.uploadDropzone,
            dragging ? styles.uploadDropzoneDragging : '',
            selectedFile ? styles.uploadDropzoneHasFile : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            id="spreadsheet-import-file"
            className={styles.srOnly}
            type="file"
            accept=".csv,.xlsx,.xls"
            disabled={disabled}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />

          <span className={styles.uploadDropzoneIconWrap} aria-hidden="true">
            <DropzoneIcon className={styles.uploadDropzoneIcon} size={28} />
          </span>

          <p className={styles.uploadDropzoneHeading}>{upload.dropzone.heading}</p>
          <p className={styles.uploadDropzoneSubtext}>{upload.dropzone.subtext}</p>

          <button
            type="button"
            className={styles.uploadChooseButton}
            disabled={disabled}
            onClick={() => openFilePicker(inputRef)}
          >
            {selectedFile ? upload.dropzone.replaceFile : upload.dropzone.chooseFile}
          </button>

          <p
            className={styles.uploadSelectedFile}
            data-empty={selectedFile ? undefined : 'true'}
            aria-hidden={selectedFile ? undefined : true}
          >
            {selectedFile ? (
              <>
                <span className={styles.uploadSelectedLabel}>{upload.dropzone.selectedLabel}:</span>{' '}
                {selectedFile.name}
              </>
            ) : (
              '\u00a0'
            )}
          </p>
        </div>

        <ul className={styles.uploadLimitsList}>
          <li>{upload.limits.formats}</li>
          <li>{upload.limits.maxSize}</li>
          <li>
            {`Maximum ${SPREADSHEET_IMPORT_LIMITS.maxRows.toLocaleString()} rows`}
          </li>
          <li>
            {`Maximum ${SPREADSHEET_IMPORT_LIMITS.maxColumns.toLocaleString()} columns`}
          </li>
        </ul>

        <div className={styles.uploadParseStatus} aria-live="polite">
          {showSheetPicker ? (
            <div
              className={styles.uploadSheetSlot}
              data-empty={parsedFile ? undefined : 'true'}
              aria-hidden={parsedFile ? undefined : true}
            >
              <div className={styles.uploadSheetField}>
                <label className={styles.label} htmlFor="spreadsheet-import-sheet">
                  {upload.sheetLabel}
                </label>
                <select
                  id="spreadsheet-import-sheet"
                  className={styles.select}
                  value={parsedFile ? sheetName : ''}
                  disabled={busy || !parsedFile}
                  onChange={(event) => onSheetChange(event.target.value)}
                >
                  {parsedFile ? (
                    parsedFile.sheetSummaries.map((summary) => (
                      <option key={summary.name} value={summary.name}>
                        {upload.sheetOptionLabel(summary.name, summary.rowCount, summary.columnCount)}
                      </option>
                    ))
                  ) : (
                    <option value="">Select a file first</option>
                  )}
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.uploadTrustPanel} role="note">
          <BsInfoCircle className={styles.uploadTrustIcon} size={18} aria-hidden />
          <div>
            <p className={styles.uploadTrustTitle}>{upload.trust.title}</p>
            <p className={styles.uploadTrustBody}>{upload.trust.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

