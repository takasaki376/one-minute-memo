import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { ThemeRecord } from '@/types/theme';
import type { SessionRecord } from '@/types/session';
import type { MemoRecord } from '@/types/memo';

export type SessionRecordDB = Omit<SessionRecord, 'endedAt'> & {
  endedAt: string; // '' means "not finished yet"
};

export interface OneMinuteMemoDB extends DBSchema {
  themes: {
    key: ThemeRecord['id'];
    value: ThemeRecord & { isActiveIndex?: number };
    indexes: {
      by_isActive: number; // numeric index (0/1) derived from isActive for querying
      by_category: string;
    };
  };

  sessions: {
    key: SessionRecord['id'];
    value: SessionRecordDB;
    indexes: {
      by_startedAt: string;
      by_endedAt: string;
    };
  };

  memos: {
    key: MemoRecord['id'];
    value: MemoRecord;
    indexes: {
      by_sessionId: string;
      by_themeId: string;
      by_createdAt: string;
    };
  };
}

const DB_NAME = 'one-minute-memo-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OneMinuteMemoDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OneMinuteMemoDB>(DB_NAME, DB_VERSION, {
      upgrade: async (db, oldVersion, _newVersion, transaction) => {
        // themes
        if (!db.objectStoreNames.contains('themes')) {
          const store = db.createObjectStore('themes', { keyPath: 'id' });
          // use numeric flag (0/1) for index key; IndexedDB index keys cannot be boolean
          store.createIndex('by_isActive', 'isActiveIndex', { unique: false });
          store.createIndex('by_category', 'category', { unique: false });
        } else if (oldVersion < 2 && transaction) {
          const store = transaction.objectStore('themes');
          if (store.indexNames.contains('by_isActive')) {
            store.deleteIndex('by_isActive');
          }
          store.createIndex('by_isActive', 'isActiveIndex', { unique: false });
          const existing = await store.getAll();
          for (const theme of existing) {
            await store.put({
              ...theme,
              isActiveIndex: theme.isActive ? 1 : 0,
            });
          }
        }

        // sessions
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by_startedAt', 'startedAt', { unique: false });
          store.createIndex('by_endedAt', 'endedAt', { unique: false });
        }

        // memos
        if (!db.objectStoreNames.contains('memos')) {
          const store = db.createObjectStore('memos', { keyPath: 'id' });
          store.createIndex('by_sessionId', 'sessionId', { unique: false });
          store.createIndex('by_themeId', 'themeId', { unique: false });
          store.createIndex('by_createdAt', 'createdAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}
