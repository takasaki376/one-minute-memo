import type { ThemeRecord } from '@/types/theme';

/**
 * 配列をシャッフルする（Fisher-Yatesアルゴリズムの簡易版）
 * @param array シャッフルする配列
 * @returns シャッフルされた新しい配列（元の配列は変更しない）
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 有効なテーマからランダムに指定数だけ選ぶ
 * @param themes テーマの配列（isActive === true のもののみが渡される想定）
 * @param count 選ぶ数（デフォルト: 10）
 * @returns 選ばれたテーマの配列（重複なし、ランダムな順序）
 */
export function selectRandomThemes(
  themes: ThemeRecord[],
  count = 10,
): ThemeRecord[] {
  // エッジケース: テーマが0件の場合は空配列を返す
  if (themes.length === 0) {
    return [];
  }

  // エッジケース: countが0以下の場合は空配列を返す
  const safeCount = Math.max(0, count);

  // エッジケース: テーマ数が指定数より少ない場合は、すべてのテーマを返す
  const actualCount = Math.min(safeCount, themes.length);

  // 配列をコピーしてシャッフル（元の配列を破壊しない）
  const shuffled = shuffleArray(themes);

  // 先頭のactualCount件を取得
  return shuffled.slice(0, actualCount);
}

/**
 * 有効なテーマを取得してランダムに指定数だけ選ぶ（DB連携版）
 * @param count 選ぶ数（デフォルト: 10）
 * @returns 選ばれたテーマの配列（重複なし、ランダムな順序）
 */
export async function pickRandomActiveThemes(
  count = 10,
): Promise<ThemeRecord[]> {
  const { getActiveThemes } = await import('@/lib/db/themesRepo');
  const activeThemes = await getActiveThemes();
  return selectRandomThemes(activeThemes, count);
}
