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

/** Firestore users/{uid}/themes に載せる user テーマのみ */
export type UserThemeRecord = ThemeRecord & { source: "user" };

/** クライアントがサーバーへ渡すローカル差分の本体 */
export interface SyncPayload {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: UserThemeRecord[];
  themeSettings: ThemeSettingRecord[];
  /** builtin をデフォルトへ戻した themeSettings の ID（リモート削除要求） */
  deletedThemeSettingIds: string[];
}

export interface MemoEntityIndex {
  id: string;
  updatedAt: string;
}

export interface SessionEntityIndex {
  id: string;
  endedAt: string | null;
}

export interface ThemeEntityIndex {
  id: string;
  updatedAt: string;
}

export interface ThemeSettingEntityIndex {
  id: string;
  updatedAt: string;
}

export interface SyncPullIndex {
  memos: MemoEntityIndex[];
  sessions: SessionEntityIndex[];
  themes: ThemeEntityIndex[];
  themeSettings: ThemeSettingEntityIndex[];
}

/** upload + pull を同一スナップショットで送る（JSON マージ不可のためネスト） */
export interface SyncRunRequest {
  payload: SyncPayload;
  index: SyncPullIndex;
}

export interface SyncStateQuery {
  /** 端末 IndexedDB の lastSyncedAt（ISO）。未同期端末は省略可 */
  localLastSyncedAt?: string | null;
}

export interface SyncStateData {
  lastSyncedAt: string | null;
  /** cloudLastSyncedAt > localLastSyncedAt のとき true（local 未指定時は false） */
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
  themes: UserThemeRecord[];
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
