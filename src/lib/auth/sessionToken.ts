import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { AuthNotConfiguredError } from "./authErrors";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";

export { AuthNotConfiguredError } from "./authErrors";
export { decodedIdTokenToSessionUser } from "./sessionUser";

export async function createSessionCookieFromIdToken(
  idToken: string,
): Promise<string> {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new AuthNotConfiguredError();
  }

  return auth.createSessionCookie(idToken, {
    expiresIn: AUTH_SESSION_COOKIE.maxAgeSeconds * 1000,
  });
}

export async function verifyAuthSessionCookie(
  sessionCookie: string,
): Promise<DecodedIdToken> {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new AuthNotConfiguredError();
  }

  return auth.verifySessionCookie(sessionCookie, true);
}
