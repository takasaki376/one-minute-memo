import { describe, expect, it } from "vitest";

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
});
