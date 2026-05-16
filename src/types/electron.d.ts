/**
 * Electron preload APIs exposed via contextBridge.
 * Only defined when the app runs inside Electron.
 */
export interface ElectronAuth {
  checkLicense: () => Promise<{ licensed: boolean; error?: string }>;
  saveSession: (session: { access_token: string; refresh_token?: string | null; expires_at?: number }) => void;
  getSession: () => Promise<{ access_token: string; refresh_token?: string; expires_at?: number; user_id?: string } | null>;
  clearSession: () => Promise<void>;
}

export interface ElectronSync {
  getJobs: (userId: string) => Promise<unknown[]>;
  upsertJob: (userId: string, job: Record<string, unknown>) => Promise<void>;
  deleteJob: (userId: string, jobId: string) => Promise<void>;
  syncNow: () => Promise<{ pushed?: number; error?: string }>;
}

declare global {
  interface Window {
    electronAuth?: ElectronAuth;
    electronSync?: ElectronSync;
  }
}

export {};
