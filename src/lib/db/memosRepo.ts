import { getDB } from './openDB';
import type { MemoRecord } from '@/types/memo';

const MEMO_STORE = 'memos';

// 呼び出し側で id を指定しなくても自動生成される
function generateId() {
  // globalThis.cryptoを使用することで、TypeScript環境での型エラーを回避
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  // フォールバック: 古い環境での互換性
  return `memo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * メモを保存（同じ id があれば上書き）
 * id / createdAt / updatedAt は省略可（未指定時は自動生成）
 */
export async function saveMemo(
  memo: Omit<MemoRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  },
): Promise<MemoRecord> {
  const db = await getDB();
  const now = new Date().toISOString();

  // 既存レコードがある場合は createdAt を保持
  let existingRecord: MemoRecord | undefined;
  if (memo.id) {
    const tx = db.transaction(MEMO_STORE, "readonly");
    existingRecord = (await tx.store.get(memo.id)) as MemoRecord | undefined;
    await tx.done;
  }

  const record: MemoRecord = {
    ...memo,
    id: memo.id ?? generateId(),
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  };

  await db.put(MEMO_STORE, record);
  return record;
}

/**
 * すべてのメモを取得する（履歴一覧 `/history` 用）
 * - createdAt 降順（新しい順）。createdAt は ISO 8601 文字列を想定し、文字列比較でソート
 */
export async function getAllMemos(): Promise<MemoRecord[]> {
  const db = await getDB();
  const memos = await db.getAll(MEMO_STORE);
  memos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return memos;
}

/**
 * 指定セッションに紐づくメモをすべて取得する
 * - セッション詳細画面 `/history/[id]` 用
 * - order 昇順に並び替えて返す
 */
export async function getMemosBySession(
  sessionId: string,
): Promise<MemoRecord[]> {
  const db = await getDB();
  const index = db.transaction(MEMO_STORE).store.index('by_sessionId');
  const memos = await index.getAll(sessionId);
  // order でソートしておくとUI側が楽
  memos.sort((a, b) => a.order - b.order);
  return memos;
}

export async function getMemosByTheme(
  themeId: string,
): Promise<MemoRecord[]> {
  const db = await getDB();
  const index = db.transaction(MEMO_STORE).store.index('by_themeId');
  const memos = await index.getAll(themeId);
  return memos;
}

/**
 * テーマごとのメモ件数をまとめて取得する（`/themes` 一覧用）
 * memos ストアを1回走査して themeId ごとに集計する（index.count の大量発行を避ける）
 */
export async function getMemoCountsByThemeIds(
  themeIds: string[],
): Promise<Record<string, number>> {
  const targetIds = new Set(themeIds.filter((id) => id.length > 0));
  if (targetIds.size === 0) return {};

  const counts: Record<string, number> = {};
  const db = await getDB();
  const tx = db.transaction(MEMO_STORE, "readonly");
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const themeId = cursor.value.themeId;
    if (typeof themeId === "string" && targetIds.has(themeId)) {
      counts[themeId] = (counts[themeId] ?? 0) + 1;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return counts;
}

export async function deleteMemosBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const memos = await getMemosBySession(sessionId);
  const tx = db.transaction(MEMO_STORE, 'readwrite');
  for (const memo of memos) {
    await tx.store.delete(memo.id);
  }
  await tx.done;
}

/**
 * ローカルに存在しない場合のみメモを追加する（同期ダウンロード用）
 */
export async function addMemoIfAbsent(memo: MemoRecord): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction(MEMO_STORE, 'readwrite');
  const existing = await tx.store.get(memo.id);
  if (existing) {
    await tx.done;
    return false;
  }
  await tx.store.put(memo);
  await tx.done;
  return true;
}
