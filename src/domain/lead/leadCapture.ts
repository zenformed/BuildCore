export type LeadCapturePublicState = 'ready' | 'invalid';

export type LeadCapturePublicContext = {
  readonly state: LeadCapturePublicState;
  readonly projectName: string;
  readonly organizationName: string;
  readonly industry: string | null;
  readonly hasProjectPhoto: boolean;
};

export type LeadCaptureSubmitInput = {
  readonly firstName: string;
  readonly lastName: string;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
};

export type LeadCaptureSubmitResult = {
  readonly contactCreated: boolean;
  readonly contactUpdated: boolean;
  readonly subprojectSlug: string;
  readonly subprojectName: string;
};
