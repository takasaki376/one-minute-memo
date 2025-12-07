import { getDB } from './openDB';
import type { ThemeRecord } from '@/types/theme';

const THEME_STORE = 'themes';

export async function getAllThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  return db.getAll(THEME_STORE);
}

export async function getActiveThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  const allThemes = await db.getAll(THEME_STORE);
  return allThemes.filter((theme) => theme.isActive === true);
}

export async function upsertThemes(themes: ThemeRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  for (const theme of themes) {
    await tx.store.put(theme);
  }
  await tx.done;
}

export async function toggleThemeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  const store = tx.store;
  const existing = await store.get(id);
  if (!existing) {
    console.warn('theme not found:', id);
    await tx.done;
    return;
  }

  const updated: ThemeRecord = {
    ...existing,
    isActive,
    updatedAt: new Date().toISOString(),
  };

  await store.put(updated);
  await tx.done;
}
