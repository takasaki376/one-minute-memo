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

async function parseAuthResult<T>(response: Response): Promise<T> {
  let json: ApiResult<T>;
  try {
    json = (await response.json()) as ApiResult<T>;
  } catch {
    throw new AuthApiError(
      AUTH_ERROR_CODES.INTERNAL,
      authErrorMessage(AUTH_ERROR_CODES.INTERNAL),
    );
  }

  if (!json.success) {
    throw new AuthApiError(json.error.code, json.error.message);
  }

  return json.data;
}

export async function fetchAuthSession(
  fetchImpl: AuthFetch = fetch,
): Promise<SessionUser | null> {
  const response = await fetchImpl("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
  });

  // Invalid cookie: treat as logged out (server already cleared when possible)
  if (response.status === 401) {
    return null;
  }

  const data = await parseAuthResult<AuthSessionData>(response);
  return data.user;
}

export async function postAuthSignIn(
  idToken: string,
  fetchImpl: AuthFetch = fetch,
): Promise<SessionUser> {
  const response = await fetchImpl("/api/auth/signin", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await parseAuthResult<AuthSignInData>(response);
  return data.user;
}

export async function postAuthSignUp(
  email: string,
  password: string,
  fetchImpl: AuthFetch = fetch,
): Promise<{ message: string }> {
  const response = await fetchImpl("/api/auth/signup", {
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
  const response = await fetchImpl("/api/auth/signout", {
    method: "POST",
    credentials: "same-origin",
  });

  await parseAuthResult<AuthSignOutData>(response);
}
