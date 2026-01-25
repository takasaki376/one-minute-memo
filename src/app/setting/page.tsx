"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * 設定画面
 * セッションの進め方をカスタマイズできます。
 */
export default function SettingPage() {
  // TODO: useSettings フックを実装後に連携
  // const { settings, isLoading, error, updateSettings, resetSettings } = useSettings();
  
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  
  // プレースホルダー: 後でuseSettingsから取得
  const [localThemeCount, setLocalThemeCount] = useState(10);
  const [localTimeLimit, setLocalTimeLimit] = useState(60);

  // 推定所要時間の計算（秒）
  const estimatedSeconds = localThemeCount * localTimeLimit;
  // 分換算
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const remainingSeconds = estimatedSeconds % 60;

  const handleReset = () => {
    // TODO: resetSettings() を呼び出す
    setLocalThemeCount(10);
    setLocalTimeLimit(60);
  };

  // ローディング表示
  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              設定を読み込んでいます...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // エラー表示
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            設定の読み込みに失敗しました
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              size="sm"
            >
              ページを再読み込み
            </Button>
            <Button href="/" variant="secondary" size="sm">
              トップへ戻る
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          設定
        </h1>
        <Button
          href="/"
          variant="ghost"
          size="sm"
          aria-label="設定を閉じる"
        >
          {/* TODO: MdOutlineClose アイコンを追加 */}
          閉じる
        </Button>
      </div>

      {/* 説明文 */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
        セッションの進め方をカスタマイズできます。
      </p>

      {/* 設定フォーム */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: 入力フォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* テーマ件数設定 */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              セッション設定
            </h2>
            
            <div className="space-y-6">
              {/* テーマ件数 */}
              <div>
                <label
                  htmlFor="theme-count"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  テーマ件数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="theme-count"
                    type="number"
                    min={1}
                    max={100}
                    value={localThemeCount}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(value)) {
                        const clamped = Math.max(1, Math.min(100, value));
                        setLocalThemeCount(clamped);
                      }
                    }}
                    onBlur={(e) => {
                      // TODO: updateSettings({ theme_count: localThemeCount }) を呼び出す
                      const value = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(value)) {
                        const clamped = Math.max(1, Math.min(100, value));
                        setLocalThemeCount(clamped);
                      }
                    }}
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    件
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  1セッションあたりのテーマの出題数を設定します（1〜100件）
                </p>
              </div>

              {/* 入力時間 */}
              <div>
                <label
                  htmlFor="time-limit"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  入力する時間
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="time-limit"
                    type="number"
                    min={1}
                    max={3600}
                    value={localTimeLimit}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(value)) {
                        const clamped = Math.max(1, Math.min(3600, value));
                        setLocalTimeLimit(clamped);
                      }
                    }}
                    onBlur={(e) => {
                      // TODO: updateSettings({ time_limit: localTimeLimit.toString() }) を呼び出す
                      const value = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(value)) {
                        const clamped = Math.max(1, Math.min(3600, value));
                        setLocalTimeLimit(clamped);
                      }
                    }}
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    秒
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  1テーマあたりの制限時間を設定します（1〜3600秒）
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* 右カラム: 情報表示 */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm sticky top-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              推定所要時間
            </h3>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {estimatedSeconds} 秒
              </p>
              {estimatedMinutes > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  （{estimatedMinutes} 分
                  {remainingSeconds > 0 && ` ${remainingSeconds} 秒`}）
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {localThemeCount} テーマ × {localTimeLimit} 秒
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                fullWidth
              >
                初期値に戻す
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 適用ルール注記 */}
      <div className="mt-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ⓘ 設定は次回セッション開始から適用されます。現在進行中のセッションには影響しません。
        </p>
      </div>
    </main>
  );
}
