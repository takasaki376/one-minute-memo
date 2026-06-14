import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateSession = vi.fn();
const mockCompleteSession = vi.fn();
const mockSaveMemo = vi.fn();
const mockGetMemosBySession = vi.fn();

vi.mock("@/lib/db/sessionsRepo", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  completeSession: (...args: unknown[]) => mockCompleteSession(...args),
}));

vi.mock("@/lib/db/memosRepo", () => ({
  saveMemo: (...args: unknown[]) => mockSaveMemo(...args),
  getMemosBySession: (...args: unknown[]) => mockGetMemosBySession(...args),
}));

import {
  type SessionTheme,
  type UseSessionFlowOptions,
  useSessionFlow,
} from "../useSessionFlow";

const themes: SessionTheme[] = [
  { id: "theme-1", title: "Theme 1" },
  { id: "theme-2", title: "Theme 2" },
];

function createOptions(
  overrides: Partial<UseSessionFlowOptions> = {},
): UseSessionFlowOptions {
  return {
    themes,
    currentIndex: 0,
    currentTheme: themes[0] ?? null,
    text: "memo text",
    handwritingDataUrl: null,
    secondsPerTheme: 60,
    resetTimer: vi.fn(),
    startTimer: vi.fn(),
    onAdvanceToNextTheme: vi.fn(),
    onSessionCompleted: vi.fn(),
    ...overrides,
  };
}

describe("useSessionFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue({
      id: "session-1",
      themeIds: themes.map((t) => t.id),
      startedAt: "2025-01-01T00:00:00.000Z",
      endedAt: null,
      memoCount: 0,
    });
    mockSaveMemo.mockImplementation(async (memo) => ({
      ...memo,
      id: "memo-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    }));
    mockGetMemosBySession.mockResolvedValue([{ id: "memo-1" }]);
    mockCompleteSession.mockResolvedValue(undefined);
  });

  it("creates a session on first memo save and advances to the next theme", async () => {
    const options = createOptions();
    const { result } = renderHook(() => useSessionFlow(options));

    await act(async () => {
      await result.current.handleThemeFinished({ triggeredByUser: true });
    });

    expect(mockCreateSession).toHaveBeenCalledWith(["theme-1", "theme-2"]);
    expect(mockSaveMemo).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        themeId: "theme-1",
        order: 1,
        textContent: "memo text",
      }),
    );
    expect(options.onAdvanceToNextTheme).toHaveBeenCalledWith(1);
    expect(options.resetTimer).toHaveBeenCalledWith(60);
    expect(options.startTimer).toHaveBeenCalled();
    expect(options.onSessionCompleted).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.memoCount).toBe(1);
    });
  });

  it("completes the session on the last theme", async () => {
    const options = createOptions({
      currentIndex: 1,
      currentTheme: themes[1] ?? null,
    });
    const { result } = renderHook(() => useSessionFlow(options));

    await act(async () => {
      await result.current.handleThemeFinished({ triggeredByUser: true });
    });

    expect(mockCompleteSession).toHaveBeenCalledWith("session-1", 1);
    expect(options.onSessionCompleted).toHaveBeenCalledWith("session-1");
    expect(options.onAdvanceToNextTheme).not.toHaveBeenCalled();
  });

  it("skips duplicate handleThemeFinished while saving", async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    mockSaveMemo.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    const options = createOptions();
    const { result } = renderHook(() => useSessionFlow(options));

    let firstCall: Promise<void> | undefined;
    await act(async () => {
      firstCall = result.current.handleThemeFinished({ triggeredByUser: true });
      await result.current.handleThemeFinished({ triggeredByUser: true });
    });

    expect(mockSaveMemo).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.({
        id: "memo-1",
        sessionId: "session-1",
        themeId: "theme-1",
        order: 1,
        textContent: "memo text",
        handwritingType: "none",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      await firstCall;
    });
  });
});
