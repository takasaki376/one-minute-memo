import {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
} from "./errorContract";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export type SignupValidationSuccess = {
  ok: true;
  email: string;
  password: string;
};

export type SignupValidationFailure = {
  ok: false;
  code: AuthErrorCode;
};

export type SignupValidationResult =
  | SignupValidationSuccess
  | SignupValidationFailure;

export function validateSignupBody(body: unknown): SignupValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, code: AUTH_ERROR_CODES.VALIDATION };
  }

  const record = body as Record<string, unknown>;
  const email = record.email;
  const password = record.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, code: AUTH_ERROR_CODES.VALIDATION };
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || password.length === 0) {
    return { ok: false, code: AUTH_ERROR_CODES.VALIDATION };
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { ok: false, code: AUTH_ERROR_CODES.INVALID_EMAIL };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, code: AUTH_ERROR_CODES.WEAK_PASSWORD };
  }

  return { ok: true, email: trimmedEmail, password };
}
