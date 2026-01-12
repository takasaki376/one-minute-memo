import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

import HistoryPage from "../page";
import * as sessionsRepo from "@/lib/db/sessionsRepo";
import type { SessionRecord } from "@/types/session";

// window.location.reload のモック
const mockReload = vi.fn();

const mockSessions: SessionRecord[] = [
  {
    id: "session-1",
    startedAt: "2025-01-10T09:00:00.000Z",
    endedAt: "2025-01-10T09:10:00.000Z",
    themeIds: ["theme-1", "theme-2"],
    memoCount: 2,
  },
  {
    id: "session-2",
    startedAt: "2025-01-11T10:00:00.000Z",
    endedAt: null, // 未完了
    themeIds: ["theme-3"],
    memoCount: 1,
  },
  {
    id: "session-3",
    startedAt: "2025-01-09T08:00:00.000Z",
    endedAt: "2025-01-09T08:15:00.000Z",
    themeIds: Array.from({ length: 5 }, (_, i) => `theme-${i + 1}`),
    memoCount: 5,
  },
];

vi.mock("@/lib/db/sessionsRepo", () => {
  const getAllSessions = vi.fn();
  return { getAllSessions };
});

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.location.reload のモックを設定
    Object.defineProperty(window, "location", {
      value: {
        reload: mockReload,
      },
      writable: true,
      configurable: true,
    });
  });

  it("displays loading state initially", async () => {
    (sessionsRepo.getAllSessions as Mock).mockImplementation(
      () => new Promise(() => {}) // 永遠に解決しないPromise
    );

    await act(async () => {
      render(<HistoryPage />);
    });

    expect(screen.getByText("履歴を読み込んでいます…")).toBeInTheDocument();
    expect(
      screen.getByText("これまでのセッションの記録を取得しています。")
    ).toBeInTheDocument();
  });

  it("displays error state when loading fails", async () => {
    (sessionsRepo.getAllSessions as Mock).mockRejectedValue(
      new Error("Failed to load")
    );

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴を読み込めませんでした")).toBeInTheDocument();
    });

    expect(
      screen.getByText("履歴の読み込み中にエラーが発生しました。")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toBeInTheDocument();
  });

  it("displays empty state when no sessions exist", async () => {
    (sessionsRepo.getAllSessions as Mock).mockResolvedValue([]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    expect(
      screen.getByText("まだセッション履歴がありません")
    ).toBeInTheDocument();
    expect(
      screen.getByText("最初のセッションを開始してみましょう")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "セッションを開始" })
    ).toBeInTheDocument();
  });

  it("displays session list when sessions exist", async () => {
    (sessionsRepo.getAllSessions as Mock).mockResolvedValue(mockSessions);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    // セッションカードが表示されることを確認
    expect(screen.getAllByText(/テーマ.*件・メモ.*件/).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText("詳細を見る").length).toBe(mockSessions.length);
  });

  it("sorts sessions by endedAt first, then startedAt in descending order", async () => {
    // endedAtがあるセッションとないセッションを混在させてソートをテスト
    const sessionsForSort: SessionRecord[] = [
      {
        id: "session-old",
        startedAt: "2025-01-09T08:00:00.000Z",
        endedAt: "2025-01-09T08:15:00.000Z", // 最も古いendedAt
        themeIds: ["theme-1"],
        memoCount: 1,
      },
      {
        id: "session-new",
        startedAt: "2025-01-11T10:00:00.000Z",
        endedAt: "2025-01-11T10:15:00.000Z", // 最も新しいendedAt
        themeIds: ["theme-2"],
        memoCount: 2,
      },
      {
        id: "session-incomplete",
        startedAt: "2025-01-12T11:00:00.000Z", // 最も新しいstartedAtだがendedAtなし
        endedAt: null,
        themeIds: ["theme-3"],
        memoCount: 1,
      },
    ];

    (sessionsRepo.getAllSessions as Mock).mockResolvedValue(sessionsForSort);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    // ソート順を確認（endedAt ?? startedAt で降順）
    // 1. session-incomplete (endedAt: null, startedAt: 2025-01-12T11:00:00) - 最新
    // 2. session-new (endedAt: 2025-01-11T10:15:00)
    // 3. session-old (endedAt: 2025-01-09T08:15:00) - 最も古い
    const detailLinks = screen.getAllByRole("link", { name: "詳細を見る" });
    expect(detailLinks.length).toBe(3);
    expect(detailLinks[0]).toHaveAttribute("href", "/history/session-incomplete");
    expect(detailLinks[1]).toHaveAttribute("href", "/history/session-new");
    expect(detailLinks[2]).toHaveAttribute("href", "/history/session-old");
  });

  it("renders navigation links correctly", async () => {
    (sessionsRepo.getAllSessions as Mock).mockResolvedValue(mockSessions);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    // 詳細ページへのリンク
    const detailLinks = screen.getAllByRole("link", { name: "詳細を見る" });
    expect(detailLinks[0]).toHaveAttribute("href", "/history/session-2");
    expect(detailLinks[1]).toHaveAttribute("href", "/history/session-1");
    expect(detailLinks[2]).toHaveAttribute("href", "/history/session-3");

    // 新しいセッションを開始するボタン
    const newSessionButton = screen.getByRole("link", {
      name: "新しいセッションを開始",
    });
    expect(newSessionButton).toHaveAttribute("href", "/session");
  });

  it("calls getAllSessions on mount", async () => {
    (sessionsRepo.getAllSessions as Mock).mockResolvedValue([]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(sessionsRepo.getAllSessions).toHaveBeenCalledTimes(1);
    });
  });
});
