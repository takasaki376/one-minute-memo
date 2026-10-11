## タイトル

同期UIのAPI経由化（SyncSection置換）

## 種別

Task

## 背景

- SyncSection はクライアント直同期を呼んでいる。
- 同期処理をAPI経由へ統一する段階。

## 目的

- 同期操作をすべてAPI呼び出しへ置換する。

## スコープ

- SyncSectionの呼び出し置換
- クライアント直Firestore呼び出し撤去
- 同期結果表示の維持

## 対応内容

1. syncUserData 直接実行をAPI呼び出しへ変更
2. fetchCloudLastSyncedAt 取得経路をAPI化
3. UIの結果表示（件数/失敗件数）維持
4. 未ログイン時挙動維持

## 完了条件（Acceptance Criteria）

- 同期UIがAPI経由で同等動作する
- クライアント側Firestore依存が削減される
- 設定画面の同期体験が回帰しない

## 想定リスク

- 結果メッセージ仕様差異
- 既存同期状態表示の取りこぼし

## 見積

- 0.5日

## 依存関係

- 依存先: PJ1-199-09, PJ1-199-10
- 依存元: PJ1-199-12
