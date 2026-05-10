import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SessionCard } from "../SessionCard";
import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";

const mockSession: SessionRecord = {
  id: "session-1",
  startedAt: "2025-01-10T09:00:00.000Z",
  endedAt: "2025-01-10T09:10:00.000Z",
  themeIds: ["theme-1", "theme-2", "theme-3"],
  memoCount: 3,
};

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("SessionCard", () => {
  it("renders session information correctly", () => {
    render(
      <SessionCard session={mockSession} detailHref="/history/session-1" />,
    );

    expect(screen.getByText(/テーマ 3 件・メモ 3 件/)).toBeInTheDocument();
    expect(screen.getByText("詳細を見る")).toBeInTheDocument();
  });

  it("displays started and ended dates when both are available", () => {
    render(
      <SessionCard session={mockSession} detailHref="/history/session-1" />,
    );

    const dateText = screen.getByText(/開始/);
    expect(dateText).toBeInTheDocument();
    expect(screen.getByText(/終了/)).toBeInTheDocument();
  });

  it("displays only started date when endedAt is null", () => {
    const incompleteSession: SessionRecord = {
      ...mockSession,
      endedAt: null,
    };

    render(
      <SessionCard
        session={incompleteSession}
        detailHref="/history/session-1"
      />,
    );

    expect(screen.getByText(/開始/)).toBeInTheDocument();
    expect(screen.queryByText(/終了/)).not.toBeInTheDocument();
  });

  it("does not show detail control when detailHref is omitted", () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.queryByRole("link", { name: "詳細を見る" })).toBeNull();
    expect(screen.queryByRole("button", { name: "詳細" })).toBeNull();
  });

  it("shows enabled button with link when detailHref is provided", () => {
    render(
      <SessionCard session={mockSession} detailHref="/history/session-1" />,
    );

    const link = screen.getByRole("link", { name: "詳細を見る" });
    expect(link).toHaveAttribute("href", "/history/session-1");
  });

  it("displays correct theme and memo counts", () => {
    const sessionWithManyItems: SessionRecord = {
      ...mockSession,
      themeIds: Array.from({ length: 10 }, (_, i) => `theme-${i + 1}`),
      memoCount: 8,
    };

    render(
      <SessionCard
        session={sessionWithManyItems}
        detailHref="/history/session-1"
      />,
    );

    expect(screen.getByText(/テーマ 10 件・メモ 8 件/)).toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <SessionCard
        session={mockSession}
        detailHref="/history/session-1"
        className="custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("lists memos with order / session theme count and theme title", () => {
    const memos: MemoRecord[] = [
      {
        id: "m1",
        sessionId: "session-1",
        themeId: "theme-1",
        order: 2,
        textContent: "本文2",
        handwritingType: "none",
        createdAt: "2025-01-10T09:05:00.000Z",
        updatedAt: "2025-01-10T09:05:00.000Z",
      },
      {
        id: "m2",
        sessionId: "session-1",
        themeId: "theme-2",
        order: 1,
        textContent: "本文1",
        handwritingType: "dataUrl",
        handwritingDataUrl: tinyPng,
        createdAt: "2025-01-10T09:02:00.000Z",
        updatedAt: "2025-01-10T09:02:00.000Z",
      },
    ];

    render(
      <SessionCard
        session={mockSession}
        memos={memos}
        resolveThemeTitle={(m) =>
          m.themeId === "theme-1" ? "題A" : "題B"
        }
      />,
    );

    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText(/テーマ: 題A/)).toBeInTheDocument();
    expect(screen.getByText(/テーマ: 題B/)).toBeInTheDocument();
    expect(screen.getByText(/入力内容: 本文1/)).toBeInTheDocument();
    expect(screen.getByText(/入力内容: 本文2/)).toBeInTheDocument();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(1);
  });
});
