import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import HistoryDetailPage from "../page";
import * as sessionsRepo from "@/lib/db/sessionsRepo";
import * as memosRepo from "@/lib/db/memosRepo";
import * as themesRepo from "@/lib/db/themesRepo";
import type { SessionRecord } from "@/types/session";
import type { MemoRecord } from "@/types/memo";
import type { ThemeRecord } from "@/types/theme";

const mockSession: SessionRecord = {
  id: "session-1",
  startedAt: "2025-01-10T09:00:00.000Z",
  endedAt: "2025-01-10T09:10:00.000Z",
  themeIds: ["theme-a"],
  memoCount: 1,
};

const mockTheme: ThemeRecord = {
  id: "theme-a",
  title: "振り返りテーマ",
  category: "work",
  isActive: true,
  source: "builtin",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const mockMemo: MemoRecord = {
  id: "memo-1",
  sessionId: "session-1",
  themeId: "theme-a",
  order: 1,
  textContent: "詳細ページのテストメモ",
  handwritingType: "none",
  createdAt: "2025-01-10T09:05:00.000Z",
  updatedAt: "2025-01-10T09:05:00.000Z",
};

vi.mock("@/lib/db/sessionsRepo", () => ({
  getSessionById: vi.fn(),
}));

vi.mock("@/lib/db/memosRepo", () => ({
  getMemosBySession: vi.fn(),
}));

vi.mock("@/lib/db/themesRepo", () => ({
  getThemesByIds: vi.fn(),
}));

function renderPage(sessionId = "session-1") {
  const params = Promise.resolve({ id: sessionId });
  return render(<HistoryDetailPage params={params} />);
}

describe("HistoryDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sessionsRepo.getSessionById as Mock).mockResolvedValue(mockSession);
    (memosRepo.getMemosBySession as Mock).mockResolvedValue([mockMemo]);
    (themesRepo.getThemesByIds as Mock).mockResolvedValue([mockTheme]);
  });

  it("shows loading state initially", () => {
    renderPage();
    expect(
      screen.getByText("セッション履歴を読み込んでいます…"),
    ).toBeInTheDocument();
  });

  it("displays session detail and memo list when loaded", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "セッション詳細" })).toBeInTheDocument();
    });

    expect(screen.getByText("セッション概要")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "メモ一覧" })).toBeInTheDocument();
    expect(screen.getByText("振り返りテーマ")).toBeInTheDocument();
    expect(screen.getByText("詳細ページのテストメモ")).toBeInTheDocument();
    expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
    expect(memosRepo.getMemosBySession).toHaveBeenCalledWith("session-1");
    expect(themesRepo.getThemesByIds).toHaveBeenCalledWith(["theme-a"]);
  });

  it("shows error when session is not found", async () => {
    (sessionsRepo.getSessionById as Mock).mockResolvedValue(undefined);

    renderPage("missing-session");

    await waitFor(() => {
      expect(
        screen.getByText("セッション履歴を表示できません"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("対象のセッションが見つかりませんでした"),
      ).toBeInTheDocument();
    });
  });
});
