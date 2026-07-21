'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { LeadCapturePublicContext } from '@/domain/lead/leadCapture';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  fetchLeadCaptureContext,
  submitLeadCapture,
} from '@/presentation/features/leadCapture/leadCaptureClient';
import { LeadCaptureForm } from '@/presentation/components/leadCapture/LeadCaptureForm';
import styles from './LeadCapture.module.css';

export type LeadCapturePageProps = {
  readonly token: string;
};

export function LeadCapturePage({ token }: LeadCapturePageProps): ReactElement {
  const copy = content.leadCapture;
  const [context, setContext] = useState<LeadCapturePublicContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const loadContext = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const nextContext = await fetchLeadCaptureContext(token);
      setContext(nextContext);
    } catch {
      setContext({
        state: 'invalid',
        projectName: '',
        organizationName: '',
        industry: null,
        hasProjectPhoto: false,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <p className={styles.loading}>{copy.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (context == null || context.state === 'invalid') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <h1 className={styles.invalidTitle}>{copy.invalidTitle}</h1>
            <p className={styles.invalidMessage}>{copy.invalidMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <h1 className={styles.successTitle}>{copy.successTitle}</h1>
            <p className={styles.successMessage}>{copy.successMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {context.hasProjectPhoto && !photoFailed ? (
          <img
            className={styles.projectImage}
            src={`/api/lead/${encodeURIComponent(token)}/photo`}
            alt={`${context.projectName} project`}
            onError={() => setPhotoFailed(true)}
          />
        ) : null}
        <div className={styles.cardContent}>
          <h1 className={styles.title}>{context.projectName}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          <LeadCaptureForm
            submitting={submitting}
            onSubmit={async (input) => {
              setSubmitting(true);
              try {
                await submitLeadCapture(token, input);
                setSubmitted(true);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
