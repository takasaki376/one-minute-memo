import { describe, expect, it } from "bun:test";

import { stripUndefinedFields } from "@/lib/sync/sanitizeForFirestore";

describe("stripUndefinedFields", () => {
  it("removes undefined fields", () => {
    const input: Record<string, unknown> = {
      id: "memo-1",
      textContent: "hello",
      handwritingDataUrl: undefined,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(stripUndefinedFields(input)).toEqual({
      id: "memo-1",
      textContent: "hello",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("keeps null values", () => {
    const input = {
      id: "sess-1",
      endedAt: null,
    };

    expect(stripUndefinedFields(input)).toEqual({
      id: "sess-1",
      endedAt: null,
    });
  });
});
