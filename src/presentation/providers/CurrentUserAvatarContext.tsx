'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

export type CurrentUserAvatarContextValue = {
  readonly currentUserId: string | null;
  /** Blob URL from `useUserAvatar` — same source as dashboard header. */
  readonly currentUserAvatarUrl: string | null;
};

const CurrentUserAvatarContext = createContext<CurrentUserAvatarContextValue>({
  currentUserId: null,
  currentUserAvatarUrl: null,
});

export function CurrentUserAvatarProvider({
  currentUserId,
  currentUserAvatarUrl,
  children,
}: {
  currentUserId: string | null;
  currentUserAvatarUrl: string | null;
  children: ReactNode;
}): ReactElement {
  return (
    <CurrentUserAvatarContext.Provider value={{ currentUserId, currentUserAvatarUrl }}>
      {children}
    </CurrentUserAvatarContext.Provider>
  );
}

export function useCurrentUserAvatar(): CurrentUserAvatarContextValue {
  return useContext(CurrentUserAvatarContext);
}
