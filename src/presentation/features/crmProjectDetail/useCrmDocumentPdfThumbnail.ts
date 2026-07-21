'use client';

import { useEffect, useState } from 'react';
import {
  loadPdfFirstPageThumbnail,
  peekPdfPageThumbnail,
} from '@/presentation/features/crmProjectDetail/pdfPageThumbnail';

export type CrmDocumentPdfThumbnailState = {
  readonly url: string | null;
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
};

/**
 * Converts a PDF blob URL into a cached first-page JPEG thumbnail URL.
 */
export function useCrmDocumentPdfThumbnail(
  documentId: string | null,
  blobUrl: string | null,
  enabled: boolean
): CrmDocumentPdfThumbnailState {
  const [state, setState] = useState<CrmDocumentPdfThumbnailState>(() => {
    if (!documentId) return { url: null, status: 'idle' };
    const cached = peekPdfPageThumbnail(documentId);
    return cached
      ? { url: cached, status: 'ready' }
      : { url: null, status: 'idle' };
  });

  useEffect(() => {
    if (!enabled || !documentId) {
      setState({ url: null, status: 'idle' });
      return;
    }

    const cached = peekPdfPageThumbnail(documentId);
    if (cached) {
      setState({ url: cached, status: 'ready' });
      return;
    }

    if (!blobUrl) {
      setState({ url: null, status: 'loading' });
      return;
    }

    let cancelled = false;
    setState({ url: null, status: 'loading' });

    void (async () => {
      try {
        const response = await fetch(blobUrl);
        if (!response.ok) {
          if (!cancelled) setState({ url: null, status: 'error' });
          return;
        }
        const blob = await response.blob();
        const url = await loadPdfFirstPageThumbnail(documentId, blob);
        if (cancelled) return;
        if (url == null) setState({ url: null, status: 'error' });
        else setState({ url, status: 'ready' });
      } catch {
        if (!cancelled) setState({ url: null, status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobUrl, documentId, enabled]);

  return state;
}
