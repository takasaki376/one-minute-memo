import { FirebaseError } from "firebase/app";

import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
  authErrorMessage,
  toAuthErrorCode,
} from "./errorContract";

export {
  AUTH_SIGNUP_SUCCESS_MESSAGE,
} from "./errorContract";

/** Firebase Auth エラーをユーザー向け日本語メッセージに変換する */
export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return authErrorMessage(toAuthErrorCode(error.code));
  }

  if (error instanceof Error) {
    if (error.message.includes("Firebase is not configured")) {
      return AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.NOT_CONFIGURED];
    }
    return error.message;
  }

  return AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL];
}
