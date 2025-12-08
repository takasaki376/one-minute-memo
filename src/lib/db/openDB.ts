import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { ThemeRecord } from '@/types/theme';
import type { SessionRecord } from '@/types/session';
import type { MemoRecord } from '@/types/memo';

export interface OneMinuteMemoDB extends DBSchema {
  themes: {
    key: string; // ThemeRecord.id
    value: ThemeRecord;
    indexes: {
      by_isActive: number; // numeric index (0/1) derived from isActive for querying
      by_category: string;
    };
  };

  sessions: {
    key: SessionRecord['id']; // SessionRecord.id
    value: SessionRecord;
    indexes: {
      by_startedAt: string;
      by_endedAt: string;
    };
  };

  memos: {
    key: MemoRecord['id']; // MemoRecord.id
    value: MemoRecord;
    indexes: {
      by_sessionId: string;
      by_themeId: string;
      by_createdAt: string;
    };
  };
}

const DB_NAME = 'one-minute-memo-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OneMinuteMemoDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OneMinuteMemoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // themes
        if (!db.objectStoreNames.contains('themes')) {
          const store = db.createObjectStore('themes', { keyPath: 'id' });
          // use numeric flag (0/1) for index key; IndexedDB index keys cannot be boolean
          store.createIndex('by_isActive', 'isActiveIndex', { unique: false });
          store.createIndex('by_category', 'category', { unique: false });
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
