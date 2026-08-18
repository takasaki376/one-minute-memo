import { FirebaseError } from "firebase/app";

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

export function toSyncErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return syncErrorMessage(toSyncErrorCode(error.code));
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return SYNC_GENERIC_ERROR_MESSAGE;
}
