import { getDB, type SessionRecordDB } from './openDB';
import type { SessionRecord } from '@/types/session';

const SESSION_STORE = 'sessions';

function toDB(record: SessionRecord): SessionRecordDB {
  return {
    ...record,
    endedAt: record.endedAt ?? '',
  };
}

function fromDB(record: SessionRecordDB | undefined): SessionRecord | undefined {
  if (!record) return undefined;
  return {
    ...record,
    endedAt: record.endedAt === '' ? null : record.endedAt,
  };
}

export async function createSession(themeIds: string[]): Promise<SessionRecord> {
  const db = await getDB();
  const now = new Date();
  const id = `sess-${now.getTime()}`;

  const record: SessionRecord = {
    id,
    startedAt: now.toISOString(),
    endedAt: null,
    themeIds,
    memoCount: 0,
  };

  await db.add(SESSION_STORE, toDB(record));
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

  const updated = fromDB(existing);
  if (!updated) {
    console.warn('session not found for update:', sessionId);
    await tx.done;
    return;
  }
  const updatedForSave: SessionRecord = {
    ...updated,
    memoCount,
    endedAt: new Date().toISOString(),
  };

  await store.put(toDB(updatedForSave));
  await tx.done;
}

export async function getSessionById(
  sessionId: string,
): Promise<SessionRecord | undefined> {
  const db = await getDB();
  const data = await db.get(SESSION_STORE, sessionId);
  return fromDB(data as SessionRecordDB | undefined);
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  const db = await getDB();
  const tx = db.transaction(SESSION_STORE);
  const store = tx.store;
  const sessions = await store.getAll();
  return sessions
    .map(s => fromDB(s as SessionRecordDB))
    .filter((s): s is SessionRecord => s !== undefined);
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
  return sessions
    .map(s => fromDB(s as SessionRecordDB))
    .filter((s): s is SessionRecord => s !== undefined);
}
