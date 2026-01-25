import { getDB } from './openDB';
import type { SettingsRecord } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_STORE = 'settings';
const SETTINGS_ID = 'default';

/**
 * 設定を取得する
 * レコードが存在しない場合はデフォルト値を返す
 */
export async function getSettings(): Promise<SettingsRecord> {
  const db = await getDB();
  const tx = db.transaction(SETTINGS_STORE, 'readonly');
  const store = tx.store;
  const record = await store.get(SETTINGS_ID);

  if (record) {
    return record;
  }

  // レコードが存在しない場合はデフォルト値を返す
  // 初回起動時にレコードを作成するか、読み込み時に仮想的に扱う
  // 今回は仮想的に扱う方針（必要に応じて初回作成に変更可能）
  const now = new Date().toISOString();
  return {
    id: SETTINGS_ID,
    ...DEFAULT_SETTINGS,
    updatedAt: now,
  };
}

/**
 * 設定を部分更新する
 * @param patch 更新するフィールド（部分更新可能）
 */
export async function updateSettings(
  patch: Partial<Omit<SettingsRecord, 'id' | 'updatedAt'>>,
): Promise<SettingsRecord> {
  const db = await getDB();
  const tx = db.transaction(SETTINGS_STORE, 'readwrite');
  const store = tx.store;

  // 既存レコードを取得（存在しない場合はデフォルト値を使用）
  const existing = await store.get(SETTINGS_ID);
  const now = new Date().toISOString();

  const updated: SettingsRecord = {
    id: SETTINGS_ID,
    theme_count: patch.theme_count ?? existing?.theme_count ?? DEFAULT_SETTINGS.theme_count,
    time_limit: patch.time_limit ?? existing?.time_limit ?? DEFAULT_SETTINGS.time_limit,
    updatedAt: now,
  };

  await store.put(updated);
  await tx.done;
  return updated;
}

/**
 * 設定を初期値に戻す
 */
export async function resetSettings(): Promise<SettingsRecord> {
  const now = new Date().toISOString();
  const defaultRecord: SettingsRecord = {
    id: SETTINGS_ID,
    ...DEFAULT_SETTINGS,
    updatedAt: now,
  };

  const db = await getDB();
  const tx = db.transaction(SETTINGS_STORE, 'readwrite');
  const store = tx.store;
  await store.put(defaultRecord);
  await tx.done;
  return defaultRecord;
}
