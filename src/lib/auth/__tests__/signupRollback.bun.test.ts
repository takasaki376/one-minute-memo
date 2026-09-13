import { describe, expect, it, mock } from "bun:test";

import { rollbackCreatedUser } from "../signup";

describe("rollbackCreatedUser", () => {
  it("succeeds on a later retry", async () => {
    const deleteUser = mock(async () => {
      if (deleteUser.mock.calls.length < 2) {
        throw new Error("transient");
      }
    });
    const log = mock(() => undefined);

    await expect(
      rollbackCreatedUser({ deleteUser }, "uid-1", { log }),
    ).resolves.toBeUndefined();

    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const deleteUser = mock(async () => {
      throw new Error("permanent");
    });
    const log = mock(() => undefined);

    await expect(
      rollbackCreatedUser({ deleteUser }, "uid-1", {
        attempts: 2,
        log,
      }),
    ).rejects.toMatchObject({
      code: "auth/internal-error",
      message: expect.stringContaining("uid-1"),
    });

    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
