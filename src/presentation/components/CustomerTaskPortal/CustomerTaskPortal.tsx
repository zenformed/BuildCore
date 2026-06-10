'use client';

import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CustomerTaskPortalView } from '@/domain/crm/customerTaskRequest';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './CustomerTaskPortal.module.css';

type CustomerTaskPortalProps = {
  readonly token: string;
};

type PendingFile = {
  readonly id: string;
  readonly file: File;
};

type PortalResponse = {
  readonly portal: CustomerTaskPortalView;
};

export function CustomerTaskPortal({ token }: CustomerTaskPortalProps): ReactElement {
  const copy = content.customerTaskPortal;
  const [portal, setPortal] = useState<CustomerTaskPortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<readonly PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortal = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(`/api/customer-task/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as PortalResponse;
      setPortal(data.portal);
    } catch {
      setPortal({ state: 'invalid', organizationName: '', projectName: '', taskTitle: '', taskInstructions: null, canSubmit: false, uploadedFiles: [] });
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const addFiles = (files: FileList | File[]): void => {
    const list = Array.from(files);
    if (list.length === 0 || !portal?.canSubmit || submitting) return;

    setError(null);
    setPendingFiles((current) => [
      ...current,
      ...list.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files != null) {
      addFiles(event.target.files);
      event.target.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleRemovePendingFile = (pendingFileId: string): void => {
    if (submitting) return;
    setPendingFiles((current) => current.filter((item) => item.id !== pendingFileId));
  };

  const uploadPendingFile = async (file: File): Promise<void> => {
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
  };

  const handleSubmit = async (): Promise<void> => {
    if (!portal?.canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    const queue = [...pendingFiles];
    try {
      for (const item of queue) {
        await uploadPendingFile(item.file);
        setPendingFiles((current) => current.filter((pending) => pending.id !== item.id));
      }

      const response = await fetch(`/api/customer-task/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText: null }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? copy.submitError);
      }

      setPendingFiles([]);
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
              disabled={submitting}
              onChange={handleFileInput}
            />
            <span className={styles.uploadButton}>{copy.chooseFiles}</span>
          </label>
        </div>

        {pendingFiles.length > 0 ? (
          <div>
            <span className={styles.metaLabel}>{copy.selectedFiles}</span>
            <ul className={styles.uploadedList}>
              {pendingFiles.map((item) => (
                <li key={item.id} className={styles.uploadedItem}>
                  <span className={styles.uploadedFileName}>{item.file.name}</span>
                  <button
                    type="button"
                    className={styles.removeFileButton}
                    aria-label={`${copy.removeFile}: ${item.file.name}`}
                    disabled={submitting}
                    onClick={() => handleRemovePendingFile(item.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          className={styles.submitButton}
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </div>
    </main>
  );
}
