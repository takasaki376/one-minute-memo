import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";
import type {
  SyncPayload,
  SyncPullIndex,
  ThemeSettingRecord,
  UserThemeRecord,
} from "@/types/sync";

import { winnerByUpdatedAt, winnerForSession } from "./conflictPolicy";

export type RemoteCollections = {
  memos: Map<string, MemoRecord>;
  sessions: Map<string, SessionRecord>;
  themes: Map<string, ThemeRecord>;
  themeSettings: Map<string, ThemeSettingRecord>;
};

export type UploadPlan = {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: UserThemeRecord[];
  themeSettings: ThemeSettingRecord[];
  deletedThemeSettingIds: string[];
};

export type PullPlan = {
  memos: MemoRecord[];
  sessions: SessionRecord[];
  themes: UserThemeRecord[];
  themeSettings: ThemeSettingRecord[];
  deletedThemeSettingIds: string[];
  updatedThemeSettings: number;
  downloadedThemeSettings: number;
};

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function asUserTheme(theme: ThemeRecord): UserThemeRecord | null {
  if (theme.source !== "user") {
    return null;
  }
  return { ...theme, source: "user" };
}

export function planUpload(
  payload: SyncPayload,
  remote: RemoteCollections,
): UploadPlan {
  const memos = payload.memos.filter((memo) => {
    const existing = remote.memos.get(memo.id);
    if (!existing) {
      return true;
    }
    return winnerByUpdatedAt(memo.updatedAt, existing.updatedAt) === "local";
  });

  const sessions = payload.sessions.filter((session) => {
    const existing = remote.sessions.get(session.id);
    if (!existing) {
      return true;
    }
    return winnerForSession(session, existing) === "local";
  });

  const themes = payload.themes.filter((theme) => {
    const userTheme = asUserTheme(theme);
    if (!userTheme) {
      return false;
    }
    const existing = remote.themes.get(theme.id);
    if (!existing) {
      return true;
    }
    return winnerByUpdatedAt(theme.updatedAt, existing.updatedAt) === "local";
  });

  const themeSettings = payload.themeSettings.filter((setting) => {
    const existing = remote.themeSettings.get(setting.id);
    if (!existing) {
      return true;
    }
    return (
      winnerByUpdatedAt(setting.updatedAt, existing.updatedAt) === "local"
    );
  });

  const deletedThemeSettingIds = payload.deletedThemeSettingIds.filter((id) =>
    remote.themeSettings.has(id),
  );

  return {
    memos,
    sessions,
    themes,
    themeSettings,
    deletedThemeSettingIds,
  };
}

export function planPull(
  index: SyncPullIndex,
  remote: RemoteCollections,
): PullPlan {
  const localMemos = indexById(index.memos);
  const localSessions = indexById(index.sessions);
  const localThemes = indexById(index.themes);
  const localSettings = indexById(index.themeSettings);

  const memos = [...remote.memos.values()].filter((memo) => {
    const local = localMemos.get(memo.id);
    if (!local) {
      return true;
    }
    return winnerByUpdatedAt(local.updatedAt, memo.updatedAt) === "remote";
  });

  const sessions = [...remote.sessions.values()].filter((session) => {
    const local = localSessions.get(session.id);
    if (!local) {
      return true;
    }
    return winnerForSession(local, session) === "remote";
  });

  const themes = [...remote.themes.values()].flatMap((theme) => {
    const userTheme = asUserTheme(theme);
    if (!userTheme) {
      return [];
    }
    const local = localThemes.get(theme.id);
    if (!local) {
      return [userTheme];
    }
    return winnerByUpdatedAt(local.updatedAt, theme.updatedAt) === "remote"
      ? [userTheme]
      : [];
  });

  const themeSettings = [...remote.themeSettings.values()].filter((setting) => {
    const local = localSettings.get(setting.id);
    if (!local) {
      return true;
    }
    return winnerByUpdatedAt(local.updatedAt, setting.updatedAt) === "remote";
  });

  let updatedThemeSettings = 0;
  let downloadedThemeSettings = 0;
  for (const setting of themeSettings) {
    if (localSettings.has(setting.id)) {
      updatedThemeSettings += 1;
    } else {
      downloadedThemeSettings += 1;
    }
  }

  const deletedThemeSettingIds = index.themeSettings
    .map((setting) => setting.id)
    .filter((id) => !remote.themeSettings.has(id));

  return {
    memos,
    sessions,
    themes,
    themeSettings,
    deletedThemeSettingIds,
    updatedThemeSettings,
    downloadedThemeSettings,
  };
}
