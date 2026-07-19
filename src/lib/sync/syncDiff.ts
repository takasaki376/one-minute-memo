import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";
import type { ThemeSettingRecord } from "@/types/sync";

import { getBuiltinDefaultIsActive } from "./builtinThemeDefaults";

export function collectLocalThemeSettings(
  themes: ThemeRecord[],
): ThemeSettingRecord[] {
  const settings: ThemeSettingRecord[] = [];

  for (const theme of themes) {
    if (theme.source === "user") {
      continue;
    }

    const defaultIsActive = getBuiltinDefaultIsActive(theme.id);
    if (defaultIsActive === null) {
      continue;
    }

    if (theme.isActive !== defaultIsActive) {
      settings.push({
        id: theme.id,
        isActive: theme.isActive,
        updatedAt: theme.updatedAt,
      });
    }
  }

  return settings;
}

export function pickUserThemes(themes: ThemeRecord[]): ThemeRecord[] {
  return themes.filter((theme) => theme.source === "user");
}

export function shouldUploadUserTheme(
  local: ThemeRecord,
  remote: ThemeRecord | undefined,
): boolean {
  if (!remote) {
    return true;
  }

  return local.updatedAt.localeCompare(remote.updatedAt) > 0;
}

export function shouldDownloadUserTheme(
  local: ThemeRecord | undefined,
  remote: ThemeRecord,
): boolean {
  if (!local) {
    return true;
  }

  return remote.updatedAt.localeCompare(local.updatedAt) > 0;
}

export function shouldUploadThemeSetting(
  local: ThemeSettingRecord,
  remote: ThemeSettingRecord | undefined,
): boolean {
  if (!remote) {
    return true;
  }

  return local.updatedAt.localeCompare(remote.updatedAt) > 0;
}

export function shouldDownloadThemeSetting(
  local: ThemeSettingRecord | undefined,
  remote: ThemeSettingRecord,
): boolean {
  if (!local) {
    return true;
  }

  return remote.updatedAt.localeCompare(local.updatedAt) > 0;
}

export function shouldUploadMemo(
  local: MemoRecord,
  remote: MemoRecord | undefined,
): boolean {
  return !remote;
}

export function shouldDownloadMemo(
  local: MemoRecord | undefined,
  remote: MemoRecord,
): boolean {
  void remote;
  return !local;
}

export function shouldUploadSession(
  local: SessionRecord,
  remote: SessionRecord | undefined,
): boolean {
  if (!remote) {
    return true;
  }

  return local.endedAt !== null && remote.endedAt === null;
}

export function shouldDownloadSession(
  local: SessionRecord | undefined,
  remote: SessionRecord,
): boolean {
  if (!local) {
    return true;
  }

  return remote.endedAt !== null && local.endedAt === null;
}

export function hasRemoteSyncDifference(
  localLastSyncedAt: string | null,
  cloudLastSyncedAt: string | null,
): boolean {
  if (!localLastSyncedAt || !cloudLastSyncedAt) {
    return false;
  }

  return cloudLastSyncedAt.localeCompare(localLastSyncedAt) > 0;
}
