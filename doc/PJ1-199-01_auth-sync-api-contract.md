# PJ1-199-01: 認証・同期 API 契約（API Route 主軸）

後続（PJ1-199-02〜12）はこの文書と `src/types/*` / `src/lib/auth/errorContract.ts` / `src/lib/sync/conflictPolicy.ts` を正とする。

## 方針

- 実装は **App Router の Route Handler**（`src/app/api/**/route.ts`）。Server Actions は使わない。
- クライアントは Firebase Auth / Firestore を直接呼ばず、下記 API のみを使う（置換は 199-06 / 199-11）。
- IndexedDB は従来どおりクライアント専用。同期 API はローカル差分を JSON で受け取り、Firestore へ反映する。
- 未ログインでもメモ機能は従来どおりローカルのみで利用できる。同期 API は未認証なら `SYNC_UNAUTHENTICATED`。

## 共通レスポンス

```ts
{ success: true, data: T }
{ success: false, error: { code: string, message: string } }
```

ヘルパー: `src/lib/api/envelope.ts` の `ok` / `fail`。

HTTP 目安:

| 状況 | status |
| --- | --- |
| 成功 | 200 |
| バリデーション | 400 |
| 未認証 | 401 |
| 権限なし | 403 |
| サーバー未設定 / 内部エラー | 500 |

`message` は UI 表示用の日本語。`code` はプログラム判定用。

## 認証 API

| Method | Path | Cookie | 成功 `data` |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | セットしない（現行 UX: 確認メール後にログイン） | `{ user: null, message }` |
| POST | `/api/auth/signin` | `__session` をセット | `{ user: SessionUser }` |
| POST | `/api/auth/signout` | `__session` を削除 | `{ user: null }` |
| GET | `/api/auth/session` | 参照のみ | `{ user: SessionUser \| null }` |

### リクエスト

signup / signin:

```ts
{ email: string; password: string }
```

signout: body なし。session: query なし。

### SessionUser

```ts
{ uid: string; email: string | null; emailVerified: boolean }
```

### セッション Cookie

`src/lib/auth/sessionCookie.ts`

| 項目 | 値 |
| --- | --- |
| name | `__session` |
| httpOnly | true |
| sameSite | `lax` |
| path | `/` |
| secure | 本番のみ true |
| maxAge | 5 日（上限 14 日） |

サーバーは Firebase Admin の session cookie を検証して UID を得る（実装は 199-02）。

### 認証エラーコード

`src/lib/auth/errorContract.ts`。既存 UI 文言を維持しつつ、API では Firebase 生コードを返さない。

| code | 主な Firebase 由来 |
| --- | --- |
| AUTH_INVALID_EMAIL | auth/invalid-email |
| AUTH_INVALID_CREDENTIAL | auth/invalid-credential, user-not-found, wrong-password |
| AUTH_EMAIL_ALREADY_IN_USE | auth/email-already-in-use |
| AUTH_WEAK_PASSWORD | auth/weak-password |
| AUTH_USER_DISABLED | auth/user-disabled |
| AUTH_TOO_MANY_REQUESTS | auth/too-many-requests |
| AUTH_NETWORK | auth/network-request-failed |
| AUTH_NOT_CONFIGURED | サーバー秘密情報が未設定 |
| AUTH_UNAUTHENTICATED | Cookie なし / 失効 |
| AUTH_VALIDATION | email/password 欠落 |
| AUTH_INTERNAL | その他 |

## 同期 API

認可: `__session` から UID。他ユーザーの `users/{uid}` は参照不可。

| Method | Path | 役割 |
| --- | --- | --- |
| GET | `/api/sync/state` | クラウド `lastSyncedAt` と他端末差分フラグ |
| POST | `/api/sync/upload` | ローカル payload を Firestore へ反映 |
| POST | `/api/sync/pull` | ローカル index と比較してダウンロード対象を返す |
| POST | `/api/sync/run` | upload のあと pull（現行 `syncUserData` 相当） |

### 対象コレクション（破壊的変更なし）

`users/{uid}/` 配下:

- `memos/{id}` … `MemoRecord`
- `sessions/{id}` … `SessionRecord`
- `themes/{id}` … **user テーマのみ**
- `themeSettings/{id}` … builtin の ON/OFF 上書きのみ
- `syncState/main` … `CloudSyncState`

**同期しない:** `theme_count` / `time_limit`（端末ローカル設定のまま）。

`undefined` フィールドは送らない（`stripUndefinedFields`）。`null`（`endedAt`）は残す。

### リクエスト / レスポンス型

- upload body: `SyncPayload`
- pull body: `SyncPullIndex`（id + `updatedAt` または session の `endedAt`）
- run body: `SyncPayload` + `SyncPullIndex`（同一ローカルスナップショットから作る）
- state data: `SyncStateData`
- upload data: `SyncUploadData`
- pull / run data: `SyncPullData`（適用すべきレコード + `deletedThemeSettingIds`）

型: `src/types/sync.ts`。

### 競合解決（199-09/10 で `conflictPolicy` を使う）

現行クライアントは同タイムスタンプを no-op にしている。API 契約では **未確定時はサーバー優先** に揃える。

| 対象 | 規則 |
| --- | --- |
| memos / user themes / themeSettings | `updatedAt` が新しい方。欠落・同値は **remote** |
| sessions（`updatedAt` なし・スキーマ変更しない） | 完了（`endedAt != null`）が未完了に勝つ。両方完了または両方未完了は **remote** |
| builtin をデフォルトに戻した themeSettings | リモート文書を削除（`deletedThemeSettingIds`） |

実装関数: `winnerByUpdatedAt` / `winnerForSession`。

### 同期エラーコード

`src/lib/sync/errorContract.ts`

| code | 意味 |
| --- | --- |
| SYNC_UNAUTHENTICATED | 未ログイン |
| SYNC_NOT_CONFIGURED | Admin / Firestore 未設定 |
| SYNC_PERMISSION | permission-denied |
| SYNC_UNAVAILABLE | unavailable / deadline-exceeded |
| SYNC_VALIDATION | body 不正 |
| SYNC_INTERNAL | その他 |

部分失敗（バッチの一部）は `success: true` のまま `uploadFailures` / `downloadFailures` で返す（現行 UI と同じ）。

## サーバー環境変数（199-02 で配線）

クライアント公開（既存）:

- `NEXT_PUBLIC_FIREBASE_*`

サーバー専用（リポジトリにコミットしない）:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

クライアント SDK の Auth 永続化（IndexedDB）は API 移行後に廃止する。セッション復元は `GET /api/auth/session`。

## 非スコープ（親チケットどおり）

- Firestore データモデルの破壊的変更
- Google / GitHub 等の追加プロバイダ
- 自動同期・リアルタイム同期
