import { describe, it, expect, beforeEach, vi } from "vitest";

import { importOpenDBTestModule } from "./openDBTestModule";

vi.mock("../openDB", () => {
  type Value = Record<string, unknown> & { id: string };

  const store = new Map<string, Value>();

  const createStore = () => ({
    async put(value: Value) {
      store.set(value.id, value);
    },
    async get(key: string) {
      return store.get(key);
    },
    async getAll() {
      return Array.from(store.values());
    },
    async getAllFromIndex(indexName: string, key: unknown) {
      if (indexName !== "by_isActive") return [];
      const results: Value[] = [];
      for (const value of store.values()) {
        if (value.isActiveIndex === key) {
          results.push(value);
        }
      }
      return results;
    },
    async openCursor() {
      const values = Array.from(store.values());
      let idx = 0;

      const makeCursor = (value: Value) => ({
        value,
        async continue() {
          idx += 1;
          const next = values[idx];
          return next ? makeCursor(next) : null;
        },
      });

      const first = values[0];
      return first ? makeCursor(first) : null;
    },
  });

  const db = {
    transaction(_storeName: string, _mode?: "readonly" | "readwrite") {
      void _mode;
      return {
        store: createStore(),
        done: Promise.resolve(),
      };
    },
    async getAll(_storeName: string) {
      void _storeName;
      return Array.from(store.values());
    },
    async getAllFromIndex(_storeName: string, indexName: string, key: unknown) {
      void _storeName;
      return createStore().getAllFromIndex(indexName, key);
    },
  };

  function __reset() {
    store.clear();
  }

  async function getDB() {
    return db;
  }

  return { getDB, __reset };
});

import {
  initBuiltinThemesIfNeeded,
  getAllThemes,
  getActiveThemes,
  getThemesByIds,
  toggleThemeActive,
  createUserTheme,
  updateTheme,
  importUserThemesFromCsvRows,
} from "../themesRepo";

describe("themesRepo initBuiltinThemesIfNeeded", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  it("seeds builtin themes when store is empty", async () => {
    await initBuiltinThemesIfNeeded();
    const all = await getAllThemes();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((t) => t.source === "builtin")).toBe(true);
  });

  it("does not seed again when builtin themes already exist", async () => {
    await initBuiltinThemesIfNeeded();
    const first = await getAllThemes();

    await initBuiltinThemesIfNeeded();
    const second = await getAllThemes();

    expect(second).toHaveLength(first.length);
  });

  it("seeds builtin themes even if user themes exist but no builtin exists", async () => {
    // Preload only user themes to simulate "user-first" data.
    const { getDB } = await import("../openDB");
    const db = await getDB();
    const tx = db.transaction("themes", "readwrite");
    await tx.store.put({
      id: "user-1",
      title: "User theme",
      category: "user",
      isActive: true,
      source: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      isActiveIndex: 1,
    });
    await tx.done;

    await initBuiltinThemesIfNeeded();
    const all = await getAllThemes();
    expect(all.some((t) => t.source === "user")).toBe(true);
    expect(all.some((t) => t.source === "builtin")).toBe(true);
  });
});

describe("themesRepo createUserTheme", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  it("creates a user theme with generated id and timestamps", async () => {
    const created = await createUserTheme({
      title: "  私のテーマ  ",
      category: " 試行 ",
      isActive: true,
    });
    expect(created.id.startsWith("user-theme-")).toBe(true);
    expect(created.title).toBe("私のテーマ");
    expect(created.category).toBe("試行");
    expect(created.source).toBe("user");
    expect(created.isActive).toBe(true);
    expect(typeof created.createdAt).toBe("string");
    expect(typeof created.updatedAt).toBe("string");

    const all = await getAllThemes();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
  });

  it("uses 未分類 when category is empty", async () => {
    await createUserTheme({
      title: "Only title",
      category: "   ",
      isActive: false,
    });
    const all = await getAllThemes();
    expect(all[0].category).toBe("未分類");
  });

  it("throws when title is empty", async () => {
    await expect(
      createUserTheme({ title: "  ", category: "", isActive: true }),
    ).rejects.toThrow(/テーマ名/);
  });

  it("throws when duplicate title exists", async () => {
    await createUserTheme({
      title: "Same",
      category: "a",
      isActive: true,
    });
    await expect(
      createUserTheme({
        title: "same",
        category: "b",
        isActive: true,
      }),
    ).rejects.toThrow(/同じ名前/);
  });
});

