import type { ApiFailure } from "@/types/api";

import { fail } from "@/lib/api/envelope";

import {
  AUTH_ERROR_CODES,
  authErrorMessage,
  toAuthErrorCode,
  type AuthErrorCode,
} from "./errorContract";
import { AuthNotConfiguredError } from "./authErrors";

function extractFirebaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

export function authErrorHttpStatus(code: AuthErrorCode): number {
  switch (code) {
    case AUTH_ERROR_CODES.UNAUTHENTICATED:
      return 401;
    case AUTH_ERROR_CODES.VALIDATION:
    case AUTH_ERROR_CODES.INVALID_EMAIL:
    case AUTH_ERROR_CODES.WEAK_PASSWORD:
      return 400;
    case AUTH_ERROR_CODES.NOT_CONFIGURED:
    case AUTH_ERROR_CODES.INTERNAL:
    case AUTH_ERROR_CODES.NETWORK:
      return 500;
    default:
      return 400;
  }
}

export function toAuthApiError(error: unknown): ApiFailure {
  if (error instanceof AuthNotConfiguredError) {
    return fail(
      AUTH_ERROR_CODES.NOT_CONFIGURED,
      authErrorMessage(AUTH_ERROR_CODES.NOT_CONFIGURED),
    );
  }

  const firebaseCode = extractFirebaseErrorCode(error);
  if (firebaseCode) {
    const code = toAuthErrorCode(firebaseCode);
    return fail(code, authErrorMessage(code));
  }

  return fail(
    AUTH_ERROR_CODES.INTERNAL,
    authErrorMessage(AUTH_ERROR_CODES.INTERNAL),
  );
}
