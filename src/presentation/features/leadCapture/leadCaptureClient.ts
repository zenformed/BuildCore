import type { LeadCapturePublicContext, LeadCaptureSubmitInput } from '@/domain/lead/leadCapture';

export type LeadCaptureContextResponse = {
  readonly context: LeadCapturePublicContext;
};

export async function fetchLeadCaptureContext(token: string): Promise<LeadCapturePublicContext> {
  const response = await fetch(`/api/lead/${encodeURIComponent(token)}`, { cache: 'no-store' });
  const data = (await response.json()) as LeadCaptureContextResponse;
  return data.context;
}

export async function submitLeadCapture(
  token: string,
  input: LeadCaptureSubmitInput
): Promise<void> {
  const response = await fetch(`/api/lead/${encodeURIComponent(token)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message?.trim() || 'Could not submit your information.');
  }
}
