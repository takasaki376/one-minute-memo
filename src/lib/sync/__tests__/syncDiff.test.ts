import { describe, expect, it } from "vitest";

import {
  collectLocalThemeSettings,
  hasRemoteSyncDifference,
  pickUserThemes,
  shouldDownloadMemo,
  shouldDownloadSession,
  shouldDownloadUserTheme,
  shouldUploadMemo,
  shouldUploadSession,
  shouldUploadUserTheme,
} from "@/lib/sync/syncDiff";
import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type { ThemeRecord } from "@/types/theme";

function makeTheme(overrides: Partial<ThemeRecord> = {}): ThemeRecord {
  return {
    id: "user-theme-1",
    title: "Test",
    category: "未分類",
    isActive: true,
    source: "user",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: null,
    themeIds: ["theme-1"],
    memoCount: 0,
    ...overrides,
  };
}

function makeMemo(overrides: Partial<MemoRecord> = {}): MemoRecord {
  return {
    id: "memo-1",
    sessionId: "session-1",
    themeId: "theme-1",
    order: 1,
    textContent: "Test",
    handwritingType: "none",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("syncDiff", () => {
  it("pickUserThemes returns only user themes", () => {
    const themes = [
      makeTheme({ id: "user-theme-1", source: "user" }),
      makeTheme({ id: "theme-0001", source: "builtin" }),
    ];
    expect(pickUserThemes(themes)).toHaveLength(1);
    expect(pickUserThemes(themes)[0]?.id).toBe("user-theme-1");
  });

  it("collectLocalThemeSettings includes builtin overrides only", () => {
    const themes = [
      makeTheme({ id: "theme-0001", source: "builtin", isActive: false }),
      makeTheme({ id: "theme-0002", source: "builtin", isActive: true }),
    ];
    const settings = collectLocalThemeSettings(themes);
    expect(settings).toHaveLength(1);
    expect(settings[0]?.id).toBe("theme-0001");
    expect(settings[0]?.isActive).toBe(false);
  });

  it("shouldUploadUserTheme uploads when remote is missing or older", () => {
    const local = makeTheme({ updatedAt: "2026-01-02T00:00:00.000Z" });
    const remote = makeTheme({ updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(shouldUploadUserTheme(local, undefined)).toBe(true);
    expect(shouldUploadUserTheme(local, remote)).toBe(true);
    expect(shouldUploadUserTheme(remote, local)).toBe(false);
  });

  it("shouldDownloadUserTheme downloads when local is missing or older", () => {
    const local = makeTheme({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const remote = makeTheme({ updatedAt: "2026-01-02T00:00:00.000Z" });
    expect(shouldDownloadUserTheme(undefined, remote)).toBe(true);
    expect(shouldDownloadUserTheme(local, remote)).toBe(true);
    expect(shouldDownloadUserTheme(remote, local)).toBe(false);
  });

  it("shouldUploadMemo uploads when remote is missing or older", () => {
    const older = makeMemo({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeMemo({ updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(shouldUploadMemo(older, undefined)).toBe(true);
    expect(shouldUploadMemo(newer, older)).toBe(true);
    expect(shouldUploadMemo(older, newer)).toBe(false);
    expect(shouldUploadMemo(newer, newer)).toBe(false);
  });

  it("shouldDownloadMemo downloads when local is missing or older", () => {
    const older = makeMemo({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeMemo({ updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(shouldDownloadMemo(undefined, older)).toBe(true);
    expect(shouldDownloadMemo(older, newer)).toBe(true);
    expect(shouldDownloadMemo(newer, older)).toBe(false);
    expect(shouldDownloadMemo(newer, newer)).toBe(false);
  });

  it("shouldUploadSession uploads missing or newly completed sessions", () => {
    const incomplete = makeSession();
    const complete = makeSession({
      endedAt: "2026-01-01T00:01:00.000Z",
      memoCount: 1,
    });

    expect(shouldUploadSession(incomplete, undefined)).toBe(true);
    expect(shouldUploadSession(complete, incomplete)).toBe(true);
    expect(shouldUploadSession(incomplete, complete)).toBe(false);
    expect(shouldUploadSession(complete, complete)).toBe(false);
  });

  it("shouldDownloadSession downloads missing or newly completed sessions", () => {
    const incomplete = makeSession();
    const complete = makeSession({
      endedAt: "2026-01-01T00:01:00.000Z",
      memoCount: 1,
    });

    expect(shouldDownloadSession(undefined, incomplete)).toBe(true);
    expect(shouldDownloadSession(incomplete, complete)).toBe(true);
    expect(shouldDownloadSession(complete, incomplete)).toBe(false);
    expect(shouldDownloadSession(complete, complete)).toBe(false);
  });

  it("hasRemoteSyncDifference detects newer cloud sync time", () => {
    expect(
      hasRemoteSyncDifference(
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      hasRemoteSyncDifference(
        "2026-01-02T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      ),
    ).toBe(false);
    expect(
      hasRemoteSyncDifference(null, "2026-01-01T00:00:00.000Z"),
    ).toBe(true);
    expect(hasRemoteSyncDifference(null, null)).toBe(false);
  });
});
