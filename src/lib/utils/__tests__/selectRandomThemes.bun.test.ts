import { describe, expect, it } from "bun:test";

import type { ThemeRecord } from "@/types/theme";
import { selectRandomThemes } from "../selectRandomThemes";

function makeTheme(id: string, title = id): ThemeRecord {
  return {
    id,
    title,
    category: "test",
    isActive: true,
    source: "builtin",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

describe("selectRandomThemes", () => {
  it("returns empty array when no themes are provided", () => {
    expect(selectRandomThemes([], 10)).toEqual([]);
  });

  it("returns empty array when count is zero or negative", () => {
    const themes = [makeTheme("a"), makeTheme("b")];
    expect(selectRandomThemes(themes, 0)).toEqual([]);
    expect(selectRandomThemes(themes, -3)).toEqual([]);
  });

  it("returns all themes when count exceeds available themes", () => {
    const themes = [makeTheme("a"), makeTheme("b"), makeTheme("c")];
    const result = selectRandomThemes(themes, 10);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("returns requested count without duplicates and does not mutate input", () => {
    const themes = Array.from({ length: 10 }, (_, i) =>
      makeTheme(`theme-${i}`),
    );
    const originalIds = themes.map((t) => t.id);

    const result = selectRandomThemes(themes, 5);

    expect(result).toHaveLength(5);
    const ids = result.map((t) => t.id);
    expect(new Set(ids).size).toBe(5);
    expect(themes.map((t) => t.id)).toEqual(originalIds);
    for (const picked of result) {
      expect(themes.some((t) => t.id === picked.id)).toBe(true);
    }
  });

  it("prefers themes with fewer memos", () => {
    const themes = [
      makeTheme("front"),
      makeTheme("low-a"),
      makeTheme("mid"),
      makeTheme("low-b"),
      makeTheme("back"),
    ];

    const result = selectRandomThemes(themes, 2, {
      memoCounts: { front: 3, "low-a": 0, mid: 1, "low-b": 0, back: 2 },
      random: () => 0,
    });

    expect(result.map((theme) => theme.id).sort()).toEqual(["low-a", "low-b"]);
  });

  it("fills the next memo-count tier when the lowest tier is smaller than count", () => {
    const themes = [
      makeTheme("high"),
      makeTheme("low"),
      makeTheme("mid"),
    ];

    const result = selectRandomThemes(themes, 2, {
      memoCounts: { high: 4, low: 0, mid: 1 },
      random: () => 0,
    });

    expect(result.map((theme) => theme.id).sort()).toEqual(["low", "mid"]);
  });

  it("can select a theme at the end of an equal-count list", () => {
    const themes = [
      makeTheme("theme-0"),
      makeTheme("theme-1"),
      makeTheme("theme-2"),
      makeTheme("theme-3"),
    ];

    const result = selectRandomThemes(themes, 1, {
      memoCounts: {
        "theme-0": 2,
        "theme-1": 2,
        "theme-2": 2,
        "theme-3": 2,
      },
      random: () => 0.99,
    });

    expect(result.map((theme) => theme.id)).toEqual(["theme-3"]);
  });

  it("treats a missing memo count as zero", () => {
    const themes = [makeTheme("counted"), makeTheme("missing")];

    const result = selectRandomThemes(themes, 1, {
      memoCounts: { counted: 5 },
      random: () => 0,
    });

    expect(result.map((theme) => theme.id)).toEqual(["missing"]);
  });
});
