# AGENTS.md

このドキュメントは、Codex エージェントがこのリポジトリで「どう振る舞ってほしいか」を定義するルール集です。

---

## Overview（プロジェクト概要）

**one-minute-memo** は、1テーマ1分で思考を書き出すトレーニングをサポートするWebアプリです。

### 主な機能

- 200個のテーマからランダムに10個を選出
- 1テーマにつき60秒のカウントダウン
- テキスト入力と手書き入力（Canvas）に対応
- IndexedDBにローカル保存（オフライン対応）
- 履歴一覧・詳細表示
- テーマ管理（ON/OFF）

### 技術スタック

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **IndexedDB** (idb ライブラリ)
- **Tailwind CSS v4**
- **Vitest** (テストフレームワーク)
- （将来的に）**Supabase** (同期／認証)

### データ保存方針

- **MVP**: IndexedDB のみで動作（クライアントサイド）
- **将来**: Supabase と同期してマルチデバイス対応

---

## Global Rules（共通ルール）

### コーディングスタイル

- **TypeScript を厳格モードで使用** (`strict: true`)
- **2スペースインデント**
- **PascalCase**: React コンポーネント（例: `TimerPanel.tsx`）
- **camelCase**: 関数・変数
- **UPPER_SNAKE_CASE**: 定数
- **App Router の規約に従う**: `page.tsx`, `layout.tsx`, ルートフォルダは kebab-case

### スタイリング

- **Tailwind CSS v4** を優先使用
- カスタムCSSは最小限に（`globals.css`/PostCSS 経由）
- ユーティリティクラスを優先

### テスト

- **Vitest** を使用
- テストファイルは `*.test.ts` / `*.test.tsx`
- コンポーネントテストは `@testing-library/react` を使用

### ライブラリ選定の制約

- **軽量なライブラリを優先**
- ネイティブWeb APIを優先
- UIライブラリは最小限（Tailwind中心）
- 大きな新機能追加時は `doc/` にアーキテクチャノートを追加

### セキュリティ

- **シークレットをコミットしない**（`.env.local` を使用、クライアント公開変数は `NEXT_PUBLIC_` プレフィックス）
- 依存関係は最小限に

### コミット・PR

- **Conventional Commits** に従う（`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`）
- PRには目的・背景・動作確認手順を含める

---

## Agents（役割一覧）

### `architect` - 設計・リファクタ提案担当

**役割**: アーキテクチャ設計、リファクタリング提案、技術的意思決定のサポート

**得意分野**:
- Next.js App Router の設計パターン
- データフロー設計
- コンポーネント構造の最適化
- 将来の拡張性を考慮した設計

**使ってよいツール**:
- ファイル編集
- コード解析
- ドキュメント作成

**禁止事項**:
- 設定ファイル（`next.config.ts`, `tsconfig.json` など）の勝手な変更
- 破壊的変更の提案（必ずユーザーに確認）

---

### `nextjs-dev` - ページ・コンポーネント実装担当

**役割**: Next.js App Router を使ったページ・コンポーネントの実装

**得意分野**:
- React コンポーネント実装
- App Router のルーティング
- クライアントコンポーネントとサーバーコンポーネントの使い分け
- Tailwind CSS でのスタイリング

**使ってよいツール**:
- ファイル作成・編集
- コンポーネント実装
- UI実装

**禁止事項**:
- IndexedDB への直接アクセス（`lib/db/*` のリポジトリ関数を使用）
- Server Actions の勝手な追加（`db-dev` と相談）

---

### `db-dev` - IndexedDB / 将来の Supabase 設計・実装担当

**役割**: データベース層の設計・実装、リポジトリ関数の実装

**得意分野**:
- IndexedDB (idb ライブラリ) の設計・実装
- データモデル設計
- リポジトリパターンの実装
- 将来の Supabase 連携設計

**使ってよいツール**:
- `lib/db/*` のファイル編集
- `types/*` の型定義編集
- データモデル設計

**禁止事項**:
- UIコンポーネントの直接編集（`nextjs-dev` と相談）
- スキーマの破壊的変更（`architect` と相談）

---

### `test-dev` - テストコード・リグレッション防止担当

**役割**: テストコードの作成、リグレッション防止

**得意分野**:
- Vitest を使ったユニットテスト
- React Testing Library を使ったコンポーネントテスト
- テストカバレッジの向上

**使ってよいツール**:
- テストファイルの作成・編集
- テスト実行
- モック作成

**禁止事項**:
- 実装コードの直接編集（必要に応じて他のエージェントと相談）

---

## Server Actions Policy（Server Action の使い方）

### ✅ Server Actions を使うべき処理

1. **将来の Supabase や外部APIへのアクセス**
   - セッション結果を Supabase に保存する処理
   - ユーザー認証・認可
   - 外部サービスとの連携

2. **サーバー側でのデータ永続化**
   - 設定ページからのサーバー側設定の保存
   - サーバーサイドのログ記録

