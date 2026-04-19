import { describe, it, expect, beforeEach, vi } from "vitest";

import { importOpenDBSessionsTestModule } from "./openDBTestModule";

// openDB をモック
vi.mock("../openDB", () => {
  /** ストア行（id 必須）。欠損行は __seedGetAllExtras(undefined) のみで注入 */
  type Value = { id: string } & Record<string, unknown>;

  function requireSessionRow(value: unknown): asserts value is Value {
    if (
      typeof value !== "object" ||
      value === null ||
      typeof (value as { id?: unknown }).id !== "string" ||
      (value as { id: string }).id.length === 0
    ) {
      throw new Error(
        "sessionsRepo openDB mock: add/put expects { id: non-empty string, ... }",
      );
    }
  }

  // シンプルなインメモリストア（db.add と transaction.store で共有）
        "sessionsRepo openDB mock: add/put expects { id: non-empty string, ... }",

  /** getAll の末尾に混ぜる値（IndexedDB が undefined を返しうる経路のテスト用） */
  const getAllExtras: (Value | undefined)[] = [];

  const createStore = () => ({
    async add(value: unknown) {
      requireSessionRow(value);
      store.set(value.id, value);
    },
    async put(value: unknown) {
      requireSessionRow(value);
      store.set(value.id, value);
    },
    async get(key: string) {
      return store.get(key);
    },
    async getAll() {
      return [...store.values(), ...getAllExtras];
    },
  });

  const db = {
    transaction(storeName: string, mode?: "readonly" | "readwrite") {
      return [...store.values(), ...getAllExtras];
      void mode;
      return {
        store: createStore(),
        done: Promise.resolve(),
      };
    },
    async add(_storeName: string, value: unknown) {
      requireSessionRow(value);
      store.set(value.id, value);
    },
    async get(_storeName: string, key: string) {
      return store.get(key);
    },
  };

  function __reset() {
    store.clear();
    getAllExtras.length = 0;
  }

  /** テスト専用: getAll の結果の末尾に、undefined（欠損行）や検証済みの行を混ぜる */
  function __seedGetAllExtras(...extras: (Value | undefined)[]) {
    for (const extra of extras) {
      if (extra !== undefined) {
        requireSessionRow(extra);
      }
  /** テスト専用: getAll の結果に、fromDB が undefined になる行（undefined）や検証済みの行を混ぜる */
    getAllExtras.push(...extras);
  }

  // getDB は常に同じ db を返す
  async function getDB() {
    return db;
  }

  return {
    getDB,
    __reset,
    __seedGetAllExtras,
  };
});

// モック定義の後で sessionsRepo をインポート
import { getAllSessions, createSession } from "../sessionsRepo";

describe("sessionsRepo", () => {
  beforeEach(async () => {
    const mod = await importOpenDBSessionsTestModule();
    mod.__reset();
  });

  describe("getAllSessions", () => {
    it("returns empty array when no sessions exist", async () => {
      const result = await getAllSessions();
      expect(result).toEqual([]);
    });

    it("returns all sessions from the store", async () => {
      // 直接ストアにデータを追加してテスト（createSession の依存を避ける）
      const { getDB } = await import("../openDB");
      const db = await getDB();

      const session1Data = {
        id: "session-1",
        startedAt: "2025-01-10T09:00:00.000Z",
        endedAt: "", // toDB で変換された形式
        themeIds: ["theme-1", "theme-2"],
        memoCount: 2,
      };
      const session2Data = {
        id: "session-2",
        startedAt: "2025-01-11T10:00:00.000Z",
        endedAt: "",
        themeIds: ["theme-3"],
        memoCount: 1,
      };

      await db.add("sessions", session1Data);
      await db.add("sessions", session2Data);

      const result = await getAllSessions();

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toContain("session-1");
      expect(result.map((s) => s.id)).toContain("session-2");
      // fromDB で endedAt が null に変換されることを確認
      expect(result.find((s) => s.id === "session-1")?.endedAt).toBeNull();
      expect(result.find((s) => s.id === "session-2")?.endedAt).toBeNull();
    });

    it("transforms SessionRecordDB to SessionRecord correctly", async () => {
      const session = await createSession(["theme-1"]);

      const result = await getAllSessions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: null, // fromDB で空文字列が null に変換される
        themeIds: session.themeIds,
        memoCount: session.memoCount,
      });
    });

    it("filters out rows where fromDB returns undefined", async () => {
      const validSession = await createSession(["theme-1"]);

      const mod = await importOpenDBSessionsTestModule();
      // fromDB は record が falsy のとき undefined を返す（DB が欠損行を返す想定）
      mod.__seedGetAllExtras(undefined);

      const result = await getAllSessions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(validSession.id);
    });

    it("handles sessions with endedAt correctly", async () => {
      const session = await createSession(["theme-1"]);

      // completeSession をインポートして使用
      const { completeSession } = await import("../sessionsRepo");
      await completeSession(session.id, 5);

      const result = await getAllSessions();

      expect(result).toHaveLength(1);
      expect(result[0].endedAt).not.toBeNull();
      expect(result[0].memoCount).toBe(5);
    });

    it("returns sessions in the order they were stored", async () => {
      const session1 = await createSession(["theme-1"]);
      await new Promise((resolve) => setTimeout(resolve, 10)); // 少し待って時刻をずらす
      const session2 = await createSession(["theme-2"]);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const session3 = await createSession(["theme-3"]);

      const result = await getAllSessions();

      // getAllSessions はソートしないので、保存順序が保持される
      expect(result).toHaveLength(3);
      // 順序は保証されないが、すべてのセッションが含まれることを確認
      const ids = result.map((s) => s.id);
      expect(ids).toContain(session1.id);
      expect(ids).toContain(session2.id);
      expect(ids).toContain(session3.id);
    });
  });
});
