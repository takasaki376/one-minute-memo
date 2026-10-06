import { describe, expect, it } from "bun:test";

import { SYNC_ERROR_CODES } from "../errorContract";
import { handleSyncRun, handleSyncState, handleSyncUpload } from "../syncHandlers";
import type { SyncStore } from "../syncExecute";
import type { RemoteCollections, UploadPlan } from "../syncPlan";

function emptyRemote(): RemoteCollections {
  return {
    memos: new Map(),
    sessions: new Map(),
    themes: new Map(),
    themeSettings: new Map(),
  };
}

function storeFor(remote: RemoteCollections): SyncStore & { uid: string | null } {
  const seen = { uid: null as string | null };
  const store: SyncStore & { uid: string | null } = {
    uid: null,
    async load(uid: string) {
      seen.uid = uid;
      store.uid = uid;
      return remote;
    },
    async writeUpload(_uid: string, plan: UploadPlan) {
      for (const memo of plan.memos) {
        remote.memos.set(memo.id, memo);
      }
      for (const session of plan.sessions) {
        remote.sessions.set(session.id, session);
      }
      for (const theme of plan.themes) {
        remote.themes.set(theme.id, theme);
      }
      for (const setting of plan.themeSettings) {
        remote.themeSettings.set(setting.id, setting);
      }
      for (const id of plan.deletedThemeSettingIds) {
        remote.themeSettings.delete(id);
      }
      return {
        memoFailures: 0,
        sessionFailures: 0,
        themeFailures: 0,
        themeSettingFailures: 0,
        deleteFailures: 0,
      };
    },
    async getLastSyncedAt() {
      return "2026-02-01T00:00:00.000Z";
    },
    async setLastSyncedAt() {
      return undefined;
    },
  };
  return store;
}

describe("sync handlers", () => {
  it("returns remote difference only when localLastSyncedAt is provided", async () => {
    const store = storeFor(emptyRemote());
    const response = await handleSyncState(
      "uid-from-session",
      new URLSearchParams("localLastSyncedAt=2026-01-01T00:00:00.000Z"),
      store,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        lastSyncedAt: "2026-02-01T00:00:00.000Z",
        hasRemoteDifference: true,
      },
    });
  });

  it("rejects an upload body that is not a payload", async () => {
    const response = await handleSyncUpload(
      "uid-from-session",
      { uid: "other-user" },
      storeFor(emptyRemote()),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe(SYNC_ERROR_CODES.VALIDATION);
  });

  it("loads Firestore with the session uid", async () => {
    const store = storeFor(emptyRemote());
    const response = await handleSyncRun(
      "uid-from-session",
      {
        payload: {
          memos: [],
          sessions: [],
          themes: [],
          themeSettings: [],
          deletedThemeSettingIds: [],
        },
        index: { memos: [], sessions: [], themes: [], themeSettings: [] },
      },
      store,
    );
    expect(response.status).toBe(200);
    expect(store.uid).toBe("uid-from-session");
  });

  it("does not delete a theme setting that was just uploaded", async () => {
    const remote = emptyRemote();
    const setting = {
      id: "theme-0001",
      isActive: false,
      updatedAt: "2026-03-01T00:00:00.000Z",
    };
    const response = await handleSyncRun(
      "uid-from-session",
      {
        payload: {
          memos: [],
          sessions: [],
          themes: [],
          themeSettings: [setting],
          deletedThemeSettingIds: [],
        },
        index: {
          memos: [],
          sessions: [],
          themes: [],
          themeSettings: [{ id: setting.id, updatedAt: setting.updatedAt }],
        },
      },
      storeFor(remote),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { deletedThemeSettingIds: string[]; uploadedThemeSettings: number };
    };
    expect(json.data.uploadedThemeSettings).toBe(1);
    expect(json.data.deletedThemeSettingIds).toEqual([]);
  });
});
