## タイトル

認証基盤実装（Firebase Admin初期化とセッションユーティリティ）

## 種別

Task

## 背景

- PJ1-199-01で契約を確定したため、API実装前に共通基盤を整備する。

## 目的

- Firebase Admin初期化と、セッションCookie操作の共通ユーティリティを実装する。

## スコープ

- サーバー側Firebase初期化
- セッションCookieの発行/取得/破棄ユーティリティ
- 認証共通エラー変換

## 対応内容

1. Firebase Admin初期化処理を実装
2. setAuthCookie / clearAuthCookie / getAuthCookie を実装
3. 共通エラー変換（Firebaseエラー -> APIエラー形式）を実装
4. 環境変数のサーバー専用整理（秘密情報の公開禁止）

## 完了条件（Acceptance Criteria）

- APIルートからFirebase Adminを利用可能
- Cookie操作関数が利用可能
- 共通エラー変換が実装済み

## 想定リスク

- 環境変数設定ミス
- Cookie属性ミスによるセッション不整合

## 見積

- 0.5日

## 依存関係

- 依存先: PJ1-199-01
- 依存元: PJ1-199-03, PJ1-199-04, PJ1-199-05
