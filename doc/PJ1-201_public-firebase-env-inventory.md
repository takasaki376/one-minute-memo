# PJ1-201: Firebase 公開環境変数の棚卸し

`.env.local` は確認・変更していない。

## 分類結果

| 変数名 | 旧用途 | 対応方針 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | クライアント Identity Toolkit / ログイン UI 判定 | **サーバー専用へ移行** → `FIREBASE_WEB_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | クライアント SDK `initializeApp` | **削除** |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | クライアント SDK `initializeApp` | **削除** |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | クライアント SDK `initializeApp` | **削除** |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | クライアント SDK（任意） | **削除** |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | クライアント SDK（任意） | **削除** |

## 削除後に必要なサーバー設定

- `FIREBASE_WEB_API_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## クライアント Firebase 処理

- `firebase/auth` / `firebase/firestore` の直接利用は削除した。
- 認証・同期は `src/app/api/auth/**` / `src/app/api/sync/**` のみ。
- ログイン UI の有効判定は `GET /api/auth/session` の `configured`（Admin + Web API キー）。

## 人が `.env.local` で行うこと

ソース参照が消えたことを確認したあと、次を手動で行う。

1. `NEXT_PUBLIC_FIREBASE_*` を削除する
2. `FIREBASE_WEB_API_KEY=` に Firebase コンソールの Web API キーを入れる
3. `FIREBASE_ADMIN_*` はこれまでどおり残す
4. 開発サーバーを再起動する
