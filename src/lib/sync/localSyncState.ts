import { getSettings, updateSettings } from "@/lib/db/settingsRepo";

export async function getLocalLastSyncedAt(): Promise<string | null> {
  const settings = await getSettings();
  return settings.lastSyncedAt ?? null;
}

export async function setLocalLastSyncedAt(iso: string): Promise<void> {
  await updateSettings({ lastSyncedAt: iso });
}
