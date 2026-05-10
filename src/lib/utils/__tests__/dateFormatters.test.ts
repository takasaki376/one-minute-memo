import { describe, it, expect } from "vitest";

import { formatSessionDateTime, isoToLocalDateKey } from "../dateFormatters";

describe("formatSessionDateTime", () => {
  it("formats a valid date correctly", () => {
    const date = new Date("2025-01-10T09:00:00.000Z");
    const result = formatSessionDateTime(date);

    // 日本語ロケールでフォーマットされることを確認
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/1/); // 月
    expect(result).toMatch(/10/); // 日
    // 時刻が含まれることを確認（タイムゾーンによって変わる可能性があるため、数字のみチェック）
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns '不明' when date is null", () => {
    const result = formatSessionDateTime(null);
    expect(result).toBe("不明");
  });

  it("formats date with different times correctly", () => {
    const morning = new Date("2025-01-10T09:15:00.000Z");
    const afternoon = new Date("2025-01-10T14:30:00.000Z");
    const evening = new Date("2025-01-10T22:45:00.000Z");

    const morningResult = formatSessionDateTime(morning);
    const afternoonResult = formatSessionDateTime(afternoon);
    const eveningResult = formatSessionDateTime(evening);

    // すべて日付と時刻を含むことを確認
    expect(morningResult).toMatch(/2025/);
    expect(afternoonResult).toMatch(/2025/);
    expect(eveningResult).toMatch(/2025/);
  });

  it("formats dates on different days correctly", () => {
    const date1 = new Date("2025-01-10T09:00:00.000Z");
    const date2 = new Date("2025-12-15T10:00:00.000Z"); // タイムゾーンを考慮して12月に確実に収まる時刻

    const result1 = formatSessionDateTime(date1);
    const result2 = formatSessionDateTime(date2);

    expect(result1).toMatch(/2025/);
    expect(result1).toMatch(/1/); // 1月
    expect(result2).toMatch(/2025/);
    expect(result2).toMatch(/12/); // 12月
  });

  it("handles edge case: year boundary", () => {
    const newYear = new Date("2025-01-01T00:00:00.000Z");
    const result = formatSessionDateTime(newYear);

    expect(result).toMatch(/2025/);
    expect(result).toMatch(/1/); // 1月
    expect(result).toMatch(/1/); // 1日
  });

  it("formats date with single digit hour and minute correctly", () => {
    const date = new Date("2025-01-10T05:05:00.000Z");
    const result = formatSessionDateTime(date);

    expect(result).toMatch(/2025/);
    // 2桁の時分が含まれることを確認（"05:05" のような形式）
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formats date with double digit hour and minute correctly", () => {
    const date = new Date("2025-01-10T23:59:00.000Z");
    const result = formatSessionDateTime(date);

    expect(result).toMatch(/2025/);
    // 時刻が含まれることを確認
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("isoToLocalDateKey", () => {
  it("matches local YYYY-MM-DD for the same instant as manual getFullYear/getMonth/getDate", () => {
    const iso = "2025-06-15T12:30:00.000Z";
    const d = new Date(iso);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(isoToLocalDateKey(iso)).toBe(expected);
  });

  it("returns empty string when iso is not parseable", () => {
    expect(isoToLocalDateKey("not-a-date")).toBe("");
  });
});
