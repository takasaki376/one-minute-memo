import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import type { AuthSessionData, SessionUser } from "@/types/auth";

import {
  asAuthErrorCode,
  authErrorHttpStatus,
  toAuthApiError,
} from "./apiError";
import {
  AUTH_ERROR_CODES,
  authErrorMessage,
} from "./errorContract";
import { AuthNotConfiguredError } from "./authErrors";
import {
  decodedIdTokenToSessionUser,
  type DecodedIdTokenLike,
} from "./sessionUser";

export type SessionHandlerDeps = {
  getAuthCookie: () => Promise<string | undefined>;
  verifySessionCookie: (sessionCookie: string) => Promise<DecodedIdTokenLike>;
  clearAuthCookie: () => Promise<void>;
};

/**
 * GET /api/auth/session (PJ1-199-01):
 * - no cookie → 200 { user: null }
 * - valid cookie → 200 { user }
 * - invalid cookie → 401 AUTH_UNAUTHENTICATED (+ clear cookie)
 */
export async function handleSessionGet(
  deps: SessionHandlerDeps,
): Promise<Response> {
  let sessionCookie: string | undefined;
  try {
    sessionCookie = await deps.getAuthCookie();
  } catch (error) {
    const failure = toAuthApiError(error);
    return NextResponse.json(failure, {
      status: authErrorHttpStatus(asAuthErrorCode(failure.error.code)),
    });
  }

  if (!sessionCookie) {
    const data: AuthSessionData = { user: null };
    return NextResponse.json(ok(data), { status: 200 });
  }

  try {
    const decoded = await deps.verifySessionCookie(sessionCookie);
    const user: SessionUser = decodedIdTokenToSessionUser(decoded);
    const data: AuthSessionData = { user };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    if (error instanceof AuthNotConfiguredError) {
      const failure = toAuthApiError(error);
      return NextResponse.json(failure, {
        status: authErrorHttpStatus(AUTH_ERROR_CODES.NOT_CONFIGURED),
      });
    }

    try {
      await deps.clearAuthCookie();
    } catch {
      // best-effort clear; still return unauthenticated
    }

    return NextResponse.json(
      fail(
        AUTH_ERROR_CODES.UNAUTHENTICATED,
        authErrorMessage(AUTH_ERROR_CODES.UNAUTHENTICATED),
      ),
      { status: 401 },
    );
  }
}
