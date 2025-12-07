import type { ThemeRecord } from '@/types/theme';

/**
 * 有効なテーマからランダムに指定数だけ選ぶ
 * @param themes テーマの配列
 * @param count 選ぶ数（デフォルト: 10）
 * @returns 選ばれたテーマの配列
 */
export function selectRandomThemes(
  themes: ThemeRecord[],
  count: number = 10,
): ThemeRecord[] {
  if (themes.length === 0) {
    return [];
  }

  // 配列をシャッフルしてから先頭のcount件を取得
  const shuffled = [...themes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
