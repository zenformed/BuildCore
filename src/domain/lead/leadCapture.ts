export type LeadCapturePublicState = 'ready' | 'invalid';

export type LeadCapturePublicContext = {
  readonly state: LeadCapturePublicState;
  readonly projectName: string;
  readonly organizationName: string;
  readonly industry: string | null;
};

export type LeadCaptureSubmitInput = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
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
