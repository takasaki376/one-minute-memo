# 手書き集中モード 手動確認チェックリスト (Handwriting Focus Mode Manual Checklist)

## 対象範囲 (Scope)
- `/session` 分割モード (split mode)
- `/session` 手書き集中モード (handwritingFocus mode)
- `/session/complete`
- `/history`
- `/history/[id]`

## チェック項目 (Checklist)

### 1) モード切り替え (Mode switch)
- [ ] md 以上の画面幅でモード切り替え UI が表示されている (Mode switch UI is visible on md+).
- [ ] `split` から `handwritingFocus` に切り替えできる (Can switch `split` -> `handwritingFocus`).
- [ ] `handwritingFocus` から `split` に切り替えできる (Can switch `handwritingFocus` -> `split`).
- [ ] 切り替え時にレイアウト崩れが発生しない (No layout break occurs during switching).

### 2) 状態保持 (State retention)
- [ ] モード切り替え後もキャンバス上の描画が保持されている (Canvas drawing remains after mode switch).
- [ ] モード切り替え後もテキスト入力内容が保持されている (Text input remains after mode switch).
- [ ] モード切り替え後もタイマー状態（動作中／残り秒数）が保持されている (Timer state (running/seconds left) remains after mode switch).

### 3) 集中モードのテキストオーバーレイ (Focus mode text overlay)
- [ ] 集中モードでテキストオーバーレイが開く (Text overlay opens in focus mode).
- [ ] 閉じて再度開いた後も入力済みテキストが保持されている (Typed text remains after close and reopen).
- [ ] オーバーレイ表示中はキャンバスへの誤タップ／誤操作が防止されている (Overlay blocks accidental canvas interactions while open).
- [ ] 閉じるボタンおよび背景クリックの両方でオーバーレイを閉じられる (Overlay can be closed from close button and backdrop).

### 4) セッション遷移フロー (Session flow)
- [ ] 分割モードで「次のテーマ」操作が機能する (Next theme action works in split mode).
- [ ] 集中モードで「次のテーマ」操作が機能する (Next theme action works in focus mode).
- [ ] タイマー終了時の自動遷移が引き続き機能している (Timer finish auto-advance still works).
- [ ] 最後のテーマ終了後に `/session/complete` へ遷移する (Last theme transitions to `/session/complete`).

### 5) 履歴の整合性 (History integrity)
- [ ] 完了したセッションが `/history` に表示される (Completed session appears in `/history`).
- [ ] `/history/[id]` でテキストと手書き内容の両方が確認できる (Text and handwriting are visible in `/history/[id]`).

### 6) レスポンシブ動作 (Responsive behavior)
- [ ] md 未満の画面幅では集中モード UI が露出しない (On md- screens, focus mode UI is not exposed).
- [ ] md 以上の画面幅ではキャンバスが主領域として維持される (On md+ screens, focus layout keeps canvas dominant).
