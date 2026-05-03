import { describe, it, expect, beforeEach, vi } from "vitest";

import { importOpenDBTestModule } from "./openDBTestModule";

// memosRepo から見ると './openDB' をインポートしているので、
// テストからは '../openDB' をモックする
vi.mock("../openDB", () => {
  type Value = Record<string, unknown>;

  // シンプルなインメモリストア（memos専用）
  const store = new Map<string, Value>();

  // index をシミュレート
  const createIndex = (indexName: string) => ({
    async getAll(key: string) {
      const results: Value[] = [];
      for (const value of store.values()) {
        if (indexName === "by_sessionId" && value.sessionId === key) {
          results.push(value);
        }
        if (indexName === "by_themeId" && value.themeId === key) {
          results.push(value);
        }
      }
      return results;
    },
  });

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
      return Array.from(store.values());
    },
    async delete(key: string) {
      store.delete(key);
    },
    index(indexName: string) {
      return createIndex(indexName);
    },
  });

  const db = {
    transaction(_storeName: string, _mode?: "readonly" | "readwrite") {
      return {
        store: createStore(),
        done: Promise.resolve(),
      };
    },
    async put(_storeName: string, value: Value) {
      store.set(value.id as string, value);
    },
    async get(_storeName: string, key: string) {
      return store.get(key);
    },
    async getAll(_storeName: string) {
      void _storeName;
      return Array.from(store.values());
    },
  };

  function __reset() {
    store.clear();
  }

  async function getDB() {
    return db;
  }

  return {
    getDB,
    __reset,
  };
});

// モック定義の後で memosRepo をインポート
import {
  saveMemo,
  getAllMemos,
  getMemosBySession,
  getMemosByTheme,
  deleteMemosBySession,
} from "../memosRepo";

