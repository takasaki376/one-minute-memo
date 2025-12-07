export interface SessionRecord {
  id: string; // 'sess-2025-01-10-090000-xxx' など
  startedAt: string; // ISO文字列
  endedAt: string; // ISO文字列
  themeIds: string[]; // このセッションで使ったテーマID（10個）
  memoCount: number; // 実際に保存されたメモ数
}
