import { describe, expect, it } from "bun:test";

import { fail, ok } from "../envelope";

describe("api envelope", () => {
  it("wraps success data", () => {
    expect(ok({ user: null })).toEqual({
      success: true,
      data: { user: null },
    });
  });

  it("wraps error code and message", () => {
    expect(fail("AUTH_INTERNAL", "認証処理に失敗しました")).toEqual({
      success: false,
      error: { code: "AUTH_INTERNAL", message: "認証処理に失敗しました" },
    });
  });
});
