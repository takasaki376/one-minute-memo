import { describe, expect, it, mock } from "bun:test";

import { rollbackCreatedUser } from "../signup";

describe("rollbackCreatedUser", () => {
  it("succeeds on a later retry", async () => {
    const deleteUser = mock(async () => {
      if (deleteUser.mock.calls.length < 2) {
        throw new Error("transient");
      }
    });
    const logged: Array<{
      attempt: number;
      attempts: number;
      requestId: string;
    }> = [];

    await expect(
      rollbackCreatedUser({ deleteUser }, "uid-1", {
        requestId: "req-1",
        log: (details) => {
          logged.push(details);
        },
      }),
    ).resolves.toBeUndefined();

    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(logged).toEqual([
      { attempt: 1, attempts: 3, requestId: "req-1" },
    ]);
  });

  it("throws after exhausting retries without uid or raw error in logs", async () => {
    const deleteUser = mock(async () => {
      throw new Error("permanent");
    });
    const logged: Array<{
      attempt: number;
      attempts: number;
      requestId: string;
    }> = [];

    let thrown: unknown;
    try {
      await rollbackCreatedUser({ deleteUser }, "uid-secret", {
        attempts: 2,
        requestId: "req-2",
        log: (details) => {
          logged.push(details);
        },
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ code: "auth/internal-error" });
    const message = String((thrown as { message?: unknown }).message ?? "");
    expect(message.includes("rollback")).toBe(true);
    expect(message.includes("uid-secret")).toBe(false);
    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(logged).toEqual([
      { attempt: 1, attempts: 2, requestId: "req-2" },
      { attempt: 2, attempts: 2, requestId: "req-2" },
    ]);
    for (const details of logged) {
      expect("uid" in details).toBe(false);
      expect("error" in details).toBe(false);
    }
  });
});
