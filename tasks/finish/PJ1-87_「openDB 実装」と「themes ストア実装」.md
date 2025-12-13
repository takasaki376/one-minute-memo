いいですね、この2つをちゃんと作ると土台が安定します。
**「タスクとして何をやるか」＋「イメージしやすいコード例」**のセットでまとめます。

----

## 1. 「openDB 実装」のタスク詳細

### やること一覧

1. {{idb}} ライブラリを導入する
1. {{DBSchema}} 型を定義する
1. {{openDB}} 関数を作成する（シングルトン化）
1. {{onupgradeneeded}} 相当で *themes / sessions / memos* のストアを作成する
1. 他のコードから {{getDB()}} で使えるように export する

### 1-1. ファイルを作る

{{lib/db/openDB.ts}} を作成。

```mkdir -p lib/db
touch lib/db/openDB.ts
```

### 1-2. {{idb}} のインストール（まだなら）

```yarn add idb
```

### 1-3. DBSchema 定義＋ openDB 実装例

```// lib/db/openDB.ts
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export interface OneMinuteMemoDB extends DBSchema {
  themes: {
    key: string; // id
    value: {
      id: string;
      title: string;
      category: string;
      isActive: boolean;
      source: 'builtin' | 'user';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      by_isActive: boolean;
      by_category: string;
    };
  };

  sessions: {
    key: string;
    value: {
      id: string;
      startedAt: string;
      endedAt: string;
      themeIds: string[];
      memoCount: number;
    };
    indexes: {
      by_startedAt: string;
      by_endedAt: string;
    };
  };

  memos: {
    key: string;
    value: {
      id: string;
      sessionId: string;
      themeId: string;
      order: number;
      textContent: string;
      handwritingType: 'none' | 'blob' | 'dataUrl';
      handwritingDataUrl?: string;
      createdAt: string;
      updatedAt: string;
    };
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
      upgrade(db, oldVersion, newVersion, transaction) {
        // themes
        if (!db.objectStoreNames.contains('themes')) {
          const store = db.createObjectStore('themes', { keyPath: 'id' });
          store.createIndex('by_isActive', 'isActive', { unique: false });
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
```

これで：

- どこからでも {{const db = await getDB();}} で Typed な DB にアクセスできる
- スキーマ変更したいときは {{DB_VERSION}} を上げて {{upgrade}} 内を修正

----

## 2. 「themes ストア実装」のタスク詳細

ここは *「テーマ専用のリポジトリ関数」を作る*タスクです。

### やること一覧

1. {{ThemeRecord}} 型を定義する
1. {{themesRepo.ts}} を作成する
1. CRUD 系の関数を実装する
#* getAllThemes
#* getActiveThemes
#* upsertThemes（複数一括）
#* toggleThemeActive
1. 初期テーマ投入用の {{initBuiltinThemesIfNeeded}} を用意する（余裕があれば）

### 2-1. 型定義（types/theme.ts）

```// types/theme.ts
export type ThemeSource = 'builtin' | 'user';

export interface ThemeRecord {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  source: ThemeSource;
  createdAt: string;
  updatedAt: string;
}
```

※ {{OneMinuteMemoDB['themes']['value']}} と同じ構造になるように。

### 2-2. {{themesRepo.ts}} の作成

```touch lib/db/themesRepo.ts
```

### 2-3. themesRepo の実装例

```// lib/db/themesRepo.ts
import { getDB } from './openDB';
import type { ThemeRecord } from '@/types/theme';

const THEME_STORE = 'themes';

export async function getAllThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  return db.getAll(THEME_STORE);
}

export async function getActiveThemes(): Promise<ThemeRecord[]> {
  const db = await getDB();
  const index = db.transaction(THEME_STORE).store.index('by_isActive');
  const result = await index.getAll(true);
  return result;
}

export async function upsertThemes(themes: ThemeRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  for (const theme of themes) {
    await tx.store.put(theme);
  }
  await tx.done;
}

export async function toggleThemeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(THEME_STORE, 'readwrite');
  const store = tx.store;
  const existing = await store.get(id);
  if (!existing) {
    console.warn('theme not found:', id);
    await tx.done;
    return;
  }

  const updated: ThemeRecord = {
    ...existing,
    isActive,
    updatedAt: new Date().toISOString(),
  };

  await store.put(updated);
  await tx.done;
}
```

### 2-4. 初期テーマ投入ロジック（任意だけどMVPではほぼ必須）

```// lib/db/themesRepo.ts の続き

// 仮のテーマ配列（本番は別ファイルでもOK）
const builtinThemes: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '今日やりたいことは？',
    category: '目標',
    isActive: true,
    source: 'builtin',
  },
  {
    title: '今気になっていることは？',
    category: '感情',
    isActive: true,
    source: 'builtin',
  },
  // ...200件分
];

export async function initBuiltinThemesIfNeeded(): Promise<void> {
  const db = await getDB();
  const count = await db.count(THEME_STORE);
  if (count > 0) {
    // すでに何か入っている場合は何もしない
    return;
  }

  const now = new Date().toISOString();
  const themes: ThemeRecord[] = builtinThemes.map((t, index) => ({
    id: `theme-${String(index + 1).padStart(4, '0')}`,
    title: t.title,
    category: t.category,
    isActive: t.isActive,
    source: t.source,
    createdAt: now,
    updatedAt: now,
  }));

  await upsertThemes(themes);
}
```

### 2-5. 利用側での呼び出しイメージ

- アプリ起動時 or トップ画面表示時に初期化：

```// 例: app/page.tsx の useEffect 内など（クライアントコンポーネント）
useEffect(() => {
  initBuiltinThemesIfNeeded().catch(console.error);
}, []);
```

- セッション開始時に有効なテーマを取得：

```import { getActiveThemes } from '@/lib/db/themesRepo';

const activeThemes = await getActiveThemes();
// ここからランダムで10個選ぶ
```

----

## 3. まとめ（タスクとして書くならこう）

### openDB 実装タスク

- {{lib/db/openDB.ts}} を作成する
- {{DBSchema}}（OneMinuteMemoDB）を定義する
- {{themes / sessions / memos}} のオブジェクトストアを {{upgrade}} 内で作る
- {{getDB()}} をシングルトンとして export する

### themes ストア実装タスク

- {{types/theme.ts}} に {{ThemeRecord}} を定義する
- {{lib/db/themesRepo.ts}} を作成する
- {{getAllThemes()}} / {{getActiveThemes()}} を実装する
- {{upsertThemes()}} / {{toggleThemeActive()}} を実装する
- 初回起動時の {{initBuiltinThemesIfNeeded()}} を実装する

----

このあともしよければ：

- 「ランダムに10テーマを選ぶ関数」の設計
- 「セッション開始時にテーマを引いてメモ構造を初期化する処理」

あたりを次のタスクとして一緒に詰めていきましょう。
