import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type {
  SyncMutationCounts,
  SyncPayload,
  SyncPullIndex,
  ThemeSettingRecord,
  UserThemeRecord,
} from "@/types/sync";

import { planPull, planUpload, type RemoteCollections } from "./syncPlan";

export type UploadWriteResult = {
  memoFailures: number;
  sessionFailures: number;
  themeFailures: number;
  themeSettingFailures: number;
  deleteFailures: number;
};

export interface SyncStore {
  load(uid: string): Promise<RemoteCollections>;
  writeUpload(
    uid: string,
    plan: ReturnType<typeof planUpload>,
  ): Promise<UploadWriteResult>;
  getLastSyncedAt(uid: string): Promise<string | null>;
  setLastSyncedAt(uid: string, iso: string): Promise<void>;
}

export function emptyMutationCounts(): SyncMutationCounts {
  return {
    uploadedMemos: 0,
    downloadedMemos: 0,
    uploadedSessions: 0,
    downloadedSessions: 0,
    uploadedThemes: 0,
    downloadedThemes: 0,
    uploadedThemeSettings: 0,
    downloadedThemeSettings: 0,
    updatedThemeSettings: 0,
    uploadFailures: 0,
    downloadFailures: 0,
  };
}

export function sumUploadFailures(result: UploadWriteResult): number {
  return (
    result.memoFailures +
    result.sessionFailures +
    result.themeFailures +
    result.themeSettingFailures +
    result.deleteFailures
  );
}

export async function executeUpload(
  uid: string,
  payload: SyncPayload,
  store: SyncStore,
  remote?: RemoteCollections,
): Promise<{
  counts: SyncMutationCounts;
  remote: RemoteCollections;
  lastSyncedAt: string;
}> {
  const snapshot = remote ?? (await store.load(uid));
  const plan = planUpload(payload, snapshot);
  const written = await store.writeUpload(uid, plan);
  const lastSyncedAt = new Date().toISOString();
  await store.setLastSyncedAt(uid, lastSyncedAt);

  const counts = emptyMutationCounts();
  counts.uploadedMemos = plan.memos.length - written.memoFailures;
  counts.uploadedSessions = plan.sessions.length - written.sessionFailures;
  counts.uploadedThemes = plan.themes.length - written.themeFailures;
  counts.uploadedThemeSettings =
    plan.themeSettings.length - written.themeSettingFailures;
  counts.uploadFailures = sumUploadFailures(written);

  return { counts, remote: snapshot, lastSyncedAt };
}

export function executePull(
  index: SyncPullIndex,
  remote: RemoteCollections,
): SyncMutationCounts & {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: UserThemeRecord[];
  themeSettings: ThemeSettingRecord[];
  deletedThemeSettingIds: string[];
} {
  const plan = planPull(index, remote);
  const counts = emptyMutationCounts();
  counts.downloadedMemos = plan.memos.length;
  counts.downloadedSessions = plan.sessions.length;
  counts.downloadedThemes = plan.themes.length;
  counts.downloadedThemeSettings = plan.downloadedThemeSettings;
  counts.updatedThemeSettings = plan.updatedThemeSettings;

  return {
    ...counts,
    memos: plan.memos,
    sessions: plan.sessions,
    themes: plan.themes,
    themeSettings: plan.themeSettings,
    deletedThemeSettingIds: plan.deletedThemeSettingIds,
  };
}
