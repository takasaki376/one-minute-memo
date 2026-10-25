import type { ThemeRecord } from '@/types/theme';

type RandomSource = () => number;

export type SelectRandomThemesOptions = {
  /** テーマIDごとの登録メモ数。未指定のテーマは 0 件として扱う */
  memoCounts?: Record<string, number>;
  /** [0, 1) の乱数。テスト用。省略時は crypto の一様整数 */
  random?: RandomSource;
};

/**
 * [0, max) の一様な整数。
 * Math.random() * max の端数バイアスを避けるため、省略時は rejection sampling する。
 */
function randomInt(max: number, random?: RandomSource): number {
  if (max <= 1) {
    return 0;
  }

  if (random) {
    const index = Math.floor(random() * max);
    if (index < 0) {
      return 0;
    }
    if (index >= max) {
      return max - 1;
    }
    return index;
  }

  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    return Math.floor(Math.random() * max);
  }

  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    cryptoObj.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= limit);
  return value % max;
}

function memoCountFor(
  themeId: string,
  memoCounts: Record<string, number>,
): number {
  const value = memoCounts[themeId];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * 配列から count 件を重複なく一様に選ぶ（部分 Fisher-Yates）。
 * 元の配列位置が選ばれやすさを決めない。
 */
function sampleWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  random?: RandomSource,
): T[] {
  const copy = [...items];
  const picked = Math.min(count, copy.length);
  for (let i = 0; i < picked; i++) {
    const j = i + randomInt(copy.length - i, random);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, picked);
}

/**
 * 有効なテーマから指定数だけ選ぶ。
 * 登録メモが少ないテーマを優先し、同じ件数の中では一様に選ぶ。
 * @param themes テーマの配列（isActive === true のもののみが渡される想定）
 * @param count 選ぶ数（デフォルト: 10）
 * @returns 選ばれたテーマの配列（重複なし、ランダムな順序）
 */
export function selectRandomThemes(
  themes: ThemeRecord[],
  count = 10,
  options?: SelectRandomThemesOptions,
): ThemeRecord[] {
  if (themes.length === 0) {
    return [];
  }

  const safeCount = Math.max(0, count);
  if (safeCount === 0) {
    return [];
  }

  const actualCount = Math.min(safeCount, themes.length);
  const memoCounts = options?.memoCounts ?? {};
  const groups = new Map<number, ThemeRecord[]>();

  for (const theme of themes) {
    const memoCount = memoCountFor(theme.id, memoCounts);
    const bucket = groups.get(memoCount);
    if (bucket) {
      bucket.push(theme);
    } else {
      groups.set(memoCount, [theme]);
    }
  }

  const selected: ThemeRecord[] = [];
  const orderedCounts = [...groups.keys()].sort((a, b) => a - b);
  for (const memoCount of orderedCounts) {
    if (selected.length >= actualCount) {
      break;
    }
    const bucket = groups.get(memoCount) ?? [];
    const remaining = actualCount - selected.length;
    selected.push(
      ...sampleWithoutReplacement(bucket, remaining, options?.random),
    );
  }

  return sampleWithoutReplacement(selected, selected.length, options?.random);
}

/**
 * 有効なテーマを取得して指定数だけ選ぶ（DB連携版）
 * メモ数が少ないテーマを優先する。
 * @param count 選ぶ数（デフォルト: 10）
 * @returns 選ばれたテーマの配列（重複なし、ランダムな順序）
 */
export async function pickRandomActiveThemes(
  count = 10,
): Promise<ThemeRecord[]> {
  const { getActiveThemes } = await import('@/lib/db/themesRepo');
  const { getMemoCountsByThemeIds } = await import('@/lib/db/memosRepo');
  const activeThemes = await getActiveThemes();
  const memoCounts = await getMemoCountsByThemeIds(
    activeThemes.map((theme) => theme.id),
  );
  return selectRandomThemes(activeThemes, count, { memoCounts });
}
