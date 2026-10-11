import { getSettings, updateSettings } from "@/lib/db/settingsRepo";

export async function getLocalLastSyncedAt(): Promise<string | null> {
  const settings = await getSettings();
  return settings.lastSyncedAt ?? null;
}

export async function setLocalLastSyncedAt(iso: string): Promise<void> {
  await updateSettings({ lastSyncedAt: iso });
}

export async function getRevertedThemeSettingIds(): Promise<string[]> {
  const settings = await getSettings();
  return settings.revertedThemeSettingIds ?? [];
}

export async function setThemeSettingReverted(
  themeId: string,
  reverted: boolean,
): Promise<void> {
  const current = await getRevertedThemeSettingIds();
  const next = reverted
    ? current.includes(themeId)
      ? current
      : [...current, themeId]
    : current.filter((id) => id !== themeId);
  if (
    next.length === current.length &&
    next.every((id, index) => id === current[index])
  ) {
    return;
  }
  await updateSettings({ revertedThemeSettingIds: next });
}

export async function clearRevertedThemeSettingIds(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const drop = new Set(ids);
  const current = await getRevertedThemeSettingIds();
  const next = current.filter((id) => !drop.has(id));
  if (next.length === current.length) {
    return;
  }
  await updateSettings({ revertedThemeSettingIds: next });
}
