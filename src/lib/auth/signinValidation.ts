import {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
} from "./errorContract";

export type SigninValidationSuccess = {
  ok: true;
  idToken: string;
};

export type SigninValidationFailure = {
  ok: false;
  code: AuthErrorCode;
};

export type SigninValidationResult =
  | SigninValidationSuccess
  | SigninValidationFailure;

export function validateSigninBody(body: unknown): SigninValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, code: AUTH_ERROR_CODES.VALIDATION };
  }

  const idToken = (body as Record<string, unknown>).idToken;
  if (typeof idToken !== "string" || idToken.trim().length === 0) {
    return { ok: false, code: AUTH_ERROR_CODES.VALIDATION };
  }

  return { ok: true, idToken: idToken.trim() };
}
