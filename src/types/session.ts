export interface SessionRecord {
  id: string; // 'sess-2025-01-10-090000-xxx'
  startedAt: string; // ISO string
  endedAt: string | null; // null until the session finishes
  themeIds: string[]; // theme ids used in this session
  memoCount: number; // number of memos recorded
}
