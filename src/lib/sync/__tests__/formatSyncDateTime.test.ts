import { describe, expect, it } from "vitest";

import { formatSyncDateTime } from "@/lib/sync/formatSyncDateTime";

describe("formatSyncDateTime", () => {
  it("returns dash when value is empty", () => {
    expect(formatSyncDateTime(null)).toBe("-");
    expect(formatSyncDateTime(undefined)).toBe("-");
  });

  it("formats valid ISO date", () => {
    const result = formatSyncDateTime("2026-06-18T12:00:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(result).not.toBe("-");
  });
});
