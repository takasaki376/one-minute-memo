"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { InputTargetCount } from "@/components/setting/InputTargetCount";
import { InputTargetTime } from "@/components/setting/InputTargetTime";

/**
 * 設定画面
 * セッションの進め方をカスタマイズできます。
 */
export default function SettingPage() {
  const { settings, isLoading, error, updateSettings, resetSettings } = useSettings();
  const [updateError, setUpdateError] = useState<string | null>(null);

  // 推定所要時間の計算（秒）
  const themeCount = settings.theme_count;
  const timeLimit = Number.parseInt(settings.time_limit, 10);
  const estimatedSeconds = themeCount * timeLimit;
  // 分換算
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const remainingSeconds = estimatedSeconds % 60;

  // テーマ件数の更新ハンドラ
  const handleThemeCountUpdate = async (count: number) => {
    try {
      setUpdateError(null);
      await updateSettings({ theme_count: count });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "設定の更新に失敗しました";
      setUpdateError(errorMessage);
      // エラーはコンポーネント側でキャッチされるため、再throwしない
    }
  };

  // 入力時間の更新ハンドラ
  const handleTimeLimitUpdate = async (time: string) => {
    try {
      setUpdateError(null);
      await updateSettings({ time_limit: time });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "設定の更新に失敗しました";
      setUpdateError(errorMessage);
      // エラーはコンポーネント側でキャッチされるため、再throwしない
    }
  };

  // resetSettingsが呼ばれたときのハンドラ
  const handleResetInternal = async () => {
    try {
      setUpdateError(null);
      await resetSettings();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "設定のリセットに失敗しました");
    }
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
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
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
        <Button href="/" variant="ghost" size="sm">
          {/* TODO: MdOutlineClose アイコンを追加 */}
          閉じる
        </Button>
      </div>

      {/* 説明文 */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
        セッションの進め方をカスタマイズできます。
      </p>

      {/* 更新エラー表示（初期ロードエラーとは別） */}
      {updateError && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{updateError}</p>
        </div>
      )}

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
              <InputTargetCount
                value={settings.theme_count}
                onUpdate={handleThemeCountUpdate}
                min={1}
                max={100}
                id="theme-count"
                disabled={isLoading}
                description="1セッションあたりのテーマの出題数を設定します（1〜100件）"
              />

              {/* 入力時間 */}
              <InputTargetTime
                value={settings.time_limit}
                onUpdate={handleTimeLimitUpdate}
                min={1}
                max={3600}
                id="time-limit"
                disabled={isLoading}
                description="1テーマあたりの制限時間を設定します（1〜3600秒）"
              />
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
                {themeCount} テーマ × {timeLimit} 秒
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={handleResetInternal}
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
          ⓘ
          設定は次回セッション開始から適用されます。現在進行中のセッションには影響しません。
        </p>
      </div>
    </main>
  );
}
