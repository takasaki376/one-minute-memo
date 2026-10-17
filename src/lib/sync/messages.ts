import {
  SYNC_ERROR_CODES,
  SYNC_ERROR_MESSAGES,
  syncErrorMessage,
  toSyncErrorCode,
} from "./errorContract";

export const SYNC_LOGIN_REQUIRED_MESSAGE =
  SYNC_ERROR_MESSAGES[SYNC_ERROR_CODES.UNAUTHENTICATED];

export const SYNC_NOT_CONFIGURED_MESSAGE =
  SYNC_ERROR_MESSAGES[SYNC_ERROR_CODES.NOT_CONFIGURED];

export const SYNC_GENERIC_ERROR_MESSAGE =
  SYNC_ERROR_MESSAGES[SYNC_ERROR_CODES.INTERNAL];

export const SYNC_PERMISSION_ERROR_MESSAGE =
  SYNC_ERROR_MESSAGES[SYNC_ERROR_CODES.PERMISSION];

export const SYNC_OTHER_DEVICE_HINT =
  "他の端末で同期された可能性があります。最新データを取り込むには同期してください。";

function errorCodeOf(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function toSyncErrorMessage(error: unknown): string {
  const code = errorCodeOf(error);
  if (code) {
    return syncErrorMessage(toSyncErrorCode(code));
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return SYNC_GENERIC_ERROR_MESSAGE;
}
