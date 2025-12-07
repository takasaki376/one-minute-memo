いいですね、ここはきっちり決めておくと後が楽です。
MVP 前提で、**シンプル＋拡張しやすい IndexedDB のデータモデル**を定義します。

---

## 1. 全体構成

- DB 名：`zerome-db`（仮）
- バージョン：`1`
- オブジェクトストア：

  1. `themes` … テーママスタ
  2. `sessions` … セッション（1 回のメモタイム）
  3. `memos` … 各テーマに対するメモ（テキスト＋手書き）

---

## 2. `themes` ストア（テーマ）

### 目的

- ランダム出題の元データ
- ON/OFF 管理

### 定義

- ストア名：`themes`
- keyPath：`id`（string）
- インデックス：

  - `isActive` … 有効／無効で絞り込み

### 型イメージ（TypeScript）

```ts
export type ThemeSource = "builtin" | "user";

export interface ThemeRecord {
  id: string; // 'theme-0001' など
  title: string; // テーマ名（例：今日達成したいことは？）
  category: string; // カテゴリ名（例：'目標', '振り返り', '感情', '仕事' など）
  isActive: boolean; // 出題対象にするかどうか
  source: ThemeSource; // 'builtin' | 'user'
  createdAt: string; // ISO文字列
  updatedAt: string; // ISO文字列
}
```

### インデックス例

```ts
store.createIndex("by_isActive", "isActive", { unique: false });
```

---

## 3. `sessions` ストア（セッション）

### 目的

- 「1 回の実施」を表す単位
- 履歴一覧表示で使う

### 定義

- ストア名：`sessions`
- keyPath：`id`（string）
- インデックス：

  - `startedAt` … 新しい順に並べる用
  - `endedAt` … 終了時間でソートしたいとき用（オプション）

### 型イメージ

```ts
export interface SessionRecord {
  id: string; // 'sess-2025-01-10-090000-xyz' など
  startedAt: string; // ISO文字列
  endedAt: string; // ISO文字列
  themeIds: string[]; // このセッションで使ったテーマIDの配列（10個）
  memoCount: number; // 実際に書かれたメモ数（途中終了に対応）
}
```

### インデックス例

```ts
store.createIndex("by_startedAt", "startedAt", { unique: false });
store.createIndex("by_endedAt", "endedAt", { unique: false });
```

---

## 4. `memos` ストア（メモ）

### 目的

- 各「テーマ × セッション」の入力結果を保存

### 定義

- ストア名：`memos`
- keyPath：`id`（string）
- インデックス：

  - `sessionId` … セッション詳細表示でまとめて取得
  - `themeId` … テーマ別に履歴を振り返るとき用
  - `createdAt` … 時系列で並べたい場合

### 型イメージ

```ts
export interface MemoRecord {
  id: string; // 'memo-xxxx'
  sessionId: string; // 紐づくセッションID
  themeId: string; // 紐づくテーマID
  order: number; // セッション内での順番 (1〜10)

  textContent: string; // テキスト入力
  // 手書きデータ: Blob or base64 string
  handwritingType: "none" | "blob" | "dataUrl";
  handwritingBlob?: Blob; // type === 'blob' のときに使用
  handwritingDataUrl?: string; // type === 'dataUrl' のときに使用

  createdAt: string; // ISO文字列
  updatedAt: string; // ISO文字列
}
```

> ※実装簡単さを優先するなら、最初は `handwritingDataUrl: string | null` だけでも OK です。
> データサイズが気になってきたら Blob 保存に変えるイメージ。

### インデックス例

```ts
store.createIndex("by_sessionId", "sessionId", { unique: false });
store.createIndex("by_themeId", "themeId", { unique: false });
store.createIndex("by_createdAt", "createdAt", { unique: false });
```

---

## 5. 初期化処理（DB オープン時の upgrade ロジック例）

ざっくりイメージだけ：

```ts
const DB_NAME = "zerome-db";
const DB_VERSION = 1;

function openZeromeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // themes
      if (!db.objectStoreNames.contains("themes")) {
        const themeStore = db.createObjectStore("themes", { keyPath: "id" });
        // 有効／無効でフィルタ
        themeStore.createIndex("by_isActive", "isActive", { unique: false });
        // カテゴリ別フィルタ用
        themeStore.createIndex("by_category", "category", { unique: false });
      }

      // sessions
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionStore = db.createObjectStore("sessions", {
          keyPath: "id",
        });
        sessionStore.createIndex("by_startedAt", "startedAt", {
          unique: false,
        });
        sessionStore.createIndex("by_endedAt", "endedAt", { unique: false });
      }

      // memos
      if (!db.objectStoreNames.contains("memos")) {
        const memoStore = db.createObjectStore("memos", { keyPath: "id" });
        memoStore.createIndex("by_sessionId", "sessionId", { unique: false });
        memoStore.createIndex("by_themeId", "themeId", { unique: false });
        memoStore.createIndex("by_createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

---

## 6. 今後の拡張を見据えたポイント

- Supabase 連携に進むときは、**このデータモデルをほぼそのままテーブル化**できます。

  - `themes`, `sessions`, `memos` の 3 テーブル＋ `user_id` を追加するだけで OK。

- アプリ側では `Repository` レイヤーを 1 枚かませておくと、

  - 今は IndexedDB 実装
  - 将来は Supabase 実装
    に差し替えやすくなります。

---
