// src/app/session/__tests__/SessionPage.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockThemes = Array.from({ length: 10 }, (_, index) => ({
  id: `theme-${index + 1}`,
  title: `theme ${index + 1}`,
  category: 'general',
  isActive: true,
  source: 'builtin' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}));

// vi.mock の hoisting を考慮して、factory 内で定義
vi.mock("@/lib/utils/selectRandomThemes", () => {
  const mockPickRandomActiveThemes = vi.fn(async (count = 10) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `theme-${index + 1}`,
      title: `theme ${index + 1}`,
      category: 'general',
      isActive: true,
      source: 'builtin' as const,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    })).slice(0, count)
  );
  return {
    pickRandomActiveThemes: mockPickRandomActiveThemes,
  };
});

const mockPush = vi.fn();
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({ push: mockPush }),
  };
});

let lastOnFinish: (() => void) | undefined;
const startMock = vi.fn();
const resetMock = vi.fn();

vi.mock("@/lib/timer/useCountdown", () => {
  return {
    useCountdown: ({
      initialSeconds,
      onFinish,
    }: {
      initialSeconds: number;
      autoStart?: boolean;
      onFinish?: () => void;
    }) => {
      lastOnFinish = onFinish;
      return {
        secondsLeft: initialSeconds,
        isRunning: true,
        start: startMock,
        reset: resetMock,
      };
    },
  };
});

function callLastOnFinish() {
  if (lastOnFinish) lastOnFinish();
}

vi.mock("@/lib/db/sessionsRepo", () => {
  const createSession = vi.fn(async (themeIds: string[]) => ({
    id: "session-1",
    themeIds,
    startedAt: "2025-01-01T00:00:00.000Z",
    endedAt: null,
    memoCount: 0,
  }));

  const completeSession = vi.fn(async () => {});

  return { createSession, completeSession };
});

vi.mock("@/lib/db/memosRepo", () => {
  const saveMemo = vi.fn(async (memo) => ({
    ...memo,
    id: memo.id ?? "memo-mocked-id",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }));

  const getMemosBySession = vi.fn(async (sessionId: string) => {
    // saveMemoが何回呼ばれたかに基づいてメモ数を返す
    const saveCallCount = (saveMemo as unknown as Mock).mock.calls.length;
    return Array.from({ length: saveCallCount }, (_, i) => ({
      id: `memo-${i + 1}`,
      sessionId,
      themeId: `theme-${i + 1}`,
      order: i + 1,
      textContent: `memo ${i + 1}`,
      handwritingType: "none" as const,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    }));
  });

  return { saveMemo, getMemosBySession };
});

// settingsRepo をモック
const mockGetSettings = vi.fn();
vi.mock("@/lib/db/settingsRepo", () => {
  return {
    getSettings: () => mockGetSettings(),
  };
});

vi.mock("@/components/session/HandwritingCanvas", () => {
  const HandwritingCanvas = ({
    onChange,
  }: {
    onChange?: (dataUrl: string | null) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange?.("data:image/png;base64,handwriting")}
    >
      手書き入力
    </button>
  );

  return { HandwritingCanvas };
});

import SessionPage from "../page";
import * as sessionsRepo from "@/lib/db/sessionsRepo";
import * as memosRepo from "@/lib/db/memosRepo";
import type { SettingsRecord } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

