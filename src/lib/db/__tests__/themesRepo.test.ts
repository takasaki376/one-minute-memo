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
  createUserTheme,
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

