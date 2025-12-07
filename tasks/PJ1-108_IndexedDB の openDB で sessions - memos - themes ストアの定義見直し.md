いいタイミングでの見直しですね。
いままで出てきた {{sessions / memos / themes}} の使い方を踏まえて、*IndexedDB のスキーマと openDB 実装を整理し直す*形で提案します。

---

## 1. ストア設計の整理

### 🔹 sessions ストア（1 セッション＝ 1 レコード）

_主にやりたいこと_

- セッション開始時：{{createSession}} で 1 件追加
- セッション完了時：{{completeSession}} で更新
- 履歴一覧：{{getAllSessions}} で全部取得 → 新しい順に並び替え
- 詳細・完了画面：{{getSessionById}} で 1 件取得

_ストア定義案_

- 名前: {{sessions}}
- keyPath: {{id}}（{{SessionRecord.id}}）
- インデックス（必須ではないが将来用に）
  ** {{by_startedAt}} … {{startedAt}} で並び替え／絞り込みしたいとき用
  ** {{by_endedAt}} … 終了したセッションだけ抜き出すとき用

---

### 🔹 memos ストア（1 テーマ分のメモ＝ 1 レコード）

_主にやりたいこと_

- セッション中：{{saveMemo}} で 1 テーマごとに追加／更新
- 履歴詳細：{{getMemosBySessionId}} で「そのセッションに属するメモ全部」を取得
- 取得時は {{order}} 昇順（1〜10）で並べたい

_ストア定義案_

- 名前: {{memos}}
- keyPath: {{id}}（{{MemoRecord.id}}）
- インデックス
  ** {{by_sessionId}} … _必須_。{{sessionId}} でまとめて取得するため
  ** （おまけ）{{by_themeId}} … 将来テーマ単位で検索したくなったら活きる

---

### 🔹 themes ストア（テーママスタ 200 件）

_主にやりたいこと_

- アプリ起動時やセッション開始時：有効なテーマ一覧を取得
- カテゴリごとのフィルタなど（将来）

_ストア定義案_

- 名前: {{themes}}
- keyPath: {{id}}
- インデックス
  ** {{by_isActive}} … 有効フラグ（{{isActive: boolean}}）で絞り込み
  ** {{by_category}} … カテゴリごとの一覧を出したくなったとき用

※ {{ThemeRecord}} は例えばこんなイメージを想定：

```export interface ThemeRecord {
  id: string;
  title: string;
  categoryId: string | null; // or category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. {{openDB.ts}} 実装サンプル

「idb」ライブラリを使う前提のサンプルです。
（インストールしていなければ {{yarn add idb}}）

### 📄 {{src/lib/db/openDB.ts}}

```import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { SessionRecord } from '@/types/session';
import type { MemoRecord } from '@/types/memo';
import type { ThemeRecord } from '@/types/theme';

const DB_NAME = 'one-minute-memo';
const DB_VERSION = 1; // スキーマを変えたら 2, 3... と上げていく

// IndexedDB 全体のスキーマ定義
interface OneMinuteMemoDB extends DBSchema {
  sessions: {
    key: string;            // SessionRecord.id
    value: SessionRecord;
    indexes: {
      by_startedAt: string; // SessionRecord.startedAt
      by_endedAt: string;   // SessionRecord.endedAt
    };
  };
  memos: {
    key: string;            // MemoRecord.id
    value: MemoRecord;
    indexes: {
      by_sessionId: string; // MemoRecord.sessionId
      by_themeId: string;   // MemoRecord.themeId
    };
  };
  themes: {
    key: string;           // ThemeRecord.id
    value: ThemeRecord;
    indexes: {
      by_isActive: boolean; // ThemeRecord.isActive
      by_category: string;  // ThemeRecord.categoryId or category
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OneMinuteMemoDB>> | null = null;

/**
 * アプリ全体で使う IndexedDB インスタンスを取得する。
 * 最初の1回だけ openDB して、その後は同じ Promise を再利用。
 */
export function getDB(): Promise<IDBPDatabase<OneMinuteMemoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OneMinuteMemoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // 旧バージョンからのアップグレード処理
        // 今回は v1 を前提に↓の中でまとめて作成

        // --- sessions ストア ---
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', {
            keyPath: 'id',
          });
          // startedAt / endedAt でソートしたいとき用
          store.createIndex('by_startedAt', 'startedAt', {
            unique: false,
          });
          store.createIndex('by_endedAt', 'endedAt', {
            unique: false,
          });
        }

        // --- memos ストア ---
        if (!db.objectStoreNames.contains('memos')) {
          const store = db.createObjectStore('memos', {
            keyPath: 'id',
          });
          // セッション単位でメモ一覧を取りたいので index を張る
          store.createIndex('by_sessionId', 'sessionId', {
            unique: false,
          });
          // テーマ単位で取りたい場合用（将来）
          store.createIndex('by_themeId', 'themeId', {
            unique: false,
          });
        }

        // --- themes ストア ---
        if (!db.objectStoreNames.contains('themes')) {
          const store = db.createObjectStore('themes', {
            keyPath: 'id',
          });
          // 有効なテーマだけ取得したいとき用
          store.createIndex('by_isActive', 'isActive', {
            unique: false,
          });
          // カテゴリ別に絞り込む用
          store.createIndex('by_category', 'categoryId', {
            unique: false,
          });
        }
      },
    });
  }

  return dbPromise;
}
```

---

## 3. 既存の Repository との対応関係

今まで出してきた Repo 関数との対応を軽く整理すると：

- {{createSession}} / {{completeSession}} / {{getAllSessions}} / {{getSessionById}}
  \*\* 👉 {{sessions}} ストア（主キー {{id}}、場合によっては index で期間絞り込みも可）
- {{saveMemo}} / {{getMemosBySessionId}}
  ** 👉 {{memos}} ストア
  ** _今後は_ {{by_sessionId}} _index を使って_ {{store.index('by_sessionId').getAll(sessionId)}} *が使える*ので、
  「getAll → filter」から最適化できます
- {{getActiveThemes}}（まだ仮ですが）
  \*\* 👉 {{themes}} ストアの {{by_isActive}} index を使って
  {{index.getAll(IDBKeyRange.only(true))}} みたいな取り方ができます

---

## 4. もしすでに別スキーマで開いていた場合

- ローカルで既に試験的に別スキーマの DB を作っている場合、
  ** {{DB_VERSION}} を {{2}} に上げて、
  ** {{upgrade}} 内で {{oldVersion < 2}} のときだけ index を追加する、などの分岐を書くのが正式ですが、
- _開発初期でデータを捨ててもよいのであれば_
  ** Chrome DevTools の Application → IndexedDB から {{one-minute-memo}} を削除して
  ** {{DB_VERSION = 1}} のままこの実装に差し替えるのが一番ラクです。

---

ここまでで

- ストア構成と
- {{openDB}} の型付き実装

が揃いました。
