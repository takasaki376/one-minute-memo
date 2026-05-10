import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ThemesPage from "../page";
import type { ThemeRecord } from "@/types/theme";

const baseThemes: ThemeRecord[] = [
  {
    id: "theme-0001",
    title: "仕事の振り返り",
    category: "work",
    isActive: true,
    source: "builtin",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "theme-0002",
    title: "健康について",
    category: "life",
    isActive: false,
    source: "builtin",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];

const mockGetAllThemes = vi.fn();
const mockToggleThemeActive = vi.fn();
const mockCreateUserTheme = vi.fn();
const mockUpdateTheme = vi.fn();
const mockGetMemoCountsByThemeIds = vi.fn();

vi.mock("@/components/providers/ThemeSeedProvider", () => {
  return {
    useThemeSeedState: () => ({
      isReady: true,
      isSeeding: false,
      error: undefined,
    }),
  };
});

vi.mock("@/lib/db/themesRepo", () => {
  return {
    getAllThemes: (...args: unknown[]) => mockGetAllThemes(...args),
    toggleThemeActive: (...args: unknown[]) => mockToggleThemeActive(...args),
    createUserTheme: (...args: unknown[]) => mockCreateUserTheme(...args),
    updateTheme: (...args: unknown[]) => mockUpdateTheme(...args),
  };
});

vi.mock("@/lib/db/memosRepo", () => {
  return {
    getMemoCountsByThemeIds: (...args: unknown[]) =>
      mockGetMemoCountsByThemeIds(...args),
  };
});

describe("/themes page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllThemes.mockResolvedValue([...baseThemes]);
    mockToggleThemeActive.mockResolvedValue(undefined);
    mockGetMemoCountsByThemeIds.mockResolvedValue({
      "theme-0001": 3,
      "theme-0002": 1,
    });
    mockCreateUserTheme.mockImplementation(
      async (input: { title: string; category: string; isActive: boolean }) => ({
      id: "user-theme-1",
      title: String(input.title).trim(),
      category: String(input.category).trim() || "未分類",
      isActive: Boolean(input.isActive),
      source: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    mockUpdateTheme.mockImplementation(
      async (
        id: string,
        input: { title: string; category: string; isActive: boolean },
      ) => ({
      ...(baseThemes.find((t) => t.id === id) ??
        (() => {
          const first = baseThemes[0];
          if (!first) throw new Error("missing base theme");
          return first;
        })()),
      id,
      title: String(input.title).trim(),
      category: String(input.category).trim() || "未分類",
      isActive: Boolean(input.isActive),
      updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    );
  });

  it("renders theme list", async () => {
    render(<ThemesPage />);
    await waitFor(() => {
      expect(screen.getByText("仕事の振り返り")).toBeInTheDocument();
    });
    expect(screen.getByText("健康について")).toBeInTheDocument();
    expect(screen.getByText("2 / 2 件")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetMemoCountsByThemeIds).toHaveBeenCalledTimes(1);
    });
    const row = screen.getByText("theme-0001").closest("li");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("3")).toBeInTheDocument();
  });

  it("filters by search query and category", async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);
    await waitFor(() => {
      expect(screen.getByText("仕事の振り返り")).toBeInTheDocument();
    });

    const search = screen.getByLabelText("テーマ名で検索");
    await user.type(search, "健康");
    expect(screen.queryByText("仕事の振り返り")).not.toBeInTheDocument();
    expect(screen.getByText("健康について")).toBeInTheDocument();
    expect(screen.getByText("1 件ヒット")).toBeInTheDocument();

    const category = screen.getByLabelText("カテゴリで絞り込み");
    await user.selectOptions(category, "work");
    expect(
      screen.getByText("条件に一致するテーマがありません。"),
    ).toBeInTheDocument();
  });

  it("can add a user theme from modal", async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);
    await waitFor(() => {
      expect(screen.getByText("仕事の振り返り")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("themes-add-open"));
    const addDialog = screen.getByRole("dialog", { name: "テーマを追加" });
    expect(addDialog).toBeInTheDocument();

    await user.type(within(addDialog).getByLabelText(/テーマ名/), "  新テーマ  ");
    await user.type(within(addDialog).getByLabelText(/カテゴリ/), "custom");
    await user.click(within(addDialog).getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(screen.getByText("新テーマ")).toBeInTheDocument();
    });
    expect(mockCreateUserTheme).toHaveBeenCalled();
  });

  it("can edit a theme from list", async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);
    await waitFor(() => {
      expect(screen.getByText("仕事の振り返り")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("themes-edit-theme-0001"));
    const editDialog = screen.getByRole("dialog", { name: "テーマを編集" });
    expect(editDialog).toBeInTheDocument();

    const title = within(editDialog).getByLabelText(/テーマ名/);
    await user.clear(title);
    await user.type(title, "更新後タイトル");
    await user.click(within(editDialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText("更新後タイトル")).toBeInTheDocument();
    });
    expect(mockUpdateTheme).toHaveBeenCalledWith("theme-0001", expect.anything());
  });

  it("can toggle theme active state", async () => {
    const user = userEvent.setup();
    render(<ThemesPage />);
    await waitFor(() => {
      expect(screen.getByText("仕事の振り返り")).toBeInTheDocument();
    });

    // initial state for theme-0002 is inactive
    expect(screen.getAllByText("無効").length).toBeGreaterThan(0);
    const toggle = screen.getByRole("button", { name: "テーマを有効化" });
    await user.click(toggle);

    await waitFor(() => {
      expect(mockToggleThemeActive).toHaveBeenCalledWith("theme-0002", true);
    });
  });
});

