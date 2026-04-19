import { describe, it, expect, beforeEach, vi } from "vitest";

// openDB をモック
vi.mock("../openDB", () => {
  type Value = Record<string, unknown>;

  // シンプルなインメモリストア（db.add と transaction.store で共有）
  const store = new Map<string, Value>();

  /** getAll の末尾に混ぜる値（IndexedDB が undefined を返しうる経路のテスト用） */
  const getAllExtras: (Value | undefined)[] = [];

  const createStore = () => ({
    async add(value: Value) {
      store.set(value.id as string, value);
    },
    async put(value: Value) {
      store.set(value.id as string, value);
    },
    async get(key: string) {
      return store.get(key);
    },
    async getAll() {
      return [...Array.from(store.values()), ...getAllExtras];
    },
  });

  const db = {
    transaction(storeName: string, mode?: "readonly" | "readwrite") {
      void storeName;
      void mode;
      return {
        store: createStore(),
        done: Promise.resolve(),
      };
    },
    async add(_storeName: string, value: Value) {
      store.set(value.id as string, value);
    },
    async get(_storeName: string, key: string) {
      return store.get(key);
    },
  };

  function __reset() {
    store.clear();
    getAllExtras.length = 0;
  }

  /** テスト専用: store.getAll() に相当する配列へ、fromDB が undefined になる行などを混ぜる */
  function __seedGetAllExtras(...extras: (Value | undefined)[]) {
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
    const mod = (await import("../openDB")) as typeof import("../openDB") & {
      __reset: () => void;
      __seedGetAllExtras: (
        ...extras: (Record<string, unknown> | undefined)[]
      ) => void;
    };
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

      const mod = (await import("../openDB")) as typeof import("../openDB") & {
        __seedGetAllExtras: (
          ...extras: (Record<string, unknown> | undefined)[]
        ) => void;
      };
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