describe("themesRepo updateTheme", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  it("updates title, category, isActive and bumps updatedAt", async () => {
    const created = await createUserTheme({
      title: "Old",
      category: "Cat",
      isActive: true,
    });
    const updated = await updateTheme(created.id, {
      title: "New name",
      category: "Next",
      isActive: false,
    });
    expect(updated.id).toBe(created.id);
    expect(updated.source).toBe("user");
    expect(updated.title).toBe("New name");
    expect(updated.category).toBe("Next");
    expect(updated.isActive).toBe(false);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("throws when duplicate title is taken by another theme", async () => {
    const a = await createUserTheme({
      title: "A",
      category: "x",
      isActive: true,
    });
    const b = await createUserTheme({
      title: "B",
      category: "y",
      isActive: true,
    });
    await expect(
      updateTheme(b.id, {
        title: "a",
        category: "z",
        isActive: true,
      }),
    ).rejects.toThrow(/同じ名前/);
    expect(a.title).toBe("A");
  });

  it("throws when theme id is missing", async () => {
    await expect(
      updateTheme("missing-id", {
        title: "X",
        category: "y",
        isActive: true,
      }),
    ).rejects.toThrow(/見つかりません/);
  });
});

describe("themesRepo importUserThemesFromCsvRows", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  it("imports valid rows and reports duplicate failures individually", async () => {
    await createUserTheme({
      title: "既存テーマ",
      category: "仕事",
      isActive: true,
    });

    const summary = await importUserThemesFromCsvRows([
      { lineNumber: 2, title: "新規A", category: "仕事" },
      { lineNumber: 3, title: "既存テーマ", category: "仕事" },
      { lineNumber: 4, title: "新規B", category: "新カテゴリ" },
    ]);

    expect(summary.successCount).toBe(2);
    expect(summary.failureCount).toBe(1);
    expect(summary.results[1]).toMatchObject({
      lineNumber: 3,
      ok: false,
    });

    const all = await getAllThemes();
    expect(all).toHaveLength(3);
    expect(all.some((t) => t.category === "新カテゴリ")).toBe(true);
  });

  it("reports duplicates within imported rows without writing partial duplicates", async () => {
    const summary = await importUserThemesFromCsvRows([
      { lineNumber: 2, title: "新規A", category: "仕事" },
      { lineNumber: 3, title: "  新規A  ", category: "別カテゴリ" },
      { lineNumber: 4, title: "新規B", category: "新カテゴリ" },
    ]);

    expect(summary.successCount).toBe(2);
    expect(summary.failureCount).toBe(1);
    expect(summary.results).toMatchObject([
      { lineNumber: 2, ok: true },
      {
        lineNumber: 3,
        ok: false,
        error: "同じ名前のテーマが既に存在します",
      },
      { lineNumber: 4, ok: true },
    ]);

    const all = await getAllThemes();
    expect(all).toHaveLength(2);
    expect(all.map((theme) => theme.title)).toEqual(["新規A", "新規B"]);
  });
});

describe("themesRepo read and toggle", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  it("getActiveThemes returns only active themes", async () => {
    await createUserTheme({
      title: "Active Theme",
      category: "work",
      isActive: true,
    });
    await createUserTheme({
      title: "Inactive Theme",
      category: "life",
      isActive: false,
    });

    const active = await getActiveThemes();

    expect(active).toHaveLength(1);
    expect(active[0]?.title).toBe("Active Theme");
  });

  it("getThemesByIds returns matching themes and ignores missing ids", async () => {
    const created = await createUserTheme({
      title: "Find Me",
      category: "work",
      isActive: true,
    });

    const themes = await getThemesByIds([created.id, "missing-id", created.id]);

    expect(themes).toHaveLength(1);
    expect(themes[0]?.id).toBe(created.id);
  });

  it("getThemesByIds returns empty array for empty input", async () => {
    expect(await getThemesByIds([])).toEqual([]);
  });

  it("toggleThemeActive updates isActive flag", async () => {
    const created = await createUserTheme({
      title: "Toggle Me",
      category: "work",
      isActive: true,
    });

    await toggleThemeActive(created.id, false);

    const all = await getAllThemes();
    const updated = all.find((t) => t.id === created.id);
    expect(updated?.isActive).toBe(false);

    const active = await getActiveThemes();
    expect(active.some((t) => t.id === created.id)).toBe(false);
  });
});
