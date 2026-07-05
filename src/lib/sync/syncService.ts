import {
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { addMemoIfAbsent, getAllMemos } from "@/lib/db/memosRepo";
import { addSessionIfAbsent, getAllSessions } from "@/lib/db/sessionsRepo";
import { getAllThemes, toggleThemeActive, upsertThemes } from "@/lib/db/themesRepo";
import { getFirestoreDb } from "@/lib/firebase/firestore";
import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";
import type { SyncResult, ThemeSettingRecord } from "@/types/sync";

import {
  getCloudLastSyncedAt,
  setCloudLastSyncedAt,
  userCollection,
} from "./cloudSyncState";
import {
  SYNC_LOGIN_REQUIRED_MESSAGE,
  SYNC_NOT_CONFIGURED_MESSAGE,
  toSyncErrorMessage,
} from "./messages";
import { getLocalLastSyncedAt, setLocalLastSyncedAt } from "./localSyncState";
import { SYNC_COLLECTIONS, userDocPath } from "./paths";
import { getBuiltinDefaultIsActive } from "./builtinThemeDefaults";
import { stripUndefinedFields } from "./sanitizeForFirestore";
import {
  collectLocalThemeSettings,
  pickUserThemes,
  shouldDownloadMemo,
  shouldDownloadSession,
  shouldDownloadThemeSetting,
  shouldDownloadUserTheme,
  shouldUploadMemo,
  shouldUploadSession,
  shouldUploadThemeSetting,
  shouldUploadUserTheme,
} from "./syncDiff";

const FIRESTORE_BATCH_LIMIT = 450;

function emptyResult(error?: string): SyncResult {
  return {
    success: false,
    syncedAt: null,
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
    error,
  };
}

async function fetchCollectionMap<T extends { id: string }>(
  db: Firestore,
  uid: string,
  collectionName: string,
): Promise<Map<string, T>> {
  const snap = await getDocs(userCollection(db, uid, collectionName));
  const map = new Map<string, T>();
  for (const item of snap.docs) {
    const data = item.data() as T;
    map.set(data.id, data);
  }
  return map;
}

async function writeDocumentsInBatches(
  db: Firestore,
  uid: string,
  collectionName: string,
  records: Array<{ id: string; data: Record<string, unknown> }>,
): Promise<number> {
  let failures = 0;

  for (let i = 0; i < records.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = records.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const record of chunk) {
      const ref = doc(
        db,
        userDocPath(uid, collectionName, record.id),
      );
      batch.set(ref, stripUndefinedFields(record.data), { merge: true });
    }

    try {
      await batch.commit();
    } catch {
      failures += chunk.length;
    }
  }

  return failures;
}

