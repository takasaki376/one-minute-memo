## タイトル

Bun への実行環境切替および Volta から mise へのバージョン管理移行

## 種別

Task

## 背景

- 現在は Node + Yarn + Volta 前提の運用になっている。
- 依存管理・スクリプト実行を Bun ベースへ切り替え、バージョン管理を Volta から mise に移行したい。
- 既存コードでは以下の前提が残っている。
- package.json: volta フィールド、Yarn前提の運用
- playwright.config.ts: webServer.command が yarn dev
- README.md: セットアップ手順が yarn install / yarn dev / yarn test:e2e
- yarn.lock: Yarnロックファイルが存在

## 目的

- パッケージ管理・スクリプト実行を Bun に統一する。
- ツールバージョン管理を mise に統一する。
- ローカル開発、テスト、E2E の実行フローが移行後も同等に動作する状態を作る。

## スコープ

- Bun導入と依存再解決（lockfile切替）
- Volta設定撤去とmise設定追加
- Yarn依存コマンドの置換
- ドキュメント更新
- 回帰テスト（lint / unit / e2e / build）

## 対応内容

1. 移行方針の決定

- Bunを標準実行環境として採用
- miseで Bun バージョンを固定
- 必要に応じて移行期間のみ Node も mise 管理対象に残す（互換性保険）

2. 設定ファイル更新

- package.json
- volta フィールドを削除
- packageManager フィールドを追加（Bun前提）
- 既存 script は bun run で実行可能な形を確認
- 新規で mise.toml を追加し、Bun（必要ならNode）バージョン固定

3. ロックファイル移行

- YarnロックからBunロックへ移行
- yarn.lock の扱いを決定（削除または移行期間併存）
- チーム運用として採用するロック形式を明文化

4. 実行コマンドの置換

- playwright.config.ts の webServer.command を yarn dev から bun run dev へ変更
- READMEの手順を Bun 基準へ置換
- install: bun install
- dev: bun run dev
- test: bun run test
- e2e: bun run test:e2e

5. 検証

- 依存インストールが成功すること
- bun run dev で起動できること
- bun run lint が通ること
- bun run test が通ること
- bun run test:e2e が通ること
- bun run build が通ること

6. 影響調査・記録

- Bun未対応/不安定な依存があれば一覧化
- 回避策（Node fallback、バージョン固定、postinstall調整）をJiraに記録
- 将来CI導入時の標準実行環境を Bun + mise に統一する方針を追記

## 完了条件（Acceptance Criteria）

- Volta設定が撤去され、mise設定に置き換わっている
- Bunで install / dev / lint / test / e2e / build が実行可能
- Yarn前提の主要記述が README と設定ファイルから除去されている
- ロックファイル運用方針が確定し、リポジトリ状態に反映されている
- 既存主要機能（session/history/settings/themes）のE2Eが通過している

## 想定リスク

- 一部ツールで Bun 実行時の互換性差分が出る可能性
- Playwright の postinstall 周辺で環境差分が出る可能性
- Node 完全排除が難しいケース（特定CLIや将来CI）への対応が必要になる可能性

## 優先度

High

## 見積

- 事前調査・方針確定: 0.5日
- 設定変更・コマンド置換: 0.5日
- 検証・不整合修正: 0.5日
- 合計: 1.5日（互換性問題が出た場合は +0.5日）

## 実施メモ（作業者向け）

- まずは Bun パッケージ管理移行を先行し、アプリ起動まで確認
- 次に mise 導入と Volta 撤去を実施
- 最後に E2E まで含めて回帰確認し、READMEを最終更新する
