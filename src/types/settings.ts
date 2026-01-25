/**
 * アプリケーション設定の型定義
 */
export interface SettingsRecord {
  id: string; // "default" 固定（単一レコード運用）
  theme_count: number; // 1セッションあたりのテーマ件数（1〜100）
  time_limit: string; // 1テーマあたりの制限時間（秒、文字列形式）
  updatedAt: string; // ISO文字列
}

/**
 * 設定のデフォルト値
 */
export const DEFAULT_SETTINGS: Omit<SettingsRecord, 'id' | 'updatedAt'> = {
  theme_count: 10,
  time_limit: '60',
} as const;
