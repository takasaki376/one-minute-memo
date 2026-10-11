import { describe, expect, it } from "bun:test";

import { SYNC_ERROR_CODES } from "../errorContract";
import { validateSyncPayload } from "../syncValidation";

const memo = {
  id: "memo-1",
  sessionId: "sess-1",
  themeId: "theme-0001",
  order: 1,
  textContent: "note",
  handwritingType: "none",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:01.000Z",
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    memos: [memo],
    sessions: [],
    themes: [],
    themeSettings: [],
    deletedThemeSettingIds: [],
    ...overrides,
  };
}

describe("validateSyncPayload", () => {
  it("accepts a complete memo", () => {
    const result = validateSyncPayload(payload());
    expect(result.ok).toBe(true);
  });

  it("rejects a memo that only has an id", () => {
    const result = validateSyncPayload(payload({ memos: [{ id: "m1" }] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(SYNC_ERROR_CODES.VALIDATION);
    }
  });

  it("rejects a theme whose source is not user", () => {
    const result = validateSyncPayload(
      payload({
        memos: [],
        themes: [
          {
            id: "theme-user-1",
            title: "custom",
            category: "work",
            isActive: true,
            source: "builtin",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });
});
