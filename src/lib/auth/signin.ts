import "server-only";

import type { SessionUser } from "@/types/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { AuthNotConfiguredError } from "./authErrors";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";
import { decodedIdTokenToSessionUser } from "./sessionUser";

export type SignInSessionResult = {
  user: SessionUser;
  sessionCookie: string;
};

/**
 * Contract flow (PJ1-199-01):
 * 1. verifyIdToken(idToken)
 * 2. createSessionCookie(idToken)
 * Cookie Set-Cookie is applied by the Route Handler via setAuthCookie.
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
