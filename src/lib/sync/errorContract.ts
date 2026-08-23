export const SYNC_ERROR_CODES = {
  UNAUTHENTICATED: "SYNC_UNAUTHENTICATED",
  NOT_CONFIGURED: "SYNC_NOT_CONFIGURED",
  PERMISSION: "SYNC_PERMISSION",
  UNAVAILABLE: "SYNC_UNAVAILABLE",
  VALIDATION: "SYNC_VALIDATION",
  INTERNAL: "SYNC_INTERNAL",
} as const;

export type SyncErrorCode =
  (typeof SYNC_ERROR_CODES)[keyof typeof SYNC_ERROR_CODES];

export const SYNC_ERROR_MESSAGES: Record<SyncErrorCode, string> = {
  SYNC_UNAUTHENTICATED: "データ同期を利用するにはログインしてください",
  SYNC_NOT_CONFIGURED: "Firebase が未設定のため同期できません",
  SYNC_PERMISSION:
    "同期の権限がありません。再ログインするか、Firebase の設定を確認してください",
  SYNC_UNAVAILABLE:
    "Firestore に接続できませんでした。ネットワークを確認してください",
  SYNC_VALIDATION: "同期リクエストの形式が正しくありません",
  SYNC_INTERNAL:
    "同期に失敗しました。しばらくしてから再度お試しください",
};

const FIRESTORE_CODE_MAP: Record<string, SyncErrorCode> = {
  unauthenticated: SYNC_ERROR_CODES.UNAUTHENTICATED,
  "permission-denied": SYNC_ERROR_CODES.PERMISSION,
  unavailable: SYNC_ERROR_CODES.UNAVAILABLE,
  "deadline-exceeded": SYNC_ERROR_CODES.UNAVAILABLE,
};

export function toSyncErrorCode(
  firebaseCode: string | undefined,
): SyncErrorCode {
  if (!firebaseCode) {
    return SYNC_ERROR_CODES.INTERNAL;
  }
  return FIRESTORE_CODE_MAP[firebaseCode] ?? SYNC_ERROR_CODES.INTERNAL;
}

export function syncErrorMessage(code: SyncErrorCode): string {
  return SYNC_ERROR_MESSAGES[code];
}
