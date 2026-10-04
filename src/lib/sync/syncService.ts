import { getAllMemos, upsertMemo } from "@/lib/db/memosRepo";
import { getAllSessions, upsertSession } from "@/lib/db/sessionsRepo";
import {
  getAllThemes,
  toggleThemeActive,
  upsertThemes,
} from "@/lib/db/themesRepo";
import type { ApiResult } from "@/types/api";
import type {
  SyncPayload,
  SyncPullData,
  SyncPullIndex,
  SyncResult,
  SyncRunData,
  SyncStateData,
} from "@/types/sync";

import { getBuiltinDefaultIsActive } from "./builtinThemeDefaults";
import {
  SYNC_ERROR_CODES,
  SYNC_ERROR_MESSAGES,
  syncErrorMessage,
} from "./errorContract";
import { getLocalLastSyncedAt, setLocalLastSyncedAt } from "./localSyncState";
import { collectLocalThemeSettings, pickUserThemes } from "./syncDiff";

export class SyncApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SyncApiError";
    this.code = code;
  }
}

async function parseSyncResult<T>(response: Response): Promise<T> {
  let json: ApiResult<T>;
  try {
    json = (await response.json()) as ApiResult<T>;
  } catch {
    throw new SyncApiError(
      SYNC_ERROR_CODES.INTERNAL,
      syncErrorMessage(SYNC_ERROR_CODES.INTERNAL),
    );
  }

  if (!json.success) {
    throw new SyncApiError(json.error.code, json.error.message);
  }

  return json.data;
}

export async function fetchSyncState(
  localLastSyncedAt: string | null,
): Promise<SyncStateData> {
  const params = new URLSearchParams();
  params.set("localLastSyncedAt", localLastSyncedAt ?? "");
  const response = await fetch(`/api/sync/state?${params.toString()}`, {
    method: "GET",
    credentials: "same-origin",
  });
  return parseSyncResult<SyncStateData>(response);
}

async function buildRunRequest(): Promise<{
  payload: SyncPayload;
  index: SyncPullIndex;
}> {
  const [memos, sessions, themes] = await Promise.all([
    getAllMemos(),
    getAllSessions(),
    getAllThemes(),
  ]);
  const userThemes = pickUserThemes(themes);
  const themeSettings = collectLocalThemeSettings(themes);
  const deletedThemeSettingIds = themes
    .filter((theme) => {
      if (theme.source === "user") {
        return false;
      }
      const defaultIsActive = getBuiltinDefaultIsActive(theme.id);
      return defaultIsActive !== null && theme.isActive === defaultIsActive;
    })
    .map((theme) => theme.id);

  return {
    payload: {
      memos,
      sessions,
      themes: userThemes.flatMap((theme) =>
      theme.source === "user" ? [{ ...theme, source: "user" as const }] : [],
    ),
      themeSettings,
      deletedThemeSettingIds,
    },
    index: {
      memos: memos.map((memo) => ({ id: memo.id, updatedAt: memo.updatedAt })),
      sessions: sessions.map((session) => ({
        id: session.id,
        endedAt: session.endedAt,
      })),
      themes: userThemes.map((theme) => ({
        id: theme.id,
        updatedAt: theme.updatedAt,
      })),
      themeSettings: themeSettings.map((setting) => ({
        id: setting.id,
        updatedAt: setting.updatedAt,
      })),
    },
  };
}

export async function applySyncPull(data: SyncPullData): Promise<number> {
  let downloadFailures = 0;

  for (const memo of data.memos) {
    try {
      await upsertMemo(memo);
    } catch {
      downloadFailures += 1;
    }
  }

  for (const session of data.sessions) {
    try {
      await upsertSession(session);
    } catch {
      downloadFailures += 1;
    }
  }

  if (data.themes.length > 0) {
    try {
      await upsertThemes(data.themes);
    } catch {
      downloadFailures += data.themes.length;
    }
  }

  for (const setting of data.themeSettings) {
    try {
      await toggleThemeActive(setting.id, setting.isActive);
    } catch {
      downloadFailures += 1;
    }
  }

  for (const id of data.deletedThemeSettingIds) {
    const defaultIsActive = getBuiltinDefaultIsActive(id);
    if (defaultIsActive === null) {
      continue;
    }
    try {
      await toggleThemeActive(id, defaultIsActive);
    } catch {
      downloadFailures += 1;
    }
  }

  return downloadFailures;
}

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

export async function syncUserData(): Promise<SyncResult> {
  try {
    const requestBody = await buildRunRequest();
    const response = await fetch("/api/sync/run", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await parseSyncResult<SyncRunData>(response);
    const applyFailures = await applySyncPull(data);
    if (data.lastSyncedAt) {
      await setLocalLastSyncedAt(data.lastSyncedAt);
    }

    return {
      success: true,
      syncedAt: data.lastSyncedAt || null,
      uploadedMemos: data.uploadedMemos,
      downloadedMemos: data.downloadedMemos,
      uploadedSessions: data.uploadedSessions,
      downloadedSessions: data.downloadedSessions,
      uploadedThemes: data.uploadedThemes,
      downloadedThemes: data.downloadedThemes,
      uploadedThemeSettings: data.uploadedThemeSettings,
      downloadedThemeSettings: data.downloadedThemeSettings,
      updatedThemeSettings: data.updatedThemeSettings,
      uploadFailures: data.uploadFailures,
      downloadFailures: data.downloadFailures + applyFailures,
    };
  } catch (error) {
    if (error instanceof SyncApiError) {
      return emptyResult(error.message);
    }
    return emptyResult(SYNC_ERROR_MESSAGES[SYNC_ERROR_CODES.INTERNAL]);
  }
}

export async function fetchLocalLastSyncedAt(): Promise<string | null> {
  return getLocalLastSyncedAt();
}
