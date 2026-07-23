'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CrmDirectUploadFileProgress } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { CrmDirectUploadQueue } from './CrmDirectUploadQueue';
import styles from './CrmDirectUploadStatus.module.css';

type ActiveCrmDirectUploadStatus = {
  readonly sessionId: string;
  readonly items: readonly CrmDirectUploadFileProgress[];
  readonly running: boolean;
  readonly onRetryFailed?: () => void;
  readonly onDismiss?: () => void;
};

type CrmDirectUploadStatusApi = {
  readonly publish: (status: ActiveCrmDirectUploadStatus) => void;
  readonly clear: (sessionId: string) => void;
};

const CrmDirectUploadStatusApiContext = createContext<CrmDirectUploadStatusApi | null>(null);
const CrmDirectUploadStatusActiveContext = createContext<ActiveCrmDirectUploadStatus | null>(
  null
);

function progressFingerprint(items: readonly CrmDirectUploadFileProgress[]): string {
  return items.map((item) => `${item.clientFileId}:${item.status}:${item.message ?? ''}`).join('|');
}

export function CrmDirectUploadStatusProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [active, setActive] = useState<ActiveCrmDirectUploadStatus | null>(null);

  const publish = useCallback((status: ActiveCrmDirectUploadStatus) => {
    setActive((current) => {
      if (
        current != null &&
        current.sessionId === status.sessionId &&
        current.running === status.running &&
        progressFingerprint(current.items) === progressFingerprint(status.items)
      ) {
        return current;
      }
      return status;
    });
  }, []);

  const clear = useCallback((sessionId: string) => {
    setActive((current) => (current?.sessionId === sessionId ? null : current));
  }, []);

  const api = useMemo(() => ({ publish, clear }), [publish, clear]);

  return (
    <CrmDirectUploadStatusApiContext.Provider value={api}>
      <CrmDirectUploadStatusActiveContext.Provider value={active}>
        {children}
      </CrmDirectUploadStatusActiveContext.Provider>
    </CrmDirectUploadStatusApiContext.Provider>
  );
}

/** Publishes row/panel upload progress so the section header host can show it. */
export function useReportCrmDirectUploadStatus(input: {
  readonly items: readonly CrmDirectUploadFileProgress[];
  readonly running: boolean;
  readonly onRetryFailed?: () => void;
  readonly onDismiss?: () => void;
}): void {
  const api = useContext(CrmDirectUploadStatusApiContext);
  const sessionId = useId();
  const handlersRef = useRef({
    onRetryFailed: input.onRetryFailed,
    onDismiss: input.onDismiss,
  });
  handlersRef.current = {
    onRetryFailed: input.onRetryFailed,
    onDismiss: input.onDismiss,
  };

  useEffect(() => {
    if (api == null) return;
    if (input.items.length === 0) {
      api.clear(sessionId);
      return;
    }
    api.publish({
      sessionId,
      items: input.items,
      running: input.running,
      onRetryFailed: () => {
        handlersRef.current.onRetryFailed?.();
      },
      onDismiss: () => {
        handlersRef.current.onDismiss?.();
      },
    });
  }, [api, input.items, input.running, sessionId]);

  useEffect(() => {
    return () => {
      api?.clear(sessionId);
    };
  }, [api, sessionId]);
}

/** Renders the active upload status floating under a nearby header + control. */
export function CrmDirectUploadStatusHost(): ReactElement | null {
  const active = useContext(CrmDirectUploadStatusActiveContext);
  if (active == null) return null;

  return (
    <span className={styles.host}>
      <CrmDirectUploadQueue
        items={active.items}
        running={active.running}
        onRetryFailed={active.onRetryFailed}
        onDismiss={active.onDismiss}
      />
    </span>
  );
}
