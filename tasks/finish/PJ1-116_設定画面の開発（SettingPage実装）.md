## Task 4-1: SettingPage の画面骨組みを作成する（詳細）

### Sub-task 4-1-1: 対象ファイル/ルートを確認する

- `src/app/(authenticated)/setting/page.tsx` を対象とする
- `(authenticated)` グループのルーティングが期待通りか確認する（/setting で到達）

### Sub-task 4-1-2: ページの基本レイアウトを実装する

- コンテナ（max 幅/余白/背景）を設計する
- カード枠（shadow/rounded/border）を設計する
- レスポンシブで 1 カラム → 2 カラム（例: 1/3 + 2/3）を構成する

### Sub-task 4-1-3: ヘッダー（タイトル＋閉じる）を実装する

- タイトル: 「設定」
- 右上に `MdOutlineClose` アイコンを配置
- `/` へ遷移する Link を実装
- a11y: アイコンリンクに aria-label を付与（例: "Close settings"）

### Sub-task 4-1-4: ページ説明文を追加する（任意）

- 例: 「セッションの進め方をカスタマイズできます。」

---

## Task 4-2: useSettings と画面を接続する（詳細）

### Sub-task 4-2-1: Client Component 化の確認

- SettingPage が Client Component であることを確認（useSettings を使うため）
- 必要なら `use client` を追加

### Sub-task 4-2-2: useSettings を呼び出し、状態を取得する

- `{ settings, isLoading, error, updateSettings, resetSettings }` を取得
- resetSettings が無い設計なら updateSettings で初期値に戻す方針にする

### Sub-task 4-2-3: ローディング表示を実装する

- `isLoading === true` のときは `Loader` を表示
- MVP: フォームは出さず Loader のみ（ちらつき防止）

### Sub-task 4-2-4: 初期ロード失敗（error）表示を実装する

- 初期ロード時の error は「フォームを出さず」エラーブロックを表示
- 表示文言例:
  - 「設定の読み込みに失敗しました」
  - 「ページを再読み込みしてください」
- 任意: 再読み込みボタン（window.location.reload）導線を検討

---

## Task 4-3: 入力コンポーネントを配置し、更新 wiring を実装する（詳細）

### Sub-task 4-3-1: InputTargetCount を配置する

- props:
  - value: settings.theme_count（フォールバック値含む）
  - onUpdate: theme_count を updateSettings に渡す

### Sub-task 4-3-2: InputTargetTime を配置する

- props:
  - value: settings.time_limit（フォールバック値含む）
  - onUpdate: time_limit を updateSettings に渡す

### Sub-task 4-3-3: onBlur 更新を “ページ側で catch” できるように実装する

- onUpdate 内で updateSettings を await し、例外を catch する
- catch 時に「上部簡易エラー表示用 state」を更新する（Task 4-6 と接続）
- 成功時はエラー表示をクリアする

### Sub-task 4-3-4: 送信抑止（フォーム submit）を実装する

- `form` を使う場合、onSubmit で preventDefault()
- MVP: submit は使わず、blur 更新のみで完結する設計を維持

---

## Task 4-4: 推定所要時間表示を実装する（詳細）

### Sub-task 4-4-1: 推定所要時間の算出ロジックを決定する

- 計算: `theme_count * Number(time_limit)`
- time_limit が string の場合の NaN ガードを入れる（例: Number(...) || 0）

### Sub-task 4-4-2: 表示フォーマットを実装する

- 表示例:
  - `推定所要時間：600秒（10分）`
  - `（10テーマ × 60秒）` を併記
- 分換算は端数切り上げ/切り捨てルールを決める
  - 推奨: 分は floor、秒も併記して誤差を避ける

### Sub-task 4-4-3: local state 追従（入力中の値反映）を実装する

- Input コンポーネントは local state を持つため、SettingPage 側でも “表示用の現在値” を持つ方針を決める
  - 例: Input に onChange コールバックを追加してページ側 state を更新
  - もしくは MVP は「settings 値に追従」でも可（ただし入力中の追従は弱い）
