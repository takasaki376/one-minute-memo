/**
 * Firestore は undefined をフィールド値として受け付けない。
 * 同期アップロード前に除外する。
 */
export function stripUndefinedFields<T extends Record<string, unknown>>(
  data: T,
): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}
