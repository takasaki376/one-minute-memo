
# 📘 one-minute-memo

**One Minute Memo（1 分メモ）** は、短時間で思考を書き出すトレーニングをサポートする Web アプリです。
200 個のテーマの中からランダムに 10 個を選び、**1 テーマにつき 1 分間でメモを書く**体験を提供します。
テキスト入力に加えて、**手書き入力**にも対応しています。

MVP では IndexedDB にデータを保存します。ログインは任意で、未ログインでもメモ機能を使えます。認証は Firebase のセッション Cookie をサーバー API で発行します。

---

## ✨ Features (MVP)

- 🎲 **ランダムにテーマを 10 個選出**
- ⏱ **1 テーマにつき 60 秒のカウントダウン**
- 📝 **テキスト入力メモ**
- ✍️ **手書き入力（Canvas）対応**
- 📦 **IndexedDB にローカル保存（オフライン対応）**
- 🗂 **履歴一覧・詳細表示**
- 🔧 **テーマ管理（ON/OFF）**
- 🖥 **Next.js（App Router）ベース**

---

## 🚀 技術スタック

- **Next.js**
- **React**
- **TypeScript**
- **IndexedDB**
- **Tailwind CSS**
- **Firebase Authentication**（Route Handler。httpOnly `__session`）
- **Firestore**（同期は現行クライアント SDK。サーバー API 化は後続）

---

## 📂 ディレクトリ構成（予定）

```
one-minute-memo/
├── app/
│   ├── page.tsx                 # トップ画面
│   ├── session/
│   │   └── page.tsx             # 入力セッション画面
│   ├── history/
│   │   ├── page.tsx             # 履歴一覧
│   │   └── [id]/
│   │       └── page.tsx         # 履歴詳細
│   └── themes/
│       └── page.tsx             # テーマ管理
├── lib/
│   ├── db/                      # IndexedDB 関連
│   │   ├── openDB.ts
│   │   ├── themesRepo.ts
│   │   ├── sessionsRepo.ts
│   │   └── memosRepo.ts
│   └── utils/
│       └── random.ts
├── public/
├── package.json
└── README.md
```

---

## 💾 IndexedDB データモデル

### `themes` ストア

```ts
{
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  source: "builtin" | "user";
  createdAt: string;
  updatedAt: string;
}
```

### `sessions` ストア

```ts
{
  id: string;
  startedAt: string;
  endedAt: string;
  themeIds: string[];
  memoCount: number;
}
```

### `memos` ストア

```ts
{
  id: string;
  sessionId: string;
  themeId: string;
  order: number;
  textContent: string;
  handwritingType: 'none' | 'blob' | 'dataUrl';
  handwritingBlob?: Blob;
  handwritingDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🛠 開発環境セットアップ

前提ツールは [mise](https://mise.jdx.dev/) で管理します（`mise.toml`）。Volta / Yarn は使いません。

```bash
# mise 未導入の場合（macOS / Homebrew）
brew install mise
eval "$(mise activate zsh)"   # または bash / fish。シェル設定にも追記推奨

cd one-minute-memo
mise install                  # Bun / Node を mise.toml の版に合わせて入れる
```

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourname/one-minute-memo.git
cd one-minute-memo
```

### 2. 依存関係をインストール

```bash
bun install
```

ロックファイルは `bun.lock` を正とします（`yarn.lock` は使いません）。

### 3. 開発サーバーを起動

```bash
bun run dev
```

アクセス：

```
http://localhost:3000
```

### 4. 認証（任意）

`.env.example` を `.env.local` にコピーし、値を入れます。秘密情報はコミットしません。変更後は開発サーバーを再起動します。

クライアントに公開される値:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`（任意）
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`（任意）

サーバー専用（Firebase コンソールのサービスアカウント秘密鍵）:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`（改行は `\n` のまま 1 行にし、全体をダブルクォートで囲む）

`*firebase-adminsdk*.json` は `.gitignore` 対象です。JSON から値を写したら、ファイルをリポジトリに含めないでください。

| 操作 | 経路 |
| --- | --- |
| サインアップ | `POST /api/auth/signup`。Cookie は付かない。確認メール後にログインする |
| サインイン | ブラウザが Identity Toolkit REST で ID トークンを取得し、`POST /api/auth/signin` が `__session` を発行する |
| 復元 | `GET /api/auth/session` |
| サインアウト | `POST /api/auth/signout` |

制約:

- Admin 用の環境変数が無いと、サインインは `500` / `AUTH_NOT_CONFIGURED` になる
- 画面のログインは Firebase Client SDK の `currentUser` をセットしない。Firestore 同期はまだクライアント直叩きのため、ログイン後の同期権限は PJ1-199-11 まで揃わない
- 未ログインでもセッション・履歴・テーマ管理は IndexedDB だけで動作する

### 5. テスト

単体・コンポーネントテストは **Bun + Vitest のハイブリッド**です。

| コマンド | 内容 |
| --- | --- |
| `bun run test` | Bun 対象 → Vitest 対象を順に実行（推奨） |
| `bun run test:bun` | `src/**/*.bun.test.ts(x)` のみ（`scripts/run-bun-tests.ts` → Bun） |
| `bun run test:vitest` | `*.test.ts` / `*.test.tsx`（Vitest + jsdom） |
| `bun run test:watch` | Vitest の watch モード |
| `bun run test:e2e` | Playwright E2E（初回のみ `bunx playwright install chromium`） |

**どちらに書くか**

- **Bun（`*.bun.test.ts`）**: DOM / Testing Library / IndexedDB の重いモックに依存しない純粋ロジック
- **Vitest（`*.test.ts` / `*.test.tsx`）**: React コンポーネント、`renderHook`、`vi.mock` 前提のリポジトリテストなど

詳細は `doc/PJ1-198_bun-vitest-hybrid.md` を参照。

---

## 📌 今後のロードマップ

### 🔹 MVP

- [ ] セッション画面の UI 実装
- [ ] タイマー（1 テーマ 1 分）
- [ ] IndexedDB 保存ロジック
- [ ] 履歴一覧・詳細
- [ ] テーマ管理画面

### 🔹 将来計画

- [ ] カテゴリ管理・テーマ追加機能
- [ ] PWA 対応
- [ ] Supabase 同期
- [x] ログイン（任意。未ログインでもメモ可。セッションはサーバー Cookie）
- [ ] Firestore 同期のサーバー API 化
- [ ] 分析画面（傾向分析など）

---

## 📝 ライセンス

MIT License