- 推奨（UX 良）:
  - SettingPage に `draftThemeCount` / `draftTimeLimit` を持ち、
    Input の onChange で更新、onBlur で保存、表示は draft を使用

---

## Task 4-5: 適用ルール注記を表示する（詳細）

### Sub-task 4-5-1: 注記文言を確定する

- 例:
  - 「設定は次回のセッション開始から適用されます。進行中のセッションには反映されません。」

### Sub-task 4-5-2: 注記の表示位置・スタイルを実装する

- 推奨位置: 推定所要時間の下、またはフォームの下部
- 視認性: 小さめのテキスト + 背景薄色（任意）

---

## Task 4-6: “上部に簡易エラー表示” を実装する（詳細）

※MVP 方針の中核

### Sub-task 4-6-1: エラー表示の対象を整理する

- 初期ロード error（Task 4-2-4）は「フォーム非表示のエラー」
- 更新 error（onBlur 失敗）は「フォーム表示のまま上部にエラー」

### Sub-task 4-6-2: 更新エラー用の state を追加する

- 例:
  - `updateErrorMessage: string | null`
  - `updateSuccessMessage: string | null`（任意）
- update 成功時は updateErrorMessage をクリア

### Sub-task 4-6-3: 上部エラーブロック UI を実装する

- 表示条件: updateErrorMessage があるとき
- 文言例:
  - 「更新に失敗しました。もう一度お試しください。」
- 任意:
  - × ボタンで閉じる（dismiss）対応（state クリア）

### Sub-task 4-6-4: updateSettings 呼び出し箇所をエラー state と接続する

- InputTargetCount の onUpdate wrapper で try/catch
- InputTargetTime の onUpdate wrapper で try/catch
- 例外 → updateErrorMessage をセット
- 成功 → updateErrorMessage をクリア

---

## Task 4-7: 初期値に戻す機能を実装する（詳細）

### Sub-task 4-7-1: ボタン配置とラベルを決める

- ボタン文言: 「初期値に戻す」
- 配置: フォーム下部（推奨）、またはヘッダー近く

### Sub-task 4-7-2: クリック時の挙動を実装する

- 方針 A（推奨）: 即時反映
  - `resetSettings()` を呼ぶ（用意されている場合）
  - なければ `updateSettings({ theme_count: 10, time_limit: "60" })`
- 成功時:
  - 入力値が初期値に戻る（settings 更新 or draft 更新）
  - updateErrorMessage をクリア
- 失敗時:
  - フォームは維持し、上部に簡易エラー表示（Task 4-6）

### Sub-task 4-7-3: draft state を採用している場合の整合を取る

- reset 実行時に draftThemeCount/draftTimeLimit も初期値へ同期する
- settings の再フェッチが必要か検討（通常は不要）

---

## Task 4-8: UI 仕上げとアクセシビリティ（詳細）

### Sub-task 4-8-1: レイアウトの最終調整

- モバイル表示での余白・文字サイズ確認
- 2 カラム時のラベルと入力の整列を確認

### Sub-task 4-8-2: a11y の確認

- 閉じるアイコンに aria-label
- 各入力の label と id の対応
- 注記/ヘルプの読み上げ（aria-describedby 任意）

### Sub-task 4-8-3: 見た目の一貫性を確認

- components/ui の Button/Card を使うか、Tailwind 直書きか方針統一
- 既存の UI トーンに合わせる

---

## Task 4-9（推奨追加）: SettingPage のコンポーネントテストを作成する

※Story 6 に回しても良いが、ページ実装と一緒に作ると手戻りが減る

### Sub-task 4-9-1: useSettings をモックする

- 初期表示（loading / success / error）を再現できるようにする

### Sub-task 4-9-2: 初期ロード成功時の表示テスト

- theme_count / time_limit が入力に表示される
- 推定所要時間が表示される
- 注記が表示される

### Sub-task 4-9-3: 更新失敗時の挙動テスト（MVP 要件）

- onBlur 更新が reject された場合でもフォームは残る
- 上部にエラーが表示される

### Sub-task 4-9-4: 初期値に戻すテスト

- reset 実行で値が初期値になり、エラーが消える（成功時）
