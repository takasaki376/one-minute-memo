
# 📘 one-minute-memo

**One Minute Memo（1 分メモ）** は、短時間で思考を書き出すトレーニングをサポートする Web アプリです。
200 個のテーマの中からランダムに 10 個を選び、**1 テーマにつき 1 分間でメモを書く**体験を提供します。
テキスト入力に加えて、**手書き入力**にも対応しています。

MVP では IndexedDB にデータを保存し、将来的には Supabase と同期してマルチデバイスで利用できる仕組みを目指します。

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
- **Tailwind CSS（予定）**
- （将来的に）Supabase（同期／認証）

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

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourname/one-minute-memo.git
cd one-minute-memo
```

### 2. 依存関係をインストール

```bash
yarn install
```

### 3. 開発サーバーを起動

```bash
yarn dev
```

アクセス：

```
http://localhost:3000
```

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
- [ ] ログイン・マルチデバイス対応
- [ ] 分析画面（傾向分析など）

---

## 📝 ライセンス

MIT License
