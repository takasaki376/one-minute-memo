----

## 🧩 タスク: AGENTS.md 作成

### 1. AGENTS.md の目的・役割を決める

- AGENTS.md に何を書くかの範囲を決める
** このリポジトリで Codex に「どう振る舞ってほしいか」のルール
** どんなエージェント（役割）を定義するか
** Server Action をどこまで使ってよいかの方針

----

### 2. 基本構成のドラフトを作る

- AGENTS.md のセクション構成を決める
例：
** Overview（プロジェクト概要）
** Global Rules（共通ルール）
** Agents（役割一覧）
** Server Actions Policy（Server Action の使い方）
** Example Prompts（サンプルプロンプト）

----

### 3. プロジェクト概要を記述する

- {{one-minute-memo}} の目的・機能の要約を書く
** 1テーマ1分のメモアプリ
** IndexedDB 利用
** 将来 Supabase 連携予定 など

----

### 4. Global Rules（共通ルール）を定義する

- コーディングスタイル（TypeScript / Tailwind / App Router など）
- テスト方針（あれば）
- ライブラリ選定の制約（なるべく軽いもの／UIはTailwind中心 等）

----

### 5. エージェント一覧を決める

- 必要なエージェントの「名前」と「役割」を決める
例：
** {{architect}}: 設計・リファクタ提案担当
** {{nextjs-dev}}: ページ・コンポーネント実装担当
** {{db-dev}}: IndexedDB / 将来の Supabase 設計・実装担当
** {{test-dev}}: テストコード・リグレッション防止担当

----

### 6. 各エージェントの詳細を書く

- 各エージェントごとに以下を記述
** 役割（何をするときに呼ぶか）
** 得意分野（Next.js / DB / UI など）
** 使ってよいツール（ファイル編集 / 実行 / 解析など）
** 禁止事項（勝手にAPIキー書かない、設定を破壊しない etc.）

----

### 7. Server Actions Policy セクションを作る

- 「Server Actions をどのような用途に使ってよいか」の方針を書く
例：
** ✅ OK:
*** 将来の Supabase や外部APIへのアクセス
*** データの永続化（サーバ側）
** ❌ NG:
*** IndexedDB へのアクセス（クライアント専用）
*** 単なる UI 状態更新
- 具体例（1〜2例）を箇条書きにする
** セッション結果を Supabase に保存する Action
** 設定ページからのサーバ側更新など

----

### 8. Server Actions の「使える対象」を Codex に相談するプロンプトを用意する

※ここがリクエストいただいたポイントです。
*AGENTS.md の Example Prompts に載せる用*として、Codex に投げるプロンプトの雛形を作っておきます。

#### プロンプト例 1：Server Actions で扱うべき処理の洗い出し

```このリポジトリは「one-minute-memo」という 1分メモアプリのコードベースです。

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

#### プロンプト例 2：特定機能を Server Action 化してもよいかの相談

```one-minute-memo プロジェクトで、次の機能を Server Action として実装してよいか評価してください。

1. セッション終了時にメモ結果を Supabase に同期する処理（将来対応予定）
1. 設定画面からユーザーごとの環境設定を保存する処理（将来対応予定）

それぞれについて、
1. Server Action を使うメリット／デメリット
2. クライアントコンポーネント側に置く場合との比較
3. AGENTS.md の「Server Actions Policy」にどう書き足すとよいか

を Markdown で整理してください。
```

#### プロンプト例 3：Server Actions で「使える対象」リストを作らせる

```このリポジトリの目的は、クライアント側の IndexedDB にメモを保存しつつ、
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
1. Supabase は v2 以降で導入予定
1. セキュリティとメンテナンス性を優先してください。
```

----

### 9. Example Prompts セクションに他の典型的なプロンプトも追加する

- 実装用（例：{{nextjs-dev}} に対するコンポーネント実装依頼）
- 設計用（例：{{architect}} に対するフロー設計依頼）
- DB 用（例：{{db-dev}} に対するスキーマ修正依頼）

----

### 10. AGENTS.md をコミット・共有する

- AGENTS.md をリポジトリ直下に配置する
- {{git add AGENTS.md}} → {{git commit}}
- Codex CLI のドキュメントどおりに、エージェント設定が認識されるか確認する

----

## ✅ 「AGENTS.md 作成」タスクのまとめ（チェックリスト）

1. AGENTS.md の構成を決める
1. Overview／Global Rules を記述する
1. Agents 一覧と各エージェントの役割を書く
1. Server Actions Policy を作る
1. Server Actions の使える対象を決めるための Codex プロンプト例を書く
1. その他の Example Prompts を追加する
1. AGENTS.md をコミットする

----

このあと、

- 実際の *AGENTS.md の雛形（Markdown そのもの）*
- 各エージェントの具体的な記述例（architect / nextjs-dev / db-dev など）

も出せますが、どこまで書きたいですか？
