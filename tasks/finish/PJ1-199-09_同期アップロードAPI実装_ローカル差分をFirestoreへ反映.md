## タイトル

同期アップロードAPI実装（ローカル差分をFirestoreへ反映）

## 種別

Task

## 背景

- 現在はクライアント側で writeBatch/deleteDoc を実行している。
- 同期書き込みをサーバー側へ移管する必要がある。

## 目的

- ローカル差分アップロードをサーバーAPI化する。

## スコープ

- POST /api/sync/upload
- memos/sessions/themes/themeSettings のアップロード
- batch書き込みと失敗件数返却

## 対応内容

1. upload API実装
2. 差分判定ルール適用（updatedAt比較）
3. uploadFailures を返却
4. cloud lastSyncedAt 更新

## 完了条件（Acceptance Criteria）

- 同期アップロードがAPI経由で実行できる
- 成功件数/失敗件数が返る
- 既存の重複防止要件を満たす

## 想定リスク

- 差分判定漏れによる重複更新
- 部分失敗時の再実行設計不備

## 見積

- 0.75日

## 依存関係

- 依存先: PJ1-199-08
- 依存元: PJ1-199-11, PJ1-199-12
