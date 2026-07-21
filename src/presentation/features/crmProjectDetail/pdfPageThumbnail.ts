/**
 * Shared first-page PDF → JPEG thumbnail cache for gallery tiles.
 * One render pipeline per document id; no PDF viewer instances in the grid.
 */

const thumbnailByDocumentId = new Map<string, string>();
const inflightByDocumentId = new Map<string, Promise<string | null>>();

let workerConfigured = false;

async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured && typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    workerConfigured = true;
  }
  return pdfjs;
}

export function peekPdfPageThumbnail(documentId: string): string | undefined {
  return thumbnailByDocumentId.get(documentId);
}

/**
 * Renders page 1 of a PDF blob to a JPEG data URL and caches it by document id.
 */
export function loadPdfFirstPageThumbnail(
  documentId: string,
  blob: Blob
): Promise<string | null> {
  const cached = thumbnailByDocumentId.get(documentId);
  if (cached) return Promise.resolve(cached);

  const inflight = inflightByDocumentId.get(documentId);
  if (inflight) return inflight;

  const promise = (async (): Promise<string | null> => {
    try {
      const pdfjs = await loadPdfjs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      try {
        const page = await pdf.getPage(1);
        const unscaled = page.getViewport({ scale: 1 });
        // Keep gallery thumbs light while remaining sharp on retina.
        const scale = Math.min(1.5, 280 / Math.max(unscaled.width, 1));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d');
        if (context == null) return null;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.74);
        canvas.width = 0;
        canvas.height = 0;
        thumbnailByDocumentId.set(documentId, dataUrl);
        return dataUrl;
      } finally {
        await pdf.destroy();
      }
    } catch {
      return null;
    } finally {
      inflightByDocumentId.delete(documentId);
    }
  })();

  inflightByDocumentId.set(documentId, promise);
  return promise;
}
