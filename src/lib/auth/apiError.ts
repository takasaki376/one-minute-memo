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
    case AUTH_ERROR_CODES.INVALID_CREDENTIAL:
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

export function asAuthErrorCode(code: string): AuthErrorCode {
  const codes = Object.values(AUTH_ERROR_CODES) as string[];
  return codes.includes(code)
    ? (code as AuthErrorCode)
    : AUTH_ERROR_CODES.INTERNAL;
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

/**
 * Sign-in (verifyIdToken / createSessionCookie) failures map to
 * AUTH_INVALID_CREDENTIAL per PJ1-199-01, except infra / account-state codes.
 * Without this, auth/argument-error becomes AUTH_VALIDATION (400).
 */
export function toSignInApiError(error: unknown): ApiFailure {
  if (error instanceof AuthNotConfiguredError) {
    return fail(
      AUTH_ERROR_CODES.NOT_CONFIGURED,
      authErrorMessage(AUTH_ERROR_CODES.NOT_CONFIGURED),
    );
  }

  const failure = toAuthApiError(error);
  if (
    failure.error.code === AUTH_ERROR_CODES.TOO_MANY_REQUESTS ||
    failure.error.code === AUTH_ERROR_CODES.USER_DISABLED
  ) {
    return failure;
  }

  return fail(
    AUTH_ERROR_CODES.INVALID_CREDENTIAL,
    authErrorMessage(AUTH_ERROR_CODES.INVALID_CREDENTIAL),
  );
}
