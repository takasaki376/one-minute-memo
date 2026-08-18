import type { ApiResult } from "@/types/api";
import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";

export interface ThemeSettingRecord {
  id: string;
  isActive: boolean;
  updatedAt: string;
}

export interface CloudSyncState {
  lastSyncedAt: string;
  updatedAt: string;
}

/** クライアントがサーバーへ渡すローカル差分の本体 */
export interface SyncPayload {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: ThemeRecord[];
  themeSettings: ThemeSettingRecord[];
}

export interface SyncEntityIndex {
  id: string;
  updatedAt?: string;
  endedAt?: string | null;
}

export interface SyncPullIndex {
  memos: SyncEntityIndex[];
  sessions: SyncEntityIndex[];
  themes: SyncEntityIndex[];
  themeSettings: SyncEntityIndex[];
}

export interface SyncStateData {
  lastSyncedAt: string | null;
  hasRemoteDifference: boolean;
}

export interface SyncMutationCounts {
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
}

export interface SyncUploadData extends SyncMutationCounts {
  lastSyncedAt: string;
}

export interface SyncPullData extends SyncMutationCounts {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: ThemeRecord[];
  themeSettings: ThemeSettingRecord[];
  deletedThemeSettingIds: string[];
  lastSyncedAt: string;
}

export interface SyncRunData extends SyncPullData {}

export type SyncResponse =
  | ApiResult<SyncStateData>
  | ApiResult<SyncUploadData>
  | ApiResult<SyncPullData>
  | ApiResult<SyncRunData>;

export type SyncErrorResponse = Extract<SyncResponse, { success: false }>;

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
