"use client";

import { useEffect, useState, useCallback } from "react";
import { getSettings, updateSettings, resetSettings } from "@/lib/db/settingsRepo";
import type { SettingsRecord } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

export interface UseSettingsResult {
  settings: SettingsRecord;
  isLoading: boolean;
  error: string | null;
  updateSettings: (patch: Partial<Omit<SettingsRecord, "id" | "updatedAt">>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

/**
 * 設定を管理するカスタムフック
 *
 * @returns 設定データ、ローディング状態、エラー、更新関数
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初回ロード処理
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getSettings();
        if (!isMounted) return;
        setSettings(data);
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        const errorMessage =
          err instanceof Error ? err.message : "設定の読み込みに失敗しました";
        setError(errorMessage);
        setIsLoading(false);
        console.error("Failed to load settings:", err);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // 設定を部分更新する
  const handleUpdateSettings = useCallback(
    async (patch: Partial<Omit<SettingsRecord, "id" | "updatedAt">>) => {
      try {
        setError(null);
        const updated = await updateSettings(patch);
        setSettings(updated);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "設定の更新に失敗しました";
        setError(errorMessage);
        console.error("Failed to update settings:", err);
        throw err; // 呼び出し側でエラーハンドリングできるように再スロー
      }
    },
    []
  );

  // 設定を初期値に戻す
  const handleResetSettings = useCallback(async () => {
    try {
      setError(null);
      const reset = await resetSettings();
      setSettings(reset);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "設定のリセットに失敗しました";
      setError(errorMessage);
      console.error("Failed to reset settings:", err);
      throw err; // 呼び出し側でエラーハンドリングできるように再スロー
    }
  }, []);

  // settingsがnullの場合はデフォルト値を返す（型安全性のため）
  // 実際にはgetSettingsが常に値を返すため、nullになることはないが、
  // 初回レンダリング時やエラー時の型安全性を確保
  const safeSettings: SettingsRecord = settings ?? {
    id: "default",
    ...DEFAULT_SETTINGS,
    updatedAt: new Date().toISOString(),
  };

  return {
    settings: safeSettings,
    isLoading,
    error,
    updateSettings: handleUpdateSettings,
    resetSettings: handleResetSettings,
  };
}
