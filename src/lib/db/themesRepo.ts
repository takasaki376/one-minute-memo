import { getDB } from './openDB';
import type { ThemeRecord } from '@/types/theme';
import { builtinThemes } from '@/lib/data/builtinThemes';

const THEME_STORE = 'themes';
type ThemeRecordWithIndex = ThemeRecord & { isActiveIndex: number };

function withIndex(theme: ThemeRecord): ThemeRecordWithIndex {
  return {
    ...theme,
    isActiveIndex: theme.isActive ? 1 : 0,
  };
}

function stripIndex(theme: ThemeRecord | ThemeRecordWithIndex): ThemeRecord {
  const { isActiveIndex: _ignored, ...rest } = theme as ThemeRecordWithIndex;
  return rest;
}

export async function getAllThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  const records = await db.getAll(THEME_STORE);
  return records.map(stripIndex);
}

export async function getActiveThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  const active = await db.getAllFromIndex(THEME_STORE, 'by_isActive', 1);
  return active.map(stripIndex);
}

/**
 * 指定されたIDのテーマ一覧を取得
 * @param themeIds 取得したいテーマIDの配列
 * @returns 該当するテーマレコードの配列（IDの順序は保証されない）
 */
export async function getThemesByIds(themeIds: string[]): Promise<ThemeRecord[]> {
  if (themeIds.length === 0) {
    return [];
  }
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readonly');
  const store = tx.store;
  // 全てのget操作を並列実行してパフォーマンスを向上
  const themePromises = themeIds.map(id => store.get(id));
  const themeResults = await Promise.all(themePromises);
  // 存在するテーマのみを抽出
  const themes = themeResults
    .filter((theme): theme is ThemeRecordWithIndex => theme !== undefined)
    .map(stripIndex);
  await tx.done;
  return themes;
}

export async function upsertThemes(themes: ThemeRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  for (const theme of themes) {
    await tx.store.put(withIndex(theme));
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
    ...stripIndex(existing),
    isActive,
    updatedAt: new Date().toISOString(),
  };

  await store.put(withIndex(updated));
  await tx.done;
}

/**
 * 初期テーマをDBに投入する（初回起動時のみ）
 * 既にテーマが存在する場合は何もしない
 */
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
