import { AuthApiError } from "./clientApi";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
  authErrorMessage,
  toAuthErrorCode,
} from "./errorContract";

export {
  AUTH_SIGNUP_SUCCESS_MESSAGE,
} from "./errorContract";

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

/** Auth API / Identity Toolkit / Firebase エラーを UI 向け日本語に変換する */
export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    return error.message || authErrorMessage(toAuthErrorCode(error.code));
  }

  const code = errorCodeOf(error);
  if (code) {
    return authErrorMessage(toAuthErrorCode(code));
  }

  if (error instanceof Error) {
    if (error.message.includes("Firebase is not configured")) {
      return AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.NOT_CONFIGURED];
    }
    return error.message;
  }

  return AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL];
}
