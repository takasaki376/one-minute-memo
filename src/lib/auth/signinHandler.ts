import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import {
  asAuthErrorCode,
  authErrorHttpStatus,
  toSignInApiError,
} from "@/lib/auth/apiError";
import {
  annotateAuthFailure,
  createAuthRequestId,
  logAuthHandlerFault,
  resolveAuthFailureRequestId,
} from "@/lib/auth/authDiagnostics";
import {
  AUTH_ERROR_CODES,
  authErrorMessage,
} from "@/lib/auth/errorContract";
import { validateSigninBody } from "@/lib/auth/signinValidation";
import type { AuthSignInData, SessionUser } from "@/types/auth";

export type SigninHandlerDeps = {
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{
    user: SessionUser;
    sessionCookie: string;
  }>;
  setAuthCookie: (sessionCookie: string) => Promise<void>;
};

export async function handleSigninPost(
  request: Request,
  deps: SigninHandlerDeps,
): Promise<Response> {
  const requestId = createAuthRequestId();
  const route = "/api/auth/signin";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      fail(
        AUTH_ERROR_CODES.VALIDATION,
        authErrorMessage(AUTH_ERROR_CODES.VALIDATION),
      ),
      { status: 400 },
    );
  }

  const validated = validateSigninBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      fail(validated.code, authErrorMessage(validated.code)),
      { status: authErrorHttpStatus(validated.code) },
    );
  }

  try {
    const session = await deps.signInWithPassword(
      validated.email,
      validated.password,
    );
    try {
      await deps.setAuthCookie(session.sessionCookie);
    } catch (error) {
      throw annotateAuthFailure(error, {
        stage: "cookie.set",
        requestId,
        diagnosticClass: "cookie.set_failed",
      });
    }
    const data: AuthSignInData = { user: session.user };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    const failure = toSignInApiError(error);
    const status = authErrorHttpStatus(
      asAuthErrorCode(failure.error.code),
    );
    logAuthHandlerFault({
      error,
      requestId: resolveAuthFailureRequestId(error) || requestId,
      route,
      httpStatus: status,
      publicErrorCode: failure.error.code,
    });
    return NextResponse.json(failure, { status });
  }
}
