import type { ThemeRecord } from '@/types/theme';

import builtinThemesData from './builtinThemes.json';

/**
 * PJ1-182: 内蔵テーマ（ランダム抽選用）
 * データ本体は `builtinThemes.json`（tasks/finish/PJ1-182 _F1 由来・500件）
 */
export const builtinThemes = builtinThemesData as Omit<
  ThemeRecord,
  'id' | 'createdAt' | 'updatedAt'
>[];
