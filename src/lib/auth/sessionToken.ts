import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import {
  annotateAuthFailure,
  classifyAdminAuthError,
  listMissingFirebaseAdminEnvNames,
} from "./authDiagnostics";
import { AuthNotConfiguredError } from "./authErrors";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";

export { AuthNotConfiguredError } from "./authErrors";
export { decodedIdTokenToSessionUser } from "./sessionUser";

export async function createSessionCookieFromIdToken(
  idToken: string,
): Promise<string> {
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (error) {
    throw annotateAuthFailure(error, {
      stage: "admin.initialize",
      diagnosticClass: classifyAdminAuthError(error),
    });
  }

  if (!auth) {
    throw annotateAuthFailure(new AuthNotConfiguredError(), {
      stage: "admin.initialize",
      diagnosticClass: "config.missing_env",
      missingEnvNames: listMissingFirebaseAdminEnvNames(),
    });
  }

  try {
    return await auth.createSessionCookie(idToken, {
      expiresIn: AUTH_SESSION_COOKIE.maxAgeSeconds * 1000,
    });
  } catch (error) {
    throw annotateAuthFailure(error, {
      stage: "admin.create_session_cookie",
      diagnosticClass: classifyAdminAuthError(error),
    });
  }
}

export async function verifyAuthSessionCookie(
  sessionCookie: string,
): Promise<DecodedIdToken> {
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (error) {
    throw annotateAuthFailure(error, {
      stage: "admin.initialize",
      diagnosticClass: classifyAdminAuthError(error),
    });
  }

  if (!auth) {
    throw annotateAuthFailure(new AuthNotConfiguredError(), {
      stage: "admin.initialize",
      diagnosticClass: "config.missing_env",
      missingEnvNames: listMissingFirebaseAdminEnvNames(),
    });
  }

  try {
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    if (error instanceof AuthNotConfiguredError) {
      throw annotateAuthFailure(error, {
        stage: "admin.verify_session_cookie",
        diagnosticClass: "config.missing_env",
        missingEnvNames: listMissingFirebaseAdminEnvNames(),
      });
    }
    throw annotateAuthFailure(error, {
      stage: "admin.verify_session_cookie",
      diagnosticClass: classifyAdminAuthError(error),
    });
  }
}