export async function syncUserData(uid: string): Promise<SyncResult> {
  if (!uid) {
    return emptyResult(SYNC_LOGIN_REQUIRED_MESSAGE);
  }

  const db = getFirestoreDb();
  if (!db) {
    return emptyResult(SYNC_NOT_CONFIGURED_MESSAGE);
  }

  const result: SyncResult = {
    success: false,
    syncedAt: null,
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

  try {
    const [
      localMemos,
      localSessions,
      localThemes,
      remoteMemos,
      remoteSessions,
      remoteThemes,
      remoteThemeSettings,
    ] = await Promise.all([
      getAllMemos(),
      getAllSessions(),
      getAllThemes(),
      fetchCollectionMap<MemoRecord>(db, uid, SYNC_COLLECTIONS.memos),
      fetchCollectionMap<SessionRecord>(db, uid, SYNC_COLLECTIONS.sessions),
      fetchCollectionMap<ThemeRecord>(db, uid, SYNC_COLLECTIONS.themes),
      fetchCollectionMap<ThemeSettingRecord>(
        db,
        uid,
        SYNC_COLLECTIONS.themeSettings,
      ),
    ]);

    const localUserThemes = pickUserThemes(localThemes);
    const localThemeSettings = collectLocalThemeSettings(localThemes);
    const localMemoMap = new Map(localMemos.map((memo) => [memo.id, memo]));
    const localSessionMap = new Map(
      localSessions.map((session) => [session.id, session]),
    );
    const localUserThemeMap = new Map(
      localUserThemes.map((theme) => [theme.id, theme]),
    );
    const localThemeSettingMap = new Map(
      localThemeSettings.map((setting) => [setting.id, setting]),
    );

    const memosToUpload = localMemos.filter((memo) =>
      shouldUploadMemo(memo, remoteMemos.get(memo.id)),
    );
    const sessionsToUpload = localSessions.filter((session) =>
      shouldUploadSession(session, remoteSessions.get(session.id)),
    );
    const themesToUpload = localUserThemes.filter((theme) =>
      shouldUploadUserTheme(theme, remoteThemes.get(theme.id)),
    );
    const themeSettingsToUpload = localThemeSettings.filter((setting) =>
      shouldUploadThemeSetting(setting, remoteThemeSettings.get(setting.id)),
    );

    const memoUploadFailures = await writeDocumentsInBatches(
      db,
      uid,
      SYNC_COLLECTIONS.memos,
      memosToUpload.map((memo) => ({ id: memo.id, data: { ...memo } })),
    );
    result.uploadFailures += memoUploadFailures;
    result.uploadedMemos = memosToUpload.length - memoUploadFailures;

    const sessionUploadFailures = await writeDocumentsInBatches(
      db,
      uid,
      SYNC_COLLECTIONS.sessions,
      sessionsToUpload.map((session) => ({ id: session.id, data: { ...session } })),
    );
    result.uploadFailures += sessionUploadFailures;
    result.uploadedSessions = sessionsToUpload.length - sessionUploadFailures;

    const themeUploadFailures = await writeDocumentsInBatches(
      db,
      uid,
      SYNC_COLLECTIONS.themes,
      themesToUpload.map((theme) => ({ id: theme.id, data: { ...theme } })),
    );
    result.uploadFailures += themeUploadFailures;
    result.uploadedThemes = themesToUpload.length - themeUploadFailures;

    const themeSettingUploadFailures = await writeDocumentsInBatches(
      db,
      uid,
      SYNC_COLLECTIONS.themeSettings,
      themeSettingsToUpload.map((setting) => ({
        id: setting.id,
        data: { ...setting },
      })),
    );
    result.uploadFailures += themeSettingUploadFailures;
    result.uploadedThemeSettings =
      themeSettingsToUpload.length - themeSettingUploadFailures;

    const themeSettingsToClear = localThemes.filter((theme) => {
      if (theme.source !== "builtin") {
        return false;
      }
      const defaultIsActive = getBuiltinDefaultIsActive(theme.id);
      if (defaultIsActive === null) {
        return false;
      }
      return (
        theme.isActive === defaultIsActive && remoteThemeSettings.has(theme.id)
      );
    });

    for (const theme of themeSettingsToClear) {
      try {
        await deleteDoc(
          doc(
            db,
            userDocPath(uid, SYNC_COLLECTIONS.themeSettings, theme.id),
          ),
        );
      } catch {
        result.uploadFailures += 1;
      }
    }

    for (const remoteMemo of remoteMemos.values()) {
      if (!shouldDownloadMemo(localMemoMap.get(remoteMemo.id), remoteMemo)) {
        continue;
      }

      try {
        const added = await addMemoIfAbsent(remoteMemo);
        if (added) {
          result.downloadedMemos += 1;
        }
      } catch {
        result.downloadFailures += 1;
      }
    }

    for (const remoteSession of remoteSessions.values()) {
      if (
        !shouldDownloadSession(
          localSessionMap.get(remoteSession.id),
          remoteSession,
        )
      ) {
        continue;
      }

      try {
        const added = await addSessionIfAbsent(remoteSession);
        if (added) {
          result.downloadedSessions += 1;
        }
      } catch {
        result.downloadFailures += 1;
      }
    }

    const themesToDownload: ThemeRecord[] = [];
    for (const remoteTheme of remoteThemes.values()) {
      if (
        shouldDownloadUserTheme(
          localUserThemeMap.get(remoteTheme.id),
          remoteTheme,
        )
      ) {
        themesToDownload.push(remoteTheme);
      }
    }

    if (themesToDownload.length > 0) {
      try {
        await upsertThemes(themesToDownload);
        result.downloadedThemes = themesToDownload.length;
      } catch {
        result.downloadFailures += themesToDownload.length;
      }
    }

    for (const remoteSetting of remoteThemeSettings.values()) {
      const localSetting = localThemeSettingMap.get(remoteSetting.id);
      if (
        !shouldDownloadThemeSetting(localSetting, remoteSetting)
      ) {
        continue;
      }

      try {
        const localTheme = localThemes.find((theme) => theme.id === remoteSetting.id);
        if (!localTheme || localTheme.source !== "builtin") {
          continue;
        }

        if (
          localSetting &&
          localSetting.updatedAt.localeCompare(remoteSetting.updatedAt) >= 0
        ) {
          continue;
        }

        await toggleThemeActive(remoteSetting.id, remoteSetting.isActive);
        if (localSetting) {
          result.updatedThemeSettings += 1;
        } else {
          result.downloadedThemeSettings += 1;
        }
      } catch {
        result.downloadFailures += 1;
      }
    }

    const syncedAt = new Date().toISOString();
    await Promise.all([
      setLocalLastSyncedAt(syncedAt),
      setCloudLastSyncedAt(db, uid, syncedAt),
    ]);

    result.success = true;
    result.syncedAt = syncedAt;
    return result;
  } catch (error) {
    result.error = toSyncErrorMessage(error);
    return result;
  }
}

export async function fetchCloudLastSyncedAt(uid: string): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db || !uid) {
    return null;
  }

  try {
    return await getCloudLastSyncedAt(db, uid);
  } catch {
    return null;
  }
}

export async function fetchLocalLastSyncedAt(): Promise<string | null> {
  return getLocalLastSyncedAt();
}
