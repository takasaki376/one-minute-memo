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
