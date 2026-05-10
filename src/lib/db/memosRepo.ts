import { getDB } from './openDB';
import type { MemoRecord } from '@/types/memo';

const MEMO_STORE = 'memos';

// PJ1-99: タスク仕様に合わせてID生成関数を追加
// 呼び出し側でidを指定しなくても自動生成されるようにする
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

  // PJ1-99: 既存レコードがある場合はcreatedAtを保持、新規の場合は現在時刻を設定
  let existingRecord: MemoRecord | undefined;
  if (memo.id) {
    const tx = db.transaction(MEMO_STORE, "readonly");
    existingRecord = (await tx.store.get(memo.id)) as MemoRecord | undefined;
    await tx.done;
  }

  // PJ1-99: idが指定されていない場合は自動生成
  // 既存レコードがある場合はcreatedAtを保持、新規の場合は現在時刻を設定
  // メモ: 型定義でmemoからcreatedAt/updatedAtを除外しているため、ここでid/createdAt/updatedAtを明示的に設定している
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

export async function deleteMemosBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const memos = await getMemosBySession(sessionId);
  const tx = db.transaction(MEMO_STORE, 'readwrite');
  for (const memo of memos) {
    await tx.store.delete(memo.id);
  }
  await tx.done;
}