describe("/session page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト設定をモック
    const defaultSettings: SettingsRecord = {
      id: "default",
      ...DEFAULT_SETTINGS,
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    mockGetSettings.mockResolvedValue(defaultSettings);
  });

  it("creates a session and saves a memo when moving to the next theme", async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    // セッションはまだ作成されていない（最初のメモ保存時に作成される）
    expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

    const textarea = screen.getByRole("textbox");
    const nextButton = screen.getByRole("button", { name: /次へ/ });
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "first memo" } });
      fireEvent.click(nextButton);
    });

    // 最初のメモ保存時にセッションが作成される
    await waitFor(() => {
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });
    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];

    expect(savedArg.sessionId).toBe("session-1");
    expect(savedArg.order).toBe(1);
    expect(savedArg.textContent).toBe("first memo");

    await waitFor(() => {
      expect(screen.getByText("2 / 10")).toBeInTheDocument();
    });
  });

  it("saves text input memo with no handwriting data", async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox");
    const nextButton = screen.getByRole("button", { name: /次へ/ });

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "text only memo" } });
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });

    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];
    expect(savedArg.textContent).toBe("text only memo");
    expect(savedArg.handwritingType).toBe("none");
    expect(savedArg.handwritingDataUrl).toBeUndefined();
  });

  it("saves handwriting input data when provided", async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    const handwritingButton = screen.getByRole("button", {
      name: "手書き入力",
    });
    const nextButton = screen.getByRole("button", { name: /次へ/ });

    await act(async () => {
      fireEvent.click(handwritingButton);
    });
    await act(async () => {});
    await act(async () => {
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });

    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];
    expect(savedArg.handwritingType).toBe("dataUrl");
    expect(savedArg.handwritingDataUrl).toBe(
      "data:image/png;base64,handwriting"
    );
  });

  it("completes the session after 10 memos and navigates to complete page", async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    // セッションはまだ作成されていない（最初のメモ保存時に作成される）
    expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

    const textarea = screen.getByRole("textbox");
    const nextButton = screen.getByRole("button", { name: /次へ/ });

    for (let i = 1; i <= 10; i += 1) {
      await act(async () => {
        fireEvent.change(textarea, { target: { value: `memo ${i}` } });
        fireEvent.click(nextButton);
      });

      if (i < 10) {
        await waitFor(() => {
          expect(screen.getByText(`${i + 1} / 10`)).toBeInTheDocument();
        });
      }
    }

    // 最後のメモ保存を待つ
    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(10);
    });

    // 最初のメモ保存時にセッションが作成されることを確認
    await waitFor(() => {
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
    });

    // セッション完了処理を待つ
    await waitFor(() => {
      expect(sessionsRepo.completeSession).toHaveBeenCalledTimes(1);
    });

    const [sessionIdArg, memoCountArg] = (
      sessionsRepo.completeSession as unknown as Mock
    ).mock.calls[0];
    expect(sessionIdArg).toBe("session-1");
    expect(memoCountArg).toBe(10);

    // router.pushの呼び出しを確認
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/session/complete?sessionId=session-1"
      );
    });
  });

  it("saves memo when timer finishes automatically", async () => {
    await act(async () => {
      render(<SessionPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    // セッションはまだ作成されていない
    expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

    const textarea = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "auto-finished memo" } });
    });

    await act(async () => {
      callLastOnFinish();
    });

    // 最初のメモ保存時にセッションが作成される
    await waitFor(() => {
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(memosRepo.saveMemo).toHaveBeenCalledTimes(1);
    });

    const savedArg = (memosRepo.saveMemo as unknown as Mock).mock.calls[0][0];
    expect(savedArg.textContent).toBe("auto-finished memo");

    await waitFor(() => {
      expect(screen.getByText("2 / 10")).toBeInTheDocument();
    });
  });

  describe("settings integration", () => {
    it("uses theme_count from settings for theme selection", async () => {
      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 3,
        time_limit: "60",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };
      mockGetSettings.mockResolvedValue(customSettings);

      await act(async () => {
        render(<SessionPage />);
      });

      await waitFor(() => {
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
      });

      // セッションはまだ作成されていない（最初のメモ保存時に作成される）
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

      // pickRandomActiveThemes が theme_count=3 で呼ばれることを確認
      const { pickRandomActiveThemes } = await import("@/lib/utils/selectRandomThemes");
      expect(pickRandomActiveThemes).toHaveBeenCalledWith(3);
    });

    it("uses time_limit from settings for useCountdown initialSeconds", async () => {
      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "30",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };
      mockGetSettings.mockResolvedValue(customSettings);

      await act(async () => {
        render(<SessionPage />);
      });

      await waitFor(() => {
        expect(screen.getByText("1 / 10")).toBeInTheDocument();
      });

      // セッションはまだ作成されていない（最初のメモ保存時に作成される）
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

      // useCountdown が initialSeconds=30 で呼ばれることを確認
      // resetMock が 30 で呼ばれることを確認（初期化時に reset が呼ばれる）
      expect(resetMock).toHaveBeenCalledWith(30);
    });

    it("falls back to default values when getSettings fails", async () => {
      mockGetSettings.mockRejectedValue(new Error("Failed to load settings"));

      await act(async () => {
        render(<SessionPage />);
      });

      await waitFor(() => {
        expect(screen.getByText("1 / 10")).toBeInTheDocument();
      });

      // セッションはまだ作成されていない（最初のメモ保存時に作成される）
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

      // デフォルト値（10テーマ、60秒）で進行できることを確認
      const { pickRandomActiveThemes } = await import("@/lib/utils/selectRandomThemes");
      expect(pickRandomActiveThemes).toHaveBeenCalledWith(10);
      expect(resetMock).toHaveBeenCalledWith(60);
    });

    it("completes session after theme_count memos when using custom theme_count", async () => {
      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 3,
        time_limit: "60",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };
      mockGetSettings.mockResolvedValue(customSettings);

      await act(async () => {
        render(<SessionPage />);
      });

      await waitFor(() => {
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
      });

      // セッションはまだ作成されていない（最初のメモ保存時に作成される）
      expect(sessionsRepo.createSession).toHaveBeenCalledTimes(0);

      const textarea = screen.getByRole("textbox");
      const nextButton = screen.getByRole("button", { name: /次へ/ });

      // 3回進める
      for (let i = 1; i <= 3; i += 1) {
        await act(async () => {
          fireEvent.change(textarea, { target: { value: `memo ${i}` } });
          fireEvent.click(nextButton);
        });

        if (i < 3) {
          await waitFor(() => {
            expect(screen.getByText(`${i + 1} / 3`)).toBeInTheDocument();
          });
        }
      }

      // 3回目のメモ保存を待つ
      await waitFor(() => {
        expect(memosRepo.saveMemo).toHaveBeenCalledTimes(3);
      });

      // 最初のメモ保存時にセッションが作成されることを確認
      await waitFor(() => {
        expect(sessionsRepo.createSession).toHaveBeenCalledTimes(1);
      });

      // セッション完了処理を待つ
      await waitFor(() => {
        expect(sessionsRepo.completeSession).toHaveBeenCalledTimes(1);
      });

      // router.pushの呼び出しを確認
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/session/complete?sessionId=session-1"
        );
      });
    });
  });
});
