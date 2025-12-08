import { getDB } from './openDB';
import type { ThemeRecord } from '@/types/theme';

const THEME_STORE = 'themes';

export async function getAllThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  return db.getAll(THEME_STORE);
}

export async function getActiveThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex(THEME_STORE, 'by_isActive', true);
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

// Placeholder built-in themes (real dataset will be added later)
const builtinThemes: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '今日やりたいことは？',
    category: '目標',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今気になっていることは？',
    category: '感情',
    isActive: true,
    source: 'builtin',
  },
  // ...200件程度の実データは別途追加予定
];

export async function initBuiltinThemesIfNeeded(): Promise<void> {
  const db = await getDB();
  const count = await db.count(THEME_STORE);
  if (count > 0) {
    // data already exists; skip seeding
    return;
  }

  const now = new Date().toISOString();
  const themes: ThemeRecord[] = builtinThemes.map((t, index) => ({
    id: `theme-${String(index + 1).padStart(4, '0')}`,
    title: t.title,
    category: t.category,
    isActive: t.isActive,
    source: t.source,
    createdAt: now,
    updatedAt: now,
  }));

  await upsertThemes(themes);
}
