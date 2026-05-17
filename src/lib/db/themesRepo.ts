import { getDB } from './openDB';
import type { ThemeRecord } from '@/types/theme';
import { builtinThemes } from '@/lib/data/builtinThemes';

const THEME_STORE = 'themes';

const THEME_TITLE_MAX = 200;
const THEME_CATEGORY_MAX = 100;

type ThemeRecordWithIndex = ThemeRecord & { isActiveIndex: number };

function generateUserThemeId(): string {
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    'randomUUID' in globalThis.crypto
  ) {
    return `user-theme-${globalThis.crypto.randomUUID()}`;
  }
  return `user-theme-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withIndex(theme: ThemeRecord): ThemeRecordWithIndex {
  return {
    ...theme,
    isActiveIndex: theme.isActive ? 1 : 0,
  };
}

function stripIndex(theme: ThemeRecord | ThemeRecordWithIndex): ThemeRecord {
  const { isActiveIndex, ...rest } = theme as ThemeRecordWithIndex;
  void isActiveIndex;
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
  // 重複したIDを除去してパフォーマンスを向上
  const uniqueIds = Array.from(new Set(themeIds));
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readonly');
  const store = tx.store;
  // 全てのget操作を並列実行してパフォーマンスを向上
  const themePromises = uniqueIds.map(id => store.get(id));
  const themeResults = await Promise.all(themePromises);
  // 存在するテーマのみを抽出
  const themes = themeResults
    .filter((theme): theme is ThemeRecordWithIndex => theme !== undefined)
    .map(stripIndex);
  await tx.done;
  return themes;
}

export type CreateUserThemeInput = Pick<
  ThemeRecord,
  'title' | 'category' | 'isActive'
>;

/**
 * ユーザー追加テーマを1件保存する（source は常に user）
 * カテゴリ未入力時は「未分類」として保存する。
 */
export async function createUserTheme(
  input: CreateUserThemeInput,
): Promise<ThemeRecord> {
  const title = input.title.trim();
  const categoryRaw = input.category.trim();
  if (title.length === 0) {
    throw new Error('テーマ名を入力してください');
  }
  if (title.length > THEME_TITLE_MAX) {
    throw new Error(
      `テーマ名は${String(THEME_TITLE_MAX)}文字以内にしてください`,
    );
  }
  if (categoryRaw.length > THEME_CATEGORY_MAX) {
    throw new Error(
      `カテゴリは${String(THEME_CATEGORY_MAX)}文字以内にしてください`,
    );
  }

  const all = await getAllThemes();
  const normalizedTitle = title.toLowerCase();
  if (
    all.some((t) => t.title.trim().toLowerCase() === normalizedTitle)
  ) {
    throw new Error('同じ名前のテーマが既に存在します');
  }

  const now = new Date().toISOString();
  const record: ThemeRecord = {
    id: generateUserThemeId(),
    title,
    category: categoryRaw.length > 0 ? categoryRaw : '未分類',
    isActive: input.isActive,
    source: 'user',
    createdAt: now,
    updatedAt: now,
  };

  await upsertThemes([record]);
  return record;
}

export type UpdateThemeInput = Pick<
  ThemeRecord,
  'title' | 'category' | 'isActive'
>;

/**
 * 既存テーマの title / category / isActive を更新する（source と id は変更しない）
 */
export async function updateTheme(
  id: string,
  input: UpdateThemeInput,
): Promise<ThemeRecord> {
  const title = input.title.trim();
  const categoryRaw = input.category.trim();
  if (title.length === 0) {
    throw new Error('テーマ名を入力してください');
  }
  if (title.length > THEME_TITLE_MAX) {
    throw new Error(
      `テーマ名は${String(THEME_TITLE_MAX)}文字以内にしてください`,
    );
  }
  if (categoryRaw.length > THEME_CATEGORY_MAX) {
    throw new Error(
      `カテゴリは${String(THEME_CATEGORY_MAX)}文字以内にしてください`,
    );
  }

  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  const store = tx.store;
  const existing = await store.get(id);
  if (!existing) {
    await tx.done;
    throw new Error('テーマが見つかりません');
  }

  const prev = stripIndex(existing);
  const all = await store.getAll();
  const normalizedTitle = title.toLowerCase();
  if (
    all.some(
      (t) =>
        t.id !== id && t.title.trim().toLowerCase() === normalizedTitle,
    )
  ) {
    await tx.done;
    throw new Error('同じ名前のテーマが既に存在します');
  }
  const now = new Date().toISOString();
  const updated: ThemeRecord = {
    ...prev,
    title,
    category: categoryRaw.length > 0 ? categoryRaw : '未分類',
    isActive: input.isActive,
    updatedAt: now,
  };

  await store.put(withIndex(updated));
  await tx.done;
  return updated;
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
 * 初期テーマをDBに投入する
 * builtinThemes のうち、まだDBに存在しないIDのみ追加する（不足分だけ追加、既存は上書きしない）
 */
export async function initBuiltinThemesIfNeeded(): Promise<void> {
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

  const existing = await getThemesByIds(themes.map((t) => t.id));
  const existingIds = new Set(existing.map((t) => t.id));
  const missing = themes.filter((t) => !existingIds.has(t.id));
  if (missing.length === 0) {
    return;
  }

  await upsertThemes(missing);
}
