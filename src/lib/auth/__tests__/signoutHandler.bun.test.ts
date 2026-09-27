import { describe, expect, it, mock } from "bun:test";

import { handleSignoutPost } from "../signoutHandler";

describe("handleSignoutPost", () => {
  it("clears cookie and returns user null", async () => {
    const clearAuthCookie = mock(async () => undefined);

    const response = await handleSignoutPost({ clearAuthCookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { user: null },
    });
    expect(clearAuthCookie).toHaveBeenCalled();
  });
});
