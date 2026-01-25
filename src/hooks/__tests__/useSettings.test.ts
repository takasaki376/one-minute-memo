import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SettingsRecord } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// settingsRepo をモック
const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockResetSettings = vi.fn();

vi.mock("@/lib/db/settingsRepo", () => {
  return {
    getSettings: () => mockGetSettings(),
    updateSettings: (patch: Partial<Omit<SettingsRecord, "id" | "updatedAt">>) =>
      mockUpdateSettings(patch),
    resetSettings: () => mockResetSettings(),
  };
});

// モック定義の後で useSettings をインポート
import { useSettings } from "../useSettings";

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial load", () => {
    it("loads settings successfully and sets isLoading to false", async () => {
      const mockSettings: SettingsRecord = {
        id: "default",
        theme_count: 15,
        time_limit: "90",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      mockGetSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings());

      // 初期状態: isLoading は true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.settings).toEqual({
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: expect.any(String),
      });

      // ロード完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
      expect(mockGetSettings).toHaveBeenCalledTimes(1);
    });

    it("handles load failure and sets error", async () => {
      const errorMessage = "Failed to load settings";
      mockGetSettings.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSettings());

      // 初期状態
      expect(result.current.isLoading).toBe(true);

      // ロード完了を待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.settings).toEqual({
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: expect.any(String),
      });
    });
  });

  describe("updateSettings", () => {
    it("updates settings successfully", async () => {
      const initialSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      const updatedSettings: SettingsRecord = {
        id: "default",
        theme_count: 20,
        time_limit: "60",
        updatedAt: "2025-01-10T10:00:00.000Z",
      };

      mockGetSettings.mockResolvedValue(initialSettings);
      mockUpdateSettings.mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 更新実行
      await act(async () => {
        await result.current.updateSettings({ theme_count: 20 });
      });

      expect(result.current.settings).toEqual(updatedSettings);
      expect(result.current.error).toBeNull();
      expect(mockUpdateSettings).toHaveBeenCalledWith({ theme_count: 20 });
    });

    it("handles update failure and sets error", async () => {
      const initialSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      const errorMessage = "Failed to update settings";
      mockGetSettings.mockResolvedValue(initialSettings);
      mockUpdateSettings.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 更新実行（エラーが発生する）
      await act(async () => {
        await expect(
          result.current.updateSettings({ theme_count: 20 })
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
      // settings は直前値のまま（フォーム維持方針）
      expect(result.current.settings).toEqual(initialSettings);
    });
  });

  describe("resetSettings", () => {
    it("resets settings to default values", async () => {
      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 50,
        time_limit: "300",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      const defaultSettings: SettingsRecord = {
        id: "default",
        theme_count: DEFAULT_SETTINGS.theme_count,
        time_limit: DEFAULT_SETTINGS.time_limit,
        updatedAt: "2025-01-10T10:00:00.000Z",
      };

      mockGetSettings.mockResolvedValue(customSettings);
      mockResetSettings.mockResolvedValue(defaultSettings);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // リセット実行
      await act(async () => {
        await result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(defaultSettings);
      expect(result.current.error).toBeNull();
      expect(mockResetSettings).toHaveBeenCalledTimes(1);
    });

    it("handles reset failure and sets error", async () => {
      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 50,
        time_limit: "300",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      const errorMessage = "Failed to reset settings";
      mockGetSettings.mockResolvedValue(customSettings);
      mockResetSettings.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // リセット実行（エラーが発生する）
      await act(async () => {
        await expect(result.current.resetSettings()).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
      // settings は直前値のまま
      expect(result.current.settings).toEqual(customSettings);
    });
  });

  describe("error clearing", () => {
    it("clears error on successful update after failure", async () => {
      const initialSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      const updatedSettings: SettingsRecord = {
        id: "default",
        theme_count: 20,
        time_limit: "60",
        updatedAt: "2025-01-10T10:00:00.000Z",
      };

      mockGetSettings.mockResolvedValue(initialSettings);
      mockUpdateSettings
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValueOnce(updatedSettings);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 最初の更新（失敗）
      await act(async () => {
        await expect(
          result.current.updateSettings({ theme_count: 20 })
        ).rejects.toThrow("First failure");
      });

      await waitFor(() => {
        expect(result.current.error).toBe("First failure");
      });

      // 2回目の更新（成功）
      await act(async () => {
        await result.current.updateSettings({ theme_count: 20 });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.settings).toEqual(updatedSettings);
      });
    });
  });
});
