import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { HistoryMemoCard } from "../HistoryMemoCard";
import type { MemoRecord } from "@/types/memo";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("HistoryMemoCard", () => {
  it("テキストと手書き画像の両方を表示する", () => {
    const memo: MemoRecord = {
      id: "m1",
      sessionId: "s1",
      themeId: "t1",
      order: 1,
      textContent: "本文",
      handwritingType: "dataUrl",
      handwritingDataUrl: tinyPng,
      createdAt: "2025-01-10T09:00:00.000Z",
      updatedAt: "2025-01-10T09:00:00.000Z",
    };

    render(
      <HistoryMemoCard
        memo={memo}
        themeTitle="題名"
        detailHref="/history/s1"
      />,
    );

    expect(screen.getByText(/入力内容: 本文/)).toBeInTheDocument();
    expect(screen.getByText("手書き")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", tinyPng);
  });

  it("手書きのみのときは画像を表示しテキスト行は出さない", () => {
    const memo: MemoRecord = {
      id: "m1",
      sessionId: "s1",
      themeId: "t1",
      order: 1,
      textContent: "  ",
      handwritingType: "dataUrl",
      handwritingDataUrl: tinyPng,
      createdAt: "2025-01-10T09:00:00.000Z",
      updatedAt: "2025-01-10T09:00:00.000Z",
    };

    render(
      <HistoryMemoCard
        memo={memo}
        themeTitle="題名"
        detailHref="/history/s1"
      />,
    );

    expect(screen.queryByText(/入力内容:/)).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
