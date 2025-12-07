import { getDB } from './openDB';
import type { SessionRecord } from '@/types/session';

const SESSION_STORE = 'sessions';

export async function createSession(themeIds: string[]): Promise<SessionRecord> {
  const db = await getDB();
  const now = new Date();
  const id = `sess-${now.getTime()}`;

  const record: SessionRecord = {
    id,
    startedAt: now.toISOString(),
    endedAt: now.toISOString(), // 開始時点では startedAt と同じでOK
    themeIds,
    memoCount: 0,
  };

  await db.add(SESSION_STORE, record);
  return record;
}

export async function completeSession(
  sessionId: string,
  memoCount: number,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(SESSION_STORE, 'readwrite');
  const store = tx.store;
  const existing = await store.get(sessionId);
  if (!existing) {
    console.warn('session not found:', sessionId);
    await tx.done;
    return;
  }

  const updated: SessionRecord = {
    ...existing,
    memoCount,
    endedAt: new Date().toISOString(),
  };

  await store.put(updated);
  await tx.done;
}

export async function getSessionById(
  sessionId: string,
): Promise<SessionRecord | undefined> {
  const db = await getDB();
  return db.get(SESSION_STORE, sessionId);
}

export async function getAllSessionsSorted(): Promise<SessionRecord[]> {
  const db = await getDB();
  const tx = db.transaction(SESSION_STORE);
  const store = tx.store;
  // startedAt の降順（新しい順）で並べたい場合
  const index = store.index('by_startedAt');
  const sessions = await index.getAll();
  // index で昇順になることが多いので手動で逆順にしたければここでソート
  sessions.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return sessions;
}
