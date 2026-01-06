import { getDB } from './openDB';
import type { MemoRecord } from '@/types/memo';

const MEMO_STORE = 'memos';

// PJ1-99: タスク仕様に合わせてID生成関数を追加
// 呼び出し側でidを指定しなくても自動生成されるようにする
function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `memo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * メモを保存（同じ id があれば上書き）
 * 呼び出し側で id を決めてもいいし、任せてもOKなようにしている。
 *
 * PJ1-99: タスク仕様に合わせて以下の変更を実施
 * - id, createdAt, updatedAtをオプショナル/自動生成に変更
 * - 呼び出し側でidを指定しなくても自動生成されるように改善
 * - 戻り値をMemoRecordに変更（保存したレコードを返す）
 */
export async function saveMemo(
  memo: Omit<MemoRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  },
): Promise<MemoRecord> {
  const db = await getDB();
  const now = new Date().toISOString();

  // PJ1-99: idが指定されていない場合は自動生成、createdAt/updatedAtも自動設定
  // 注意: ...memoを先に展開してから、createdAt/updatedAtを上書きすることで確実に設定
  const record: MemoRecord = {
    ...memo,
    id: memo.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };

  // PJ1-99: デバッグ用: createdAtが正しく設定されているか確認
  if (!record.createdAt) {
    console.error('[PJ1-99] saveMemo: createdAtが設定されていません', record);
  }

  await db.put(MEMO_STORE, record);
  return record;
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
