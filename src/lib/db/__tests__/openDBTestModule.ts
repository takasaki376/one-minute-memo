/**
 * vi.mock("../openDB") で __reset 等を返すテスト用モジュールの型付け。
 * 動的 import のたびに交差型を書かずに済ませる。
 */
export type OpenDBTestModule = typeof import("../openDB") & {
  __reset: () => void;
};

export async function importOpenDBTestModule(): Promise<OpenDBTestModule> {
  return (await import("../openDB")) as OpenDBTestModule;
}

/** sessionsRepo 用モック（__seedGetAllExtras を追加） */
export type SessionsOpenDBTestModule = OpenDBTestModule & {
  __seedGetAllExtras: (
    ...extras: (({ id: string } & Record<string, unknown>) | undefined)[]
  ) => void;
};

export async function importOpenDBSessionsTestModule(): Promise<SessionsOpenDBTestModule> {
  return (await import("../openDB")) as SessionsOpenDBTestModule;
}
