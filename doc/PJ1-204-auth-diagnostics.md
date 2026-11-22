# PJ1-204: 認証 API 診断ログ（Vercel 照合手順）

## 出力形式

Handler が HTTP 500 相当の障害を検出すると、`console.error` に **1 行の JSON** を出します。

主なフィールド:

| フィールド | 意味 |
| --- | --- |
| `event` | `auth.failure` または `auth.rollback_failure` |
| `requestId` | サーバー生成の相関 ID（クライアント入力は使わない） |
| `route` | `/api/auth/signin` など |
| `stage` | 失敗段階（例: `identity_toolkit.signin`） |
| `httpStatus` | 公開レスポンスの HTTP ステータス |
| `publicErrorCode` | クライアントへ返した `AUTH_*` |
| `diagnosticClass` | 秘密情報を含まない固定分類 |
| `missingEnvNames` | 不足している環境変数名のみ（値は出さない） |

パスワード・メール・UID・トークン・秘密鍵・API キー・生の例外メッセージは記録しません。

## Vercel での照合手順

1. 対象デプロイ（コミット SHA）が本番／Preview に載っていることを確認する。
2. 検証用アカウントで `/api/auth/signin` または `/api/auth/signup` を再現する。時刻（タイムゾーン付き）を控える。
3. Vercel → Project → Logs で、デプロイ・時刻・パス（`/api/auth/...`）で絞り込む。
4. Messages に JSON 1 行が出ていれば、`requestId` / `stage` / `diagnosticClass` を控える。
5. 同じ時刻帯の 500 リクエスト行と突き合わせる（パスと時刻で十分。`requestId` はログ本文側の相関用）。
6. `AUTH_INTERNAL` なのに JSON が無い場合:
   - 別デプロイ／フィルターを疑う
   - Handler 到達前の import / 初期化失敗は Functions の起動エラーとして出ることがある

## 原因修正への引き継ぎ

診断ログ追加だけではログイン復旧完了とみなさない。特定できた `stage` / `diagnosticClass` を根拠に、修正タスクを別途切る。
