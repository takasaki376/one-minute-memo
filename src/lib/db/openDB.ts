import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { ThemeRecord } from '@/types/theme';

export interface OneMinuteMemoDB extends DBSchema {
  themes: {
    key: string; // ThemeRecord.id
    value: ThemeRecord;
    indexes: {
      by_isActive: number;
      by_category: string;
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
          store.createIndex('by_isActive', 'isActive', { unique: false });
          store.createIndex('by_category', 'category', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}
