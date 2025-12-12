import { getDB } from './openDB';
import type { MemoRecord } from '@/types/memo';

const MEMO_STORE = 'memos';

export async function saveMemo(memo: MemoRecord): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();

  const toSave: MemoRecord = {
    ...memo,
    createdAt: memo.createdAt ?? now,
    updatedAt: now,
  };

  await db.put(MEMO_STORE, toSave);
}

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

export async function deleteMemosBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const memos = await getMemosBySession(sessionId);
  const tx = db.transaction(MEMO_STORE, 'readwrite');
  for (const memo of memos) {
    await tx.store.delete(memo.id);
  }
  await tx.done;
}
