import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import SettingPage from "../page";
import type { SettingsRecord } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// useSettings をモック
const mockSettings: SettingsRecord = {
  id: "default",
  theme_count: 15,
  time_limit: "90",
  updatedAt: "2025-01-10T09:00:00.000Z",
};

const mockUseSettings = vi.fn();

vi.mock("@/hooks/useSettings", () => {
  return {
    useSettings: () => mockUseSettings(),
  };
});

describe("SettingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("displays loading message when isLoading is true", () => {
      mockUseSettings.mockReturnValue({
        settings: {
          id: "default",
          theme_count: 10,
          time_limit: "60",
          updatedAt: new Date().toISOString(),
        },
        isLoading: true,
        error: null,
        updateSettings: vi.fn(),
        resetSettings: vi.fn(),
      });

      render(<SettingPage />);

      expect(screen.getByText("設定を読み込んでいます...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("displays error message when initial load fails", () => {
      const errorMessage = "設定の読み込みに失敗しました";
      mockUseSettings.mockReturnValue({
        settings: {
          id: "default",
          theme_count: 10,
          time_limit: "60",
          updatedAt: new Date().toISOString(),
        },
        isLoading: false,
        error: errorMessage,
        updateSettings: vi.fn(),
        resetSettings: vi.fn(),
      });

      render(<SettingPage />);

      // エラーメッセージは複数箇所に表示される可能性があるため、getAllByTextを使用
      const errorMessages = screen.getAllByText("設定の読み込みに失敗しました");
      expect(errorMessages.length).toBeGreaterThan(0);
      const errorDetailMessages = screen.getAllByText(errorMessage);
      expect(errorDetailMessages.length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "ページを再読み込み" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "トップへ戻る" })).toBeInTheDocument();
    });
  });

  describe("normal display", () => {
    beforeEach(() => {
      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: vi.fn().mockResolvedValue(mockSettings),
        resetSettings: vi.fn().mockResolvedValue({
          id: "default",
          ...DEFAULT_SETTINGS,
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    it("displays settings values in input fields", () => {
      render(<SettingPage />);

      const themeCountInput = screen.getByLabelText("テーマ件数");
      const timeLimitInput = screen.getByLabelText("入力する時間");

      expect(themeCountInput).toHaveValue(15);
      expect(timeLimitInput).toHaveValue(90);
    });

    it("displays estimated time", () => {
      render(<SettingPage />);

      // 推定所要時間: 15 * 90 = 1350秒 = 22分30秒
      expect(screen.getByText("1350 秒")).toBeInTheDocument();
      expect(screen.getByText("（22 分 30 秒）")).toBeInTheDocument();
      expect(screen.getByText("15 テーマ × 90 秒")).toBeInTheDocument();
    });

    it("displays application rule note", () => {
      render(<SettingPage />);

      expect(
        screen.getByText(/設定は次回セッション開始から適用されます/)
      ).toBeInTheDocument();
    });

    it("has close button linking to home", () => {
      render(<SettingPage />);

      // リンクのテキストコンテンツで検索
      const closeButton = screen.getByRole("link", { name: "閉じる" });
      expect(closeButton).toHaveAttribute("href", "/");
    });
  });

  describe("onBlur update", () => {
    it("calls updateSettings on theme_count blur when value changed", async () => {
      const mockUpdateSettings = vi.fn().mockResolvedValue({
        ...mockSettings,
        theme_count: 20,
      });

      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        resetSettings: vi.fn(),
      });

      render(<SettingPage />);

      const themeCountInput = screen.getByLabelText("テーマ件数");

      // 値を変更
      fireEvent.change(themeCountInput, { target: { value: "20" } });
      expect(themeCountInput).toHaveValue(20);

      // blur で更新
      fireEvent.blur(themeCountInput);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({ theme_count: 20 });
      });
    });

    it("calls updateSettings on time_limit blur when value changed", async () => {
      const mockUpdateSettings = vi.fn().mockResolvedValue({
        ...mockSettings,
        time_limit: "120",
      });

      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        resetSettings: vi.fn(),
      });

      render(<SettingPage />);

      const timeLimitInput = screen.getByLabelText("入力する時間");

      // 値を変更
      fireEvent.change(timeLimitInput, { target: { value: "120" } });
      expect(timeLimitInput).toHaveValue(120);

      // blur で更新
      fireEvent.blur(timeLimitInput);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({ time_limit: "120" });
      });
    });

    it("displays update error when updateSettings fails", async () => {
      const errorMessage = "設定の更新に失敗しました";
      const mockUpdateSettings = vi.fn().mockRejectedValue(new Error(errorMessage));

      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        resetSettings: vi.fn(),
      });

      render(<SettingPage />);

      const themeCountInput = screen.getByLabelText("テーマ件数");

      // 値を変更してblur
      fireEvent.change(themeCountInput, { target: { value: "25" } });

      // blurイベントでエラーが発生するが、コンポーネント側でキャッチされる
      // エラーは親側でキャッチされてupdateErrorに設定される
      await act(async () => {
        fireEvent.blur(themeCountInput);
        // エラーが処理されるまで少し待つ
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // フォームは残っている（操作継続可能）
      expect(themeCountInput).toBeInTheDocument();
    });
  });

  describe("reset to default", () => {
    it("calls resetSettings when reset button is clicked", async () => {
      const mockResetSettings = vi.fn().mockResolvedValue({
        id: "default",
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      });

      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: vi.fn(),
        resetSettings: mockResetSettings,
      });

      render(<SettingPage />);

      const resetButton = screen.getByRole("button", { name: "初期値に戻す" });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockResetSettings).toHaveBeenCalledTimes(1);
      });
    });

    it("displays error when resetSettings fails", async () => {
      const errorMessage = "設定のリセットに失敗しました";
      const mockResetSettings = vi.fn().mockRejectedValue(new Error(errorMessage));

      mockUseSettings.mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        error: null,
        updateSettings: vi.fn(),
        resetSettings: mockResetSettings,
      });

      render(<SettingPage />);

      const resetButton = screen.getByRole("button", { name: "初期値に戻す" });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });
});
