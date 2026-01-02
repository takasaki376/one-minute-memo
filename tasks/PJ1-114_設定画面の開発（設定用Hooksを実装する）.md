## Task 2-1: useSettings フックを実装する（詳細）

### Sub-task 2-1-1: useSettings の責務と API を確定する

- useSettings が提供する戻り値を確定する
  - settings: Settings | null（or Settings を常に返す）
  - isLoading: boolean
  - error: string | null（or Error | null）
  - updateSettings: (patch) => Promise<void | Settings>
  - resetSettings: () => Promise<void | Settings>（画面で使うなら追加）
- 呼び出し側（SettingPage）が期待する型と整合させる

### Sub-task 2-1-2: Settings のデフォルト値取り扱い方針を決める

- getSettings が常にデフォルトを返す設計なら、useSettings は null を返さない方針にする
- UI が `settings?.theme_count` のような null 許容で書かれている場合は現状踏襲する
- 推奨：useSettings は **必ず Settings を返す**（未読込は isLoading で表現）

### Sub-task 2-1-3: フックファイルを作成する

- 例: `src/hooks/useSettings.ts`（既存の配置があるならそこに合わせる）
- `use client` の要否確認（Client Component で使うため基本必要）

### Sub-task 2-1-4: 初回ロード処理（読み込み）を実装する

- `useEffect` で `settingsRepo.getSettings()` を呼ぶ
- 成功時：
  - `settings` を set
  - `error` をクリア
  - `isLoading` を false
- 失敗時：
  - `error` を set
  - `isLoading` を false
- cleanup で unmount 後の setState を防ぐ（isMounted フラグ等）

### Sub-task 2-1-5: updateSettings（部分更新）を実装する

- `settingsRepo.updateSettings(patch)` を呼ぶ
- 成功時：
  - 返ってきた settings で state を更新
  - error をクリア
- 失敗時：
  - error を set（画面表示用）
- 連打対策：
  - 同時更新中フラグ（isUpdating）を追加するか検討（MVP は不要でもよい）

### Sub-task 2-1-6: resetSettings を実装する（採用する場合）

- `settingsRepo.resetSettings()` を呼ぶ
- 成功時：
  - state をデフォルトに更新
  - error をクリア
- 失敗時：
  - error を set

### Sub-task 2-1-7: onBlur 更新と整合するように「更新最小化」を設計する

- 画面側が onBlur で差分更新する前提なので、useSettings 側は「渡された patch を信じて更新」で OK
- ただし updateSettings 内で「同値更新」を弾くか検討
  - 例: patch が現在値と同じなら repo を呼ばず return
- どこで差分判定するか方針統一（Input 側 or hook 側）

### Sub-task 2-1-8: エラー表現を統一する

- error 型を `string` に寄せるか `Error` に寄せるか決める
- 画面表示用の `errorMessage` を生成する（例：unknown を string 化）
- console.error の方針（開発中のみ出す等）を決める

### Sub-task 2-1-9: 型・lint を通す

- `no-explicit-any` 回避（unknown → Error 変換）
- ESLint / TypeScript の警告を解消する

---

## Task 2-2: ローディング・エラーハンドリングを整備する（詳細）

### Sub-task 2-2-1: ローディングの表示責務を決める

- Loader は useSettings が返す `isLoading` を見て SettingPage が表示する方針（既存設計通り）
- useSettings 自体は UI を持たない（hook は状態だけ返す）

### Sub-task 2-2-2: Loader コンポーネントの仕様を確認する

- `Loader` の props（サイズ、文言、中央寄せ等）を確認
- SettingPage で望ましい表示（カード内か全画面か）を決める

### Sub-task 2-2-3: エラー表示文言の仕様を確定する

- 文言案（例）
  - 「設定の読み込みに失敗しました」
  - 「もう一度お試しください」
- 画面内に再試行導線を置くか検討
  - 例: 「再読み込み」ボタン（任意だが有用）

### Sub-task 2-2-4: 再試行（retry）を実装するか決める（任意）

- 実装する場合：
  - useSettings に `reload()` を追加
  - SettingPage のエラー表示に「再読み込み」ボタンを追加
- 実装しない場合：
  - リロードはブラウザ更新に委ねる（MVP）

### Sub-task 2-2-5: 取得エラーと更新エラーの扱いを分ける

- 初期ロード失敗：
  - 入力フォームを出さず、エラー画面にする（既存設計）
- 更新失敗（onBlur）：
  - フォームは維持しつつ、画面上に軽いエラー表示（トースト or 文言）を検討
  - MVP：画面上部に赤いテキストで表示でも可

### Sub-task 2-2-6: 状態遷移の確認（ローディング → 成功/失敗）

- ローディング表示がチラつかないか確認
- error が出た後、成功したら error が消えることを確認

---

## Task 2-3（推奨追加）: useSettings の単体テストを実装する

※Story 6 でまとめても良いが、hook 実装と同時に作ると手戻りが減る

### Sub-task 2-3-1: settingsRepo のモック方針を決める

- `vi.mock('@/lib/db/settingsRepo')` で get/update/reset を差し替える

### Sub-task 2-3-2: 初回ロード成功のテスト

- 初回に isLoading=true → settings がセットされる → isLoading=false

### Sub-task 2-3-3: 初回ロード失敗のテスト

- getSettings が reject → error がセットされる → isLoading=false

### Sub-task 2-3-4: updateSettings 成功/失敗のテスト

- patch 反映後に settings が更新される
- 失敗時に error がセットされる

### Sub-task 2-3-5: resetSettings 成功/失敗のテスト（採用時）

- reset で default が反映される
- 失敗時に error がセットされる
