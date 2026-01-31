// src/app/session/complete/__tests__/page.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockSession = {
  id: "session-1",
  themeIds: ["theme-1", "theme-2", "theme-3", "theme-4", "theme-5"],
  startedAt: "2025-01-11T10:00:00.000Z",
  endedAt: "2025-01-11T10:05:30.000Z",
  memoCount: 5,
};

vi.mock("@/lib/db/sessionsRepo", () => {
  const getSessionById = vi.fn(async (sessionId: string) => {
    if (sessionId === "session-1") {
      return mockSession;
    }
    return undefined;
  });

  return { getSessionById };
});

vi.mock("next/navigation", () => {
  const useRouter = vi.fn();
  const useSearchParams = vi.fn(() => {
    const params = new URLSearchParams();
    return {
      get: (key: string) => params.get(key),
    };
  });
  return {
    useRouter,
    useSearchParams,
  };
});

import SessionCompletePage from "../page";
import * as sessionsRepo from "@/lib/db/sessionsRepo";
import { useSearchParams } from "next/navigation";

describe("/session/complete page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("通常ケース: セッション情報が正常に取得される場合", () => {
    beforeEach(() => {
      // useSearchParams をモック: sessionId=session-1 を返す
      const mockSearchParams = new URLSearchParams("sessionId=session-1");
      (useSearchParams as unknown as Mock).mockReturnValue({
        get: (key: string) => mockSearchParams.get(key),
      });
    });

    it("完了画面にアクセスするとセッション情報が表示される", async () => {
      render(<SessionCompletePage />);

      // ローディング中は「読み込んでいます」が表示
      expect(
        screen.getByText(/セッション情報を読み込んでいます/)
      ).toBeInTheDocument();

      // セッション情報の読み込み完了を待つ
      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      // 完了メッセージが表示される
      await waitFor(() => {
        expect(
          screen.getByText(/セッションが完了しました/)
        ).toBeInTheDocument();
      });

      // メモ件数が表示される
      expect(
        screen.getByText(/おつかれさまでした。今回のセッションで/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/5 件のメモを書き出しました/)
      ).toBeInTheDocument();
    });

    it("memoCount が期待どおり表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      // 書いたメモ件数の表示を確認
      await waitFor(() => {
        expect(screen.getByText("5 件")).toBeInTheDocument();
      });
    });

    it("セッション日時が表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      // 開始日時と終了日時が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/2025\/1\/11/)).toBeInTheDocument();
      });
    });

    it("所要時間が計算・表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      // 所要時間（約5分30秒 → 6分に丸める）が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/6 分/)).toBeInTheDocument();
      });
    });

    it("「履歴一覧を見る」ボタンが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const historyButton = await screen.findByRole("link", {
        name: /履歴一覧を見る/,
      });
      expect(historyButton).toHaveAttribute("href", "/history");
    });

    it("「もう一度セッションを始める」ボタンが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const restartButton = await screen.findByRole("link", {
        name: /もう一度セッションを始める/,
      });
      expect(restartButton).toHaveAttribute("href", "/session");
    });

    it("「このセッションの詳細を見る」ボタンが表示され /history/:id へ遷移する", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const detailButton = await screen.findByRole("link", {
        name: /このセッションの詳細を見る/,
      });
      expect(detailButton).toBeInTheDocument();
      expect(detailButton).toHaveAttribute("href", "/history/session-1");
    });

    it("成功状態では3つのボタン（詳細・履歴一覧・再開）が表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const detailButton = await screen.findByRole("link", {
        name: /このセッションの詳細を見る/,
      });
      const historyButton = await screen.findByRole("link", {
        name: /履歴一覧を見る/,
      });
      const restartButton = await screen.findByRole("link", {
        name: /もう一度セッションを始める/,
      });
      expect(detailButton).toBeInTheDocument();
      expect(historyButton).toBeInTheDocument();
      expect(restartButton).toBeInTheDocument();
    });
  });

  describe("エラーケース: sessionId が指定されていない場合", () => {
    beforeEach(() => {
      // useSearchParams をモック: sessionId パラメータなし
      (useSearchParams as unknown as Mock).mockReturnValue({
        get: () => null,
      });
    });

    it("エラーメッセージが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(
          screen.getByText(/セッション情報を取得できませんでした/)
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/セッションIDが指定されていません/)
      ).toBeInTheDocument();
    });

    it("エラー時には「履歴一覧を見る」ボタンが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        const historyButton = screen.getByRole("link", {
          name: /履歴一覧を見る/,
        });
        expect(historyButton).toBeInTheDocument();
      });
    });

    it("エラー時には「トップへ戻る」ボタンが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        const topButton = screen.getByRole("link", {
          name: /トップへ戻る/,
        });
        expect(topButton).toBeInTheDocument();
      });
    });
  });

  describe("エラーケース: sessionId が無効な場合（存在しないセッション）", () => {
    beforeEach(() => {
      // useSearchParams をモック: 存在しないセッションID
      const mockSearchParams = new URLSearchParams("sessionId=invalid-id");
      (useSearchParams as unknown as Mock).mockReturnValue({
        get: (key: string) => mockSearchParams.get(key),
      });
    });

    it("セッションが見つからないエラーメッセージが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(
          screen.getByText(/セッション情報を取得できませんでした/)
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/セッションが見つかりませんでした/)
      ).toBeInTheDocument();
    });

    it("エラー時には導線ボタンが表示される", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        const startButton = screen.getByRole("link", {
          name: /新しくセッションを始める/,
        });
        const historyButton = screen.getByRole("link", {
          name: /履歴一覧を見る/,
        });
        expect(startButton).toBeInTheDocument();
        expect(historyButton).toBeInTheDocument();
      });
    });
  });

  describe("ナビゲーション確認", () => {
    beforeEach(() => {
      const mockSearchParams = new URLSearchParams("sessionId=session-1");
      (useSearchParams as unknown as Mock).mockReturnValue({
        get: (key: string) => mockSearchParams.get(key),
      });
    });

    it("「履歴一覧を見る」ボタンのナビゲーションが正しい", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const historyButton = await screen.findByRole("link", {
        name: /履歴一覧を見る/,
      });
      expect(historyButton).toHaveAttribute("href", "/history");
    });

    it("「もう一度セッションを始める」ボタンのナビゲーションが正しい", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      const restartButton = await screen.findByRole("link", {
        name: /もう一度セッションを始める/,
      });
      expect(restartButton).toHaveAttribute("href", "/session");
    });

    it("成功状態では「トップへ戻る」ボタンは表示されない", async () => {
      render(<SessionCompletePage />);

      await waitFor(() => {
        expect(sessionsRepo.getSessionById).toHaveBeenCalledWith("session-1");
      });

      // 成功状態では「トップへ戻る」ボタンは表示されない
      const topButtons = screen.queryAllByRole("link", {
        name: /トップへ戻る/,
      });
      expect(topButtons).toHaveLength(0);
    });
  });
});
