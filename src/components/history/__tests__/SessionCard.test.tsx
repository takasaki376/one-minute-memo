import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SessionCard } from "../SessionCard";
import type { SessionRecord } from "@/types/session";

const mockSession: SessionRecord = {
  id: "session-1",
  startedAt: "2025-01-10T09:00:00.000Z",
  endedAt: "2025-01-10T09:10:00.000Z",
  themeIds: ["theme-1", "theme-2", "theme-3"],
  memoCount: 3,
};

describe("SessionCard", () => {
  it("renders session information correctly", () => {
    render(<SessionCard session={mockSession} href="/history/session-1" />);

    expect(screen.getByText(/テーマ 3 件・メモ 3 件/)).toBeInTheDocument();
    expect(screen.getByText("詳細を見る")).toBeInTheDocument();
  });

  it("displays started and ended dates when both are available", () => {
    render(<SessionCard session={mockSession} href="/history/session-1" />);

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
      <SessionCard session={incompleteSession} href="/history/session-1" />
    );

    expect(screen.getByText(/開始/)).toBeInTheDocument();
    expect(screen.queryByText(/終了/)).not.toBeInTheDocument();
  });

  it("shows disabled button when href is not provided", () => {
    render(<SessionCard session={mockSession} />);

    const button = screen.getByRole("button", { name: "詳細" });
    expect(button).toBeDisabled();
  });

  it("shows enabled button with link when href is provided", () => {
    render(<SessionCard session={mockSession} href="/history/session-1" />);

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
        href="/history/session-1"
      />
    );

    expect(screen.getByText(/テーマ 10 件・メモ 8 件/)).toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <SessionCard
        session={mockSession}
        href="/history/session-1"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