describe("memosRepo", () => {
  beforeEach(async () => {
    const mod = await importOpenDBTestModule();
    mod.__reset();
  });

  describe("saveMemo", () => {
    it("新しいメモを作成できる（id 自動生成）", async () => {
      const input = {
        sessionId: "s1",
        themeId: "t1",
        order: 1,
        textContent: "テストメモ",
        handwritingType: "none" as const,
        handwritingDataUrl: undefined,
      };

      const result = await saveMemo(input);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.sessionId).toBe("s1");
      expect(result.themeId).toBe("t1");
      expect(result.order).toBe(1);
      expect(result.textContent).toBe("テストメモ");
      expect(result.handwritingType).toBe("none");
      expect(result.handwritingDataUrl).toBeUndefined();
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");
    });

    it("id を指定してメモを作成できる", async () => {
      const input = {
        id: "memo-custom-id",
        sessionId: "s1",
        themeId: "t1",
        order: 1,
        textContent: "カスタムIDのメモ",
        handwritingType: "none" as const,
      };

      const result = await saveMemo(input);

      expect(result.id).toBe("memo-custom-id");
      expect(result.textContent).toBe("カスタムIDのメモ");
    });

    it("同じ id を指定して saveMemo すると上書き保存される", async () => {
      const base = {
        id: "memo-1",
        sessionId: "s1",
        themeId: "t1",
        order: 1,
        textContent: "最初のテキスト",
        handwritingType: "none" as const,
      };

      const first = await saveMemo(base);

      // updatedAt が異なることを確実にするため、少し待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await saveMemo({
        ...base,
        textContent: "上書き後のテキスト",
      });

      // id は変わらない
      expect(second.id).toBe(first.id);
      // テキストは上書きされている
      expect(second.textContent).toBe("上書き後のテキスト");
      // createdAt は最初のレコードから保持される
      expect(second.createdAt).toBe(first.createdAt);
      // updatedAt は更新される（新しい値になる）
      expect(second.updatedAt).not.toBe(first.updatedAt);
      expect(new Date(second.updatedAt).getTime()).toBeGreaterThan(
        new Date(first.updatedAt).getTime(),
      );
    });
  });

  describe("getAllMemos", () => {
    it("すべてのメモを createdAt 降順で返す", async () => {
      await saveMemo({
        sessionId: "s1",
        themeId: "t1",
        order: 1,
        textContent: "古い",
        handwritingType: "none",
      });
      await new Promise((r) => setTimeout(r, 15));
      await saveMemo({
        sessionId: "s1",
        themeId: "t1",
        order: 2,
        textContent: "新しい",
        handwritingType: "none",
      });

      const all = await getAllMemos();
      expect(all.map((m) => m.textContent)).toEqual(["新しい", "古い"]);
    });
  });

  describe("getMemosBySession", () => {
    it("特定セッションのメモだけ取得できる", async () => {
      // s1 に 2 件
      await saveMemo({
        sessionId: "s1",
        themeId: "t1",
        order: 2,
        textContent: "s1-2",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s1",
        themeId: "t2",
        order: 1,
        textContent: "s1-1",
        handwritingType: "none",
      });

      // s2 に 1 件
      await saveMemo({
        sessionId: "s2",
        themeId: "t3",
        order: 1,
        textContent: "s2-1",
        handwritingType: "none",
      });

      const s1Memos = await getMemosBySession("s1");
      const s2Memos = await getMemosBySession("s2");
      const s3Memos = await getMemosBySession("s3"); // 存在しない

      expect(s1Memos).toHaveLength(2);
      expect(s2Memos).toHaveLength(1);
      expect(s3Memos).toHaveLength(0);
    });

    it("order 昇順で並んで返される", async () => {
      await saveMemo({
        sessionId: "s1",
        themeId: "t1",
        order: 3,
        textContent: "third",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s1",
        themeId: "t2",
        order: 1,
        textContent: "first",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s1",
        themeId: "t3",
        order: 2,
        textContent: "second",
        handwritingType: "none",
      });

      const memos = await getMemosBySession("s1");

      expect(memos).toHaveLength(3);
      expect(memos[0].order).toBe(1);
      expect(memos[0].textContent).toBe("first");
      expect(memos[1].order).toBe(2);
      expect(memos[1].textContent).toBe("second");
      expect(memos[2].order).toBe(3);
      expect(memos[2].textContent).toBe("third");
    });

    it("メモがひとつも無いセッションIDの場合は空配列を返す", async () => {
      const memos = await getMemosBySession("no-memo-session");
      expect(Array.isArray(memos)).toBe(true);
      expect(memos).toHaveLength(0);
    });
  });

  describe("getMemosByTheme", () => {
    it("特定テーマのメモを取得できる", async () => {
      await saveMemo({
        sessionId: "s1",
        themeId: "theme-a",
        order: 1,
        textContent: "theme-a memo 1",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s2",
        themeId: "theme-a",
        order: 1,
        textContent: "theme-a memo 2",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s1",
        themeId: "theme-b",
        order: 2,
        textContent: "theme-b memo",
        handwritingType: "none",
      });

      const themeAMemos = await getMemosByTheme("theme-a");
      const themeBMemos = await getMemosByTheme("theme-b");
      const themeCMemos = await getMemosByTheme("theme-c");

      expect(themeAMemos).toHaveLength(2);
      expect(themeBMemos).toHaveLength(1);
      expect(themeCMemos).toHaveLength(0);
    });
  });

  describe("deleteMemosBySession", () => {
    it("指定セッションのメモをすべて削除できる", async () => {
      await saveMemo({
        sessionId: "s1",
        themeId: "t1",
        order: 1,
        textContent: "s1 memo 1",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s1",
        themeId: "t2",
        order: 2,
        textContent: "s1 memo 2",
        handwritingType: "none",
      });
      await saveMemo({
        sessionId: "s2",
        themeId: "t3",
        order: 1,
        textContent: "s2 memo",
        handwritingType: "none",
      });

      // 削除前
      const beforeS1 = await getMemosBySession("s1");
      const beforeS2 = await getMemosBySession("s2");
      expect(beforeS1).toHaveLength(2);
      expect(beforeS2).toHaveLength(1);

      // s1 のメモを削除
      await deleteMemosBySession("s1");

      // 削除後
      const afterS1 = await getMemosBySession("s1");
      const afterS2 = await getMemosBySession("s2");
      expect(afterS1).toHaveLength(0);
      expect(afterS2).toHaveLength(1); // s2 は影響なし
    });

    it("存在しないセッションを指定しても例外にならない", async () => {
      await expect(
        deleteMemosBySession("non-existent-session"),
      ).resolves.toBeUndefined();
    });
  });
});
