'use client';

import type { ReactElement } from 'react';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProfilePhotoModal } from '@/presentation/components/ProfilePhotoModal/ProfilePhotoModal';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';

export type BuildCoreDashboardModalsProps = {
  signOut: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
  };
  profilePhoto:
    | null
    | {
        isOpen: boolean;
        onClose: () => void;
        userEmail: string;
        avatarUrl: string | null | undefined;
        hasPhoto: boolean;
        onSuccess: () => void;
        getAccessToken?: () => string | null;
      };
};

export function BuildCoreDashboardModals({ signOut, profilePhoto }: BuildCoreDashboardModalsProps): ReactElement {
  return (
    <>
      <ConfirmModal
        isOpen={signOut.isOpen}
        onClose={signOut.onClose}
        onConfirm={() => {
          void signOut.onConfirm();
        }}
        title={nav.modals.signOut.title}
        message={nav.modals.signOut.message}
        confirmLabel={nav.modals.signOut.confirmLabel}
        cancelLabel={nav.modals.signOut.cancelLabel}
        variant="primary"
      />
      {profilePhoto ? (
        <ProfilePhotoModal
          isOpen={profilePhoto.isOpen}
          onClose={profilePhoto.onClose}
          userEmail={profilePhoto.userEmail}
          avatarUrl={profilePhoto.avatarUrl ?? null}
          hasPhoto={profilePhoto.hasPhoto}
          onSuccess={profilePhoto.onSuccess}
          getAccessToken={profilePhoto.getAccessToken}
        />
      ) : null}
    </>
  );
}