3. **セキュリティが重要な処理**
   - APIキーの使用
   - 機密情報の処理

### ❌ Server Actions を使わない処理

1. **IndexedDB へのアクセス**
   - IndexedDB はクライアント専用のため、Server Actions では使用不可
   - `lib/db/*` のリポジトリ関数をクライアントコンポーネントから直接呼び出す

2. **単なる UI 状態更新**
   - ローカル状態管理（useState, useReducer など）
   - フォームのバリデーション（クライアント側）

3. **リアルタイムな UI 更新**
   - タイマーの更新
   - キャンバスの描画

### 具体例

#### ✅ OK: Server Action として実装すべき処理

```typescript
// app/actions/sync.ts
'use server'

export async function syncSessionToSupabase(sessionId: string) {
  // Supabase にセッションを同期
  // 将来実装予定
}
```

#### ❌ NG: Server Action として実装すべきでない処理

```typescript
// ❌ これは Server Action にしない
// クライアントコンポーネントから直接呼び出す
import { saveMemo } from '@/lib/db/memosRepo';

export function MemoEditor() {
  const handleSave = async () => {
    await saveMemo(memo); // クライアント側で直接呼び出し
  };
}
```

---

## Example Prompts（サンプルプロンプト）

### プロンプト例 1: Server Actions で扱うべき処理の洗い出し

```
このリポジトリは「one-minute-memo」という 1分メモアプリのコードベースです。

App Router と Server Actions を前提に、以下を実施してください。

1. 現状の機能（セッション開始／メモ保存／履歴閲覧／将来のSupabase同期）を踏まえて、
   ・Server Actions として実装すべき処理
   ・クライアントコンポーネント側に留めるべき処理
   を分類してください。

2. Server Actions として実装すべき処理ごとに、
   ・関数名の案
   ・入力パラメータ
   ・戻り値
   ・どのページ／コンポーネントから呼ばれるか
   を表形式で提案してください。

3. 上記の結果をもとに、AGENTS.md の「Server Actions Policy」セクションに追記すべき
   箇条書き案を Markdown 形式で出してください。
```

### プロンプト例 2: 特定機能を Server Action 化してもよいかの相談

```
one-minute-memo プロジェクトで、次の機能を Server Action として実装してよいか評価してください。

1. セッション終了時にメモ結果を Supabase に同期する処理（将来対応予定）
2. 設定画面からユーザーごとの環境設定を保存する処理（将来対応予定）

それぞれについて、
1. Server Action を使うメリット／デメリット
2. クライアントコンポーネント側に置く場合との比較
3. AGENTS.md の「Server Actions Policy」にどう書き足すとよいか

を Markdown で整理してください。
```

### プロンプト例 3: Server Actions で「使える対象」リストを作らせる

```
このリポジトリの目的は、クライアント側の IndexedDB にメモを保存しつつ、
将来的に Supabase でサーバサイドにも同期することです。

以下を実施してください。

1. 将来の Supabase 連携を前提に、
   - Server Actions を使う対象（処理の種類）
   - Server Actions を使わない対象（クライアント専用の処理）
   を箇条書きで列挙してください。

2. それを AGENTS.md の「Server Actions Policy > 使用対象」に
   そのまま貼れるような Markdown 形式で出力してください。

前提条件：
1. 現状は IndexedDB のみで動作
2. Supabase は v2 以降で導入予定
3. セキュリティとメンテナンス性を優先してください。
```

### プロンプト例 4: コンポーネント実装依頼（nextjs-dev）

```
nextjs-dev エージェントとして、以下のコンポーネントを実装してください。

- セッション画面（app/session/page.tsx）
- 要件:
  - 10個のテーマを順番に表示
  - 1テーマにつき60秒のカウントダウン
  - テキスト入力と手書き入力（Canvas）に対応
  - タイマー終了時に自動で次のテーマに進む
  - IndexedDB に保存（lib/db/memosRepo.ts の saveMemo を使用）

AGENTS.md のルールに従って実装してください。
```

### プロンプト例 5: データモデル設計依頼（db-dev）

```
db-dev エージェントとして、以下のデータモデルの見直しを提案してください。

- 現在の IndexedDB スキーマ（themes, sessions, memos）を確認
- 将来の Supabase 連携を考慮した設計の改善点
- パフォーマンス最適化の提案

AGENTS.md のルールに従って、lib/db/openDB.ts と types/* を確認してください。
```

### プロンプト例 6: リファクタリング提案（architect）

```
architect エージェントとして、以下のリファクタリングを提案してください。

- 現在のコンポーネント構造を確認
- 再利用可能なコンポーネントの抽出
- データフローの最適化
- 将来の拡張性を考慮した設計改善

破壊的変更は避け、段階的な改善案を提示してください。
```

---

## 補足

- このドキュメントは、プロジェクトの進捗に応じて更新されます
- 新しいエージェントやルールが必要になった場合は、このドキュメントを更新してください
- Server Actions の使用については、必ずこのドキュメントの「Server Actions Policy」セクションを確認してください
