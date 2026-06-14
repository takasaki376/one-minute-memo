import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_CSV_SAMPLE_CONTENT } from "@/lib/themes/themeCsv";
import type { ThemeRecord } from "@/types/theme";

const mockImportUserThemesFromCsvRows = vi.fn();

vi.mock("@/lib/db/themesRepo", () => ({
  importUserThemesFromCsvRows: (...args: unknown[]) =>
    mockImportUserThemesFromCsvRows(...args),
}));

import { ThemeCsvImportPanel } from "../ThemeCsvImportPanel";

const importedTheme: ThemeRecord = {
  id: "theme-user-1",
  title: "朝会用トーク",
  category: "仕事",
  isActive: true,
  source: "user",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function csvFile(content: string, name = "import.csv") {
  return new File([content], name, { type: "text/csv" });
}

async function uploadCsv(content: string) {
  const user = userEvent.setup();
  const file = csvFile(content);
  if (typeof file.text !== "function") {
    file.text = () => Promise.resolve(content);
  } else {
    vi.spyOn(file, "text").mockResolvedValue(content);
  }
  const input = screen.getByLabelText("CSVファイルを選択");
  await user.upload(input, file);
}

describe("ThemeCsvImportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImportUserThemesFromCsvRows.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      results: [
        { lineNumber: 2, ok: true, theme: importedTheme },
        {
          lineNumber: 3,
          ok: true,
          theme: { ...importedTheme, id: "theme-user-2", title: "旅行したい場所" },
        },
      ],
    });
  });

  it("imports a valid CSV and shows success summary", async () => {
    const onImported = vi.fn();
    render(<ThemeCsvImportPanel onImported={onImported} />);

    await uploadCsv(THEME_CSV_SAMPLE_CONTENT);

    await waitFor(() => {
      expect(screen.getByText(/登録成功: 2 件/)).toBeInTheDocument();
      expect(screen.getByText(/失敗: 0 件/)).toBeInTheDocument();
    });
    expect(onImported).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: "朝会用トーク" }),
        expect.objectContaining({ title: "旅行したい場所" }),
      ]),
    );
    expect(mockImportUserThemesFromCsvRows).toHaveBeenCalledWith([
      expect.objectContaining({ lineNumber: 2, title: "朝会用トーク", category: "仕事" }),
      expect.objectContaining({ lineNumber: 3, title: "旅行したい場所", category: "プライベート" }),
    ]);
  });

  it("shows file error when CSV headers are invalid", async () => {
    render(<ThemeCsvImportPanel onImported={vi.fn()} />);

    await uploadCsv("name,category\na,b");

    await waitFor(() => {
      expect(
        screen.getByText(/ヘッダー行に「テーマ名」「カテゴリ名」が必要です/),
      ).toBeInTheDocument();
    });
    expect(mockImportUserThemesFromCsvRows).not.toHaveBeenCalled();
  });

  it("shows failure summary with row errors from import", async () => {
    mockImportUserThemesFromCsvRows.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      results: [
        { lineNumber: 2, ok: true, theme: importedTheme },
        {
          lineNumber: 3,
          ok: false,
          error: "同じ名前のテーマが既に存在します",
        },
      ],
    });

    const csv = `テーマ名,カテゴリ名,メモ
新規A,仕事,
,プライベート,
`;

    render(<ThemeCsvImportPanel onImported={vi.fn()} />);
    await uploadCsv(csv);

    await waitFor(() => {
      expect(screen.getByText(/登録成功: 1 件/)).toBeInTheDocument();
      expect(screen.getByText(/失敗: 2 件/)).toBeInTheDocument();
      expect(screen.getByText(/3行目: 同じ名前のテーマが既に存在します/)).toBeInTheDocument();
    });
  });
});
