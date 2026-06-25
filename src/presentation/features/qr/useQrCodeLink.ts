'use client';

import { useCallback, useEffect, useState } from 'react';

export type QrCopyLinkFeedback = 'success' | 'error' | null;

export function useQrCodeLink(url: string) {
  const [copyFeedback, setCopyFeedback] = useState<QrCopyLinkFeedback>(null);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback('success');
    } catch {
      setCopyFeedback('error');
    }
  }, [url]);

  useEffect(() => {
    if (copyFeedback == null) return;
    const timeoutId = window.setTimeout(() => setCopyFeedback(null), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  return {
    copyLink,
    copyFeedback,
  };
}
