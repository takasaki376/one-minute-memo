import type {
  AuthSignInData,
  AuthSignOutData,
  AuthSignUpData,
  AuthSessionData,
  SessionUser,
} from "@/types/auth";
import type { ApiResult } from "@/types/api";

import { AUTH_ERROR_CODES, authErrorMessage } from "./errorContract";

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class AuthApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

function internalAuthError(): AuthApiError {
  return new AuthApiError(
    AUTH_ERROR_CODES.INTERNAL,
    authErrorMessage(AUTH_ERROR_CODES.INTERNAL),
  );
}

function networkAuthError(): AuthApiError {
  return new AuthApiError(
    AUTH_ERROR_CODES.NETWORK,
    authErrorMessage(AUTH_ERROR_CODES.NETWORK),
  );
}

async function authFetch(
  fetchImpl: AuthFetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetchImpl(input, init);
  } catch {
    throw networkAuthError();
  }
}

async function parseAuthResult<T>(response: Response): Promise<T> {
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw internalAuthError();
  }

  if (!json || typeof json !== "object" || !("success" in json)) {
    throw internalAuthError();
  }

  const result = json as ApiResult<T>;
  if (!result.success) {
    const code =
      result.error && typeof result.error.code === "string"
        ? result.error.code
        : AUTH_ERROR_CODES.INTERNAL;
    const message =
      result.error && typeof result.error.message === "string"
        ? result.error.message
        : authErrorMessage(AUTH_ERROR_CODES.INTERNAL);
    throw new AuthApiError(code, message);
  }

  return result.data;
}

export async function fetchAuthSession(
  fetchImpl: AuthFetch = fetch,
): Promise<AuthSessionData> {
  const response = await authFetch(fetchImpl, "/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
  });

  // Invalid cookie: treat as logged out (server already cleared when possible)
  if (response.status === 401) {
    return { user: null, configured: true };
  }

  if (!response.ok) {
    try {
      const failure = (await response.clone().json()) as ApiResult<unknown>;
      if (
        !failure.success &&
        failure.error?.code === AUTH_ERROR_CODES.NOT_CONFIGURED
      ) {
        return { user: null, configured: false };
      }
    } catch {
      // fall through to parseAuthResult
    }
  }

  return parseAuthResult<AuthSessionData>(response);
}

export async function postAuthSignIn(
  email: string,
  password: string,
  fetchImpl: AuthFetch = fetch,
): Promise<SessionUser> {
  const response = await authFetch(fetchImpl, "/api/auth/signin", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseAuthResult<AuthSignInData>(response);
  return data.user;
}

export async function postAuthSignUp(
  email: string,
  password: string,
  fetchImpl: AuthFetch = fetch,
): Promise<{ message: string }> {
  const response = await authFetch(fetchImpl, "/api/auth/signup", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseAuthResult<AuthSignUpData>(response);
  return { message: data.message };
}

export async function postAuthSignOut(
  fetchImpl: AuthFetch = fetch,
): Promise<void> {
  const response = await authFetch(fetchImpl, "/api/auth/signout", {
    method: "POST",
    credentials: "same-origin",
  });

  await parseAuthResult<AuthSignOutData>(response);
}
