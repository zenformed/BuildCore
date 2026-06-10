'use client';

import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerTaskPortalView } from '@/domain/crm/customerTaskRequest';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './CustomerTaskPortal.module.css';

type CustomerTaskPortalProps = {
  readonly token: string;
};

type PortalResponse = {
  readonly portal: CustomerTaskPortalView;
};

export function CustomerTaskPortal({ token }: CustomerTaskPortalProps): ReactElement {
  const copy = content.customerTaskPortal;
  const [portal, setPortal] = useState<CustomerTaskPortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortal = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/customer-task/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as PortalResponse;
      setPortal(data.portal);
    } catch {
      setPortal({ state: 'invalid', organizationName: '', projectName: '', taskTitle: '', taskInstructions: null, canSubmit: false, uploadedFileNames: [] });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const uploadFiles = async (files: FileList | File[]): Promise<void> => {
    const list = Array.from(files);
    if (list.length === 0 || !portal?.canSubmit) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`/api/customer-task/${encodeURIComponent(token)}/documents`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const body = (await response.json()) as { message?: string };
          throw new Error(body.message ?? copy.uploadError);
        }
      }
      await loadPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files != null) {
      void uploadFiles(event.target.files);
      event.target.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!portal?.canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/customer-task/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? copy.submitError);
      }
      await loadPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || portal == null) {
    return (
      <main className={styles.customerTaskPage}>
        <div className={styles.card}>
          <p className={styles.message}>{copy.loading}</p>
        </div>
      </main>
    );
  }

  if (portal.state === 'invalid') {
    return (
      <main className={styles.customerTaskPage}>
        <div className={styles.card}>
          <h1 className={styles.title}>{copy.invalidTitle}</h1>
          <p className={styles.message}>{copy.invalidMessage}</p>
        </div>
      </main>
    );
  }

  if (portal.state === 'expired') {
    return (
      <main className={styles.customerTaskPage}>
        <div className={styles.card}>
          <h1 className={styles.title}>{copy.expiredTitle}</h1>
          <p className={styles.message}>{copy.expiredMessage}</p>
        </div>
      </main>
    );
  }

  if (portal.state === 'submitted') {
    return (
      <main className={styles.customerTaskPage}>
        <div className={styles.card}>
          <h1 className={styles.successTitle}>{copy.submittedTitle}</h1>
          <p className={styles.message}>{copy.submittedMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.customerTaskPage}>
      <div className={styles.card}>
        <p className={styles.orgName}>{portal.organizationName}</p>
        <h1 className={styles.title}>{portal.taskTitle}</h1>

        <div className={styles.metaBlock}>
          <div>
            <span className={styles.metaLabel}>{copy.projectLabel}</span>
            <p className={styles.metaValue}>{portal.projectName}</p>
          </div>
          {portal.taskInstructions ? (
            <div>
              <span className={styles.metaLabel}>{copy.instructionsLabel}</span>
              <p className={`${styles.metaValue} ${styles.instructions}`}>{portal.taskInstructions}</p>
            </div>
          ) : null}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div
          className={[styles.uploadZone, dragOver ? styles.uploadZone_dragOver : ''].filter(Boolean).join(' ')}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <p className={styles.uploadHint}>{copy.uploadHint}</p>
          <label>
            <input
              className={styles.fileInput}
              type="file"
              multiple
              disabled={uploading || submitting}
              onChange={handleFileInput}
            />
            <span className={styles.uploadButton}>{uploading ? copy.submitting : copy.chooseFiles}</span>
          </label>
        </div>

        {portal.uploadedFileNames.length > 0 ? (
          <div>
            <span className={styles.metaLabel}>{copy.uploadedFiles}</span>
            <ul className={styles.uploadedList}>
              {portal.uploadedFileNames.map((fileName) => (
                <li key={fileName}>{fileName}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className={styles.field}>
          <span className={styles.metaLabel}>{copy.responseLabel}</span>
          <textarea
            className={styles.textarea}
            value={responseText}
            disabled={submitting}
            placeholder={copy.responsePlaceholder}
            onChange={(event) => setResponseText(event.target.value)}
          />
        </label>

        <button
          type="button"
          className={styles.submitButton}
          disabled={submitting || uploading}
          onClick={() => void handleSubmit()}
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </div>
    </main>
  );
}
