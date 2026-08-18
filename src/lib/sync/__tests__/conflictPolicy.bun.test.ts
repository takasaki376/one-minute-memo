import { describe, expect, it } from "bun:test";

import { winnerByUpdatedAt, winnerForSession } from "../conflictPolicy";
import { SYNC_ERROR_CODES, toSyncErrorCode } from "../errorContract";

describe("winnerByUpdatedAt", () => {
  it("picks the newer timestamp", () => {
    expect(
      winnerByUpdatedAt("2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
    ).toBe("local");
    expect(
      winnerByUpdatedAt("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
    ).toBe("remote");
  });

  it("prefers remote when timestamps are equal or missing", () => {
    expect(
      winnerByUpdatedAt("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
    ).toBe("remote");
    expect(winnerByUpdatedAt(undefined, "2026-01-01T00:00:00.000Z")).toBe(
      "remote",
    );
    expect(winnerByUpdatedAt("2026-01-01T00:00:00.000Z", undefined)).toBe(
      "local",
    );
  });
});

describe("winnerForSession", () => {
  it("uploads a locally completed session over a remote incomplete one", () => {
    expect(
      winnerForSession(
        { endedAt: "2026-01-01T01:00:00.000Z" },
        { endedAt: null },
      ),
    ).toBe("local");
  });

  it("prefers remote when both are complete or both are incomplete", () => {
    expect(
      winnerForSession(
        { endedAt: "2026-01-01T01:00:00.000Z" },
        { endedAt: "2026-01-01T02:00:00.000Z" },
      ),
    ).toBe("remote");
    expect(winnerForSession({ endedAt: null }, { endedAt: null })).toBe(
      "remote",
    );
  });
});

describe("toSyncErrorCode", () => {
  it("maps permission-denied and unauthenticated", () => {
    expect(toSyncErrorCode("permission-denied")).toBe(
      SYNC_ERROR_CODES.PERMISSION,
    );
    expect(toSyncErrorCode("unauthenticated")).toBe(
      SYNC_ERROR_CODES.UNAUTHENTICATED,
    );
  });
});
