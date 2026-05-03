import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HistoryPage from "../page";
import * as memosRepo from "@/lib/db/memosRepo";
import * as themesRepo from "@/lib/db/themesRepo";
import { isoToLocalDateKey } from "@/lib/utils/dateFormatters";
import type { MemoRecord } from "@/types/memo";
import type { ThemeRecord } from "@/types/theme";

const mockReload = vi.fn();

const themeA: ThemeRecord = {
  id: "theme-a",
  title: "今気になっていることは？",
  category: "test",
  isActive: true,
  source: "builtin",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const themeB: ThemeRecord = {
  id: "theme-b",
  title: "別のテーマ",
  category: "test",
  isActive: true,
  source: "builtin",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const mockMemos: MemoRecord[] = [
  {
    id: "memo-new",
    sessionId: "session-2",
    themeId: "theme-b",
    order: 1,
    textContent: "新しいメモの本文",
    handwritingType: "dataUrl",
    handwritingDataUrl: tinyPng,
    createdAt: "2025-01-11T10:00:00.000Z",
    updatedAt: "2025-01-11T10:00:00.000Z",
  },
  {
    id: "memo-old",
    sessionId: "session-1",
    themeId: "theme-a",
    order: 1,
    textContent: "古いメモの本文",
    handwritingType: "none",
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

vi.mock("@/lib/db/memosRepo", () => {
  const getAllMemos = vi.fn();
  return { getAllMemos };
});

vi.mock("@/lib/db/themesRepo", () => {
  const getThemesByIds = vi.fn();
  return { getThemesByIds };
});

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: {
        reload: mockReload,
      },
      writable: true,
      configurable: true,
    });
  });

  it("displays loading state initially", async () => {
    (memosRepo.getAllMemos as Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    await act(async () => {
      render(<HistoryPage />);
    });

    expect(screen.getByText("履歴を読み込んでいます…")).toBeInTheDocument();
    expect(
      screen.getByText("これまでのメモの記録を取得しています。"),
    ).toBeInTheDocument();
  });

  it("displays error state when loading fails", async () => {
    (memosRepo.getAllMemos as Mock).mockRejectedValue(new Error("Failed"));

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴を読み込めませんでした")).toBeInTheDocument();
    });

    expect(
      screen.getByText("履歴の読み込み中にエラーが発生しました。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toBeInTheDocument();
  });

  it("displays empty state when no memos exist", async () => {
    (memosRepo.getAllMemos as Mock).mockResolvedValue([]);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    expect(screen.getByText("まだメモがありません")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "セッションを開始" }),
    ).toBeInTheDocument();
  });

  it("displays memo cards with content and detail links", async () => {
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    expect(screen.getByText(/テーマ: 別のテーマ/)).toBeInTheDocument();
    expect(screen.getByText(/テーマ: 今気になっていることは？/)).toBeInTheDocument();
    expect(
      screen.getByText(/入力内容: 新しいメモの本文/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/入力内容: 古いメモの本文/),
    ).toBeInTheDocument();
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0]).toHaveAttribute("src", tinyPng);

    const detailLinks = screen.getAllByRole("link", { name: "詳細を見る" });
    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0]).toHaveAttribute("href", "/history/session-2");
    expect(detailLinks[1]).toHaveAttribute("href", "/history/session-1");
  });

  it("keeps memo order as returned by getAllMemos (newest first)", async () => {
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    const detailLinks = screen.getAllByRole("link", { name: "詳細を見る" });
    expect(detailLinks[0]).toHaveAttribute("href", "/history/session-2");
    expect(detailLinks[1]).toHaveAttribute("href", "/history/session-1");
  });

  it("filters by theme", async () => {
    const user = userEvent.setup();
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("テーマ"), "theme-a");

    await waitFor(() => {
      expect(screen.getByText("1 件を表示（全 2 件）")).toBeInTheDocument();
    });

    expect(screen.getByText(/テーマ: 今気になっていることは？/)).toBeInTheDocument();
    expect(screen.queryByText(/テーマ: 別のテーマ/)).not.toBeInTheDocument();
  });

  it("filters by date and combines with theme filter", async () => {
    const user = userEvent.setup();
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    const dayKey = isoToLocalDateKey(mockMemos[1].createdAt);
    await user.click(screen.getByTestId(`history-cal-${dayKey}`));

    await waitFor(() => {
      expect(screen.getByText("1 件を表示（全 2 件）")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("テーマ"), "theme-a");

    expect(screen.getByText("1 件を表示（全 2 件）")).toBeInTheDocument();
    expect(
      screen.getByText(/入力内容: 古いメモの本文/),
    ).toBeInTheDocument();
  });

  it("shows no-results message when filters match nothing", async () => {
    const user = userEvent.setup();
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("テーマ"), "theme-a");
    const onlyThemeBDay = isoToLocalDateKey(mockMemos[0].createdAt);
    await user.click(screen.getByTestId(`history-cal-${onlyThemeBDay}`));

    await waitFor(() => {
      expect(
        screen.getByText("条件に一致するメモがありません"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "詳細を見る" })).not.toBeInTheDocument();
  });

  it("clears filters when clicking 条件をクリア", async () => {
    const user = userEvent.setup();
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("テーマ"), "theme-a");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "条件をクリア" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    await waitFor(() => {
      expect(screen.getByText("2 件を表示（全 2 件）")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("link", { name: "詳細を見る" })).toHaveLength(2);
  });

  it("renders navigation links correctly", async () => {
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("履歴一覧")).toBeInTheDocument();
    });

    const newSessionButton = screen.getByRole("link", {
      name: "新しいセッションを開始",
    });
    expect(newSessionButton).toHaveAttribute("href", "/session");
  });

  it("calls getAllMemos and getThemesByIds on mount", async () => {
    (memosRepo.getAllMemos as Mock).mockResolvedValue(mockMemos);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([themeA, themeB]);

    await act(async () => {
      render(<HistoryPage />);
    });

    await waitFor(() => {
      expect(memosRepo.getAllMemos).toHaveBeenCalledTimes(1);
    });
    expect(themesRepo.getThemesByIds).toHaveBeenCalledWith(
      expect.arrayContaining(["theme-a", "theme-b"]),
    );
    expect(themesRepo.getThemesByIds.mock.calls[0][0]).toHaveLength(2);
  });
});
