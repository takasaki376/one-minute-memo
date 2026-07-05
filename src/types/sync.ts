export interface ThemeSettingRecord {
  id: string;
  isActive: boolean;
  updatedAt: string;
}

export interface CloudSyncState {
  lastSyncedAt: string;
  updatedAt: string;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string | null;
  uploadedMemos: number;
  downloadedMemos: number;
  uploadedSessions: number;
  downloadedSessions: number;
  uploadedThemes: number;
  downloadedThemes: number;
  uploadedThemeSettings: number;
  downloadedThemeSettings: number;
  updatedThemeSettings: number;
  uploadFailures: number;
  downloadFailures: number;
  error?: string;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";
