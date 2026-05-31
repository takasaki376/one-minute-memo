import { describe, expect, it } from "vitest";

import {
  parseThemeCsv,
  stripUtf8Bom,
  THEME_CSV_SAMPLE_CONTENT,
} from "../themeCsv";

describe("parseThemeCsv", () => {
  it("parses valid UTF-8 CSV with Japanese headers", () => {
    const result = parseThemeCsv(THEME_CSV_SAMPLE_CONTENT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      lineNumber: 2,
      title: "朝会用トーク",
      category: "仕事",
      memo: "チーム共有ネタ",
    });
    expect(result.rowErrors).toHaveLength(0);
  });

  it("strips UTF-8 BOM", () => {
    const result = parseThemeCsv(`\uFEFF${THEME_CSV_SAMPLE_CONTENT}`);
    expect(result.ok).toBe(true);
  });

  it("returns file error when headers are missing", () => {
    const result = parseThemeCsv("name,category\na,b");
    expect(result).toEqual({
      ok: false,
      fileError: "ヘッダー行に「テーマ名」「カテゴリ名」が必要です",
    });
  });

  it("returns file error for empty file", () => {
    expect(parseThemeCsv("")).toEqual({
      ok: false,
      fileError: "CSVファイルが空です",
    });
  });

  it("collects row errors for empty title while keeping valid rows", () => {
    const csv = `テーマ名,カテゴリ名,メモ
,仕事,メモ
有効なテーマ,プライベート,
`;
    const result = parseThemeCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.title).toBe("有効なテーマ");
    expect(result.rowErrors).toEqual([
      { lineNumber: 2, message: "テーマ名が空です" },
    ]);
  });

  it("rejects duplicate titles within the same CSV", () => {
    const csv = `テーマ名,カテゴリ名
同じ名前,仕事
同じ名前,プライベート
`;
    const result = parseThemeCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rowErrors[0]?.message).toContain("重複");
  });
});

describe("stripUtf8Bom", () => {
  it("removes BOM prefix", () => {
    expect(stripUtf8Bom("\uFEFFhello")).toBe("hello");
  });
});
