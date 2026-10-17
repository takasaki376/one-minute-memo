import "server-only";

import type { SessionUser } from "@/types/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { AuthNotConfiguredError } from "./authErrors";
import { fetchIdTokenWithPassword } from "./identityToolkit";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";
import { decodedIdTokenToSessionUser } from "./sessionUser";

export type SignInSessionResult = {
  user: SessionUser;
  sessionCookie: string;
};

/**
 * Contract flow (PJ1-201):
 * 1. Identity Toolkit REST (server) → idToken
 * 2. verifyIdToken(idToken)
 * 3. createSessionCookie(idToken)
 * Cookie Set-Cookie is applied by the Route Handler via setAuthCookie.
 */
export async function signInWithPassword(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SignInSessionResult> {
  const idToken = await fetchIdTokenWithPassword(email, password, fetchImpl);
  return signInWithIdToken(idToken);
}

/**
 * Verify an ID token and create a session cookie.
 * Kept for tests and any caller that already holds an idToken.
 */
export async function signInWithIdToken(
  idToken: string,
): Promise<SignInSessionResult> {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new AuthNotConfiguredError();
  }

  const decoded = await auth.verifyIdToken(idToken);
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: AUTH_SESSION_COOKIE.maxAgeSeconds * 1000,
  });

  return {
    user: decodedIdTokenToSessionUser(decoded),
    sessionCookie,
  };
}
