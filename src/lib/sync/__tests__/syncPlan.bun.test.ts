import { describe, expect, it } from "bun:test";

import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";

import { planPull, planUpload, type RemoteCollections } from "../syncPlan";

function memo(id: string, updatedAt: string): MemoRecord {
  return {
    id,
    sessionId: "s1",
    themeId: "t1",
    order: 0,
    textContent: id,
    handwritingType: "none",
    createdAt: updatedAt,
    updatedAt,
  };
}

function session(
  id: string,
  endedAt: string | null,
): SessionRecord {
  return {
    id,
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt,
    themeIds: [],
    memoCount: 0,
  };
}

function emptyRemote(): RemoteCollections {
  return {
    memos: new Map(),
    sessions: new Map(),
    themes: new Map(),
    themeSettings: new Map(),
  };
}

describe("planUpload", () => {
  it("uploads a memo that does not exist remotely", () => {
    const local = memo("m1", "2026-01-02T00:00:00.000Z");
    const plan = planUpload(
      {
        memos: [local],
        sessions: [],
        themes: [],
        themeSettings: [],
        deletedThemeSettingIds: [],
      },
      emptyRemote(),
    );
    expect(plan.memos.map((item) => item.id)).toEqual(["m1"]);
  });

  it("keeps the remote memo when timestamps are equal", () => {
    const stamp = "2026-01-02T00:00:00.000Z";
    const remote = emptyRemote();
    remote.memos.set("m1", memo("m1", stamp));
    const plan = planUpload(
      {
        memos: [memo("m1", stamp)],
        sessions: [],
        themes: [],
        themeSettings: [],
        deletedThemeSettingIds: [],
      },
      remote,
    );
    expect(plan.memos).toHaveLength(0);
  });

  it("uploads a completed session over an incomplete remote session", () => {
    const remote = emptyRemote();
    remote.sessions.set("s1", session("s1", null));
    const plan = planUpload(
      {
        memos: [],
        sessions: [session("s1", "2026-01-02T00:00:00.000Z")],
        themes: [],
        themeSettings: [],
        deletedThemeSettingIds: [],
      },
      remote,
    );
    expect(plan.sessions.map((item) => item.id)).toEqual(["s1"]);
  });
});

describe("planPull", () => {
  it("downloads a remote memo when the local index is missing", () => {
    const remote = emptyRemote();
    remote.memos.set("m1", memo("m1", "2026-01-02T00:00:00.000Z"));
    const plan = planPull(
      { memos: [], sessions: [], themes: [], themeSettings: [] },
      remote,
    );
    expect(plan.memos.map((item) => item.id)).toEqual(["m1"]);
  });

  it("downloads when timestamps are equal so remote wins", () => {
    const stamp = "2026-01-02T00:00:00.000Z";
    const remote = emptyRemote();
    remote.memos.set("m1", memo("m1", stamp));
    const plan = planPull(
      {
        memos: [{ id: "m1", updatedAt: stamp }],
        sessions: [],
        themes: [],
        themeSettings: [],
      },
      remote,
    );
    expect(plan.memos.map((item) => item.id)).toEqual(["m1"]);
  });

  it("lists theme settings that exist locally but not remotely as deletions", () => {
    const plan = planPull(
      {
        memos: [],
        sessions: [],
        themes: [],
        themeSettings: [{ id: "builtin-1", updatedAt: "2026-01-01T00:00:00.000Z" }],
      },
      emptyRemote(),
    );
    expect(plan.deletedThemeSettingIds).toEqual(["builtin-1"]);
  });
});
