import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SettingsRecord } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// openDB をモック
vi.mock("../openDB", () => {
  // biome-ignore lint/suspicious/noExplicitAny: モック用の汎用型
  type Value = any;

  // シンプルなインメモリストア（db.add と transaction.store で共有）
  const store = new Map<string, Value>();

  const createStore = () => ({
    async add(value: Value) {
      store.set(value.id, value);
    },
    async put(value: Value) {
      store.set(value.id, value);
    },
    async get(key: string) {
      return store.get(key);
    },
    async getAll() {
      return Array.from(store.values());
    },
  });

  const db = {
    transaction(_storeName: string, _mode?: "readonly" | "readwrite") {
      return {
        store: createStore(),
        done: Promise.resolve(),
      };
    },
    async add(_storeName: string, value: Value) {
      store.set(value.id, value);
    },
    async get(_storeName: string, key: string) {
      return store.get(key);
    },
  };

  function __reset() {
    store.clear();
  }

  // getDB は常に同じ db を返す
  async function getDB() {
    return db;
  }

  return {
    getDB,
    __reset,
  };
});

// モック定義の後で settingsRepo をインポート
import { getSettings, updateSettings, resetSettings } from "../settingsRepo";

describe("settingsRepo", () => {
  beforeEach(async () => {
    const mod = (await import("../openDB")) as typeof import("../openDB") & {
      __reset: () => void;
    };
    mod.__reset();
  });

  describe("getSettings", () => {
    it("returns default settings when no record exists", async () => {
      const result = await getSettings();

      expect(result.id).toBe("default");
      expect(result.theme_count).toBe(DEFAULT_SETTINGS.theme_count);
      expect(result.time_limit).toBe(DEFAULT_SETTINGS.time_limit);
      expect(result.updatedAt).toBeDefined();
    });

    it("returns existing settings when record exists", async () => {
      // 既存の設定を追加
      const { getDB } = await import("../openDB");
      const db = await getDB();
      const tx = db.transaction("settings", "readwrite");
      const store = tx.store;

      const existingSettings: SettingsRecord = {
        id: "default",
        theme_count: 20,
        time_limit: "120",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      await store.put(existingSettings);
      await tx.done;

      const result = await getSettings();

      expect(result).toEqual(existingSettings);
    });
  });

  describe("updateSettings", () => {
    it("updates theme_count only and preserves time_limit", async () => {
      // 初期設定を作成
      const { getDB } = await import("../openDB");
      const db = await getDB();
      const tx = db.transaction("settings", "readwrite");
      const store = tx.store;

      const initialSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      await store.put(initialSettings);
      await tx.done;

      // theme_count のみ更新
      const result = await updateSettings({ theme_count: 15 });

      expect(result.theme_count).toBe(15);
      expect(result.time_limit).toBe("60"); // 維持される
      expect(result.id).toBe("default");
      expect(result.updatedAt).not.toBe(initialSettings.updatedAt);
    });

    it("updates time_limit only and preserves theme_count", async () => {
      // 初期設定を作成
      const { getDB } = await import("../openDB");
      const db = await getDB();
      const tx = db.transaction("settings", "readwrite");
      const store = tx.store;

      const initialSettings: SettingsRecord = {
        id: "default",
        theme_count: 10,
        time_limit: "60",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      await store.put(initialSettings);
      await tx.done;

      // time_limit のみ更新
      const result = await updateSettings({ time_limit: "90" });

      expect(result.time_limit).toBe("90");
      expect(result.theme_count).toBe(10); // 維持される
      expect(result.id).toBe("default");
      expect(result.updatedAt).not.toBe(initialSettings.updatedAt);
    });

    it("creates default record when updating non-existent record", async () => {
      // レコードが存在しない状態で更新
      const result = await updateSettings({ theme_count: 25 });

      expect(result.theme_count).toBe(25);
      expect(result.time_limit).toBe(DEFAULT_SETTINGS.time_limit);
      expect(result.id).toBe("default");
      expect(result.updatedAt).toBeDefined();

      // 保存されていることを確認
      const saved = await getSettings();
      expect(saved.theme_count).toBe(25);
    });

    it("updates both theme_count and time_limit", async () => {
      const result = await updateSettings({
        theme_count: 30,
        time_limit: "180",
      });

      expect(result.theme_count).toBe(30);
      expect(result.time_limit).toBe("180");
      expect(result.id).toBe("default");
    });
  });

  describe("resetSettings", () => {
    it("resets settings to default values", async () => {
      // カスタム設定を作成
      await updateSettings({ theme_count: 50, time_limit: "300" });

      // リセット
      const result = await resetSettings();

      expect(result.theme_count).toBe(DEFAULT_SETTINGS.theme_count);
      expect(result.time_limit).toBe(DEFAULT_SETTINGS.time_limit);
      expect(result.id).toBe("default");
      expect(result.updatedAt).toBeDefined();

      // 保存されていることを確認
      const saved = await getSettings();
      expect(saved.theme_count).toBe(DEFAULT_SETTINGS.theme_count);
      expect(saved.time_limit).toBe(DEFAULT_SETTINGS.time_limit);
    });

    it("overwrites existing settings with defaults", async () => {
      // 既存の設定を作成
      const { getDB } = await import("../openDB");
      const db = await getDB();
      const tx = db.transaction("settings", "readwrite");
      const store = tx.store;

      const customSettings: SettingsRecord = {
        id: "default",
        theme_count: 100,
        time_limit: "3600",
        updatedAt: "2025-01-10T09:00:00.000Z",
      };

      await store.put(customSettings);
      await tx.done;

      // リセット
      const result = await resetSettings();

      expect(result.theme_count).toBe(DEFAULT_SETTINGS.theme_count);
      expect(result.time_limit).toBe(DEFAULT_SETTINGS.time_limit);
    });
  });
});
