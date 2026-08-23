import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import type { SessionUser } from "@/types/auth";

import { AUTH_ERROR_CODES } from "./errorContract";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";

export class AuthNotConfiguredError extends Error {
  readonly code = AUTH_ERROR_CODES.NOT_CONFIGURED;

  constructor() {
    super("Firebase Admin is not configured");
    this.name = "AuthNotConfiguredError";
  }
}

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

export function decodedIdTokenToSessionUser(
  decoded: DecodedIdToken,
): SessionUser {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
  };
}
