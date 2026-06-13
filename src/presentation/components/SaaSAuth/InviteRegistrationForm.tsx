'use client';

import React from 'react';
import { ZenformedRegisterForm } from '@zenformed/core/auth';

export interface InviteRegistrationFormProps {
  readonly email: string;
  readonly onSubmit: (password: string, confirmPassword: string) => Promise<void>;
  readonly error?: string | null;
}

export function InviteRegistrationForm({
  email,
  onSubmit,
  error,
}: InviteRegistrationFormProps): React.ReactElement {
  return (
    <ZenformedRegisterForm
      initialEmail={email}
      emailReadOnly
      error={error}
      onSubmit={async ({ password, confirmPassword }) => onSubmit(password, confirmPassword)}
    />
  );
}
