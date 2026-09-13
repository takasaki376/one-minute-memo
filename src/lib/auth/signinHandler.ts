import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import {
  asAuthErrorCode,
  authErrorHttpStatus,
  toAuthApiError,
} from "@/lib/auth/apiError";
import {
  AUTH_ERROR_CODES,
  authErrorMessage,
} from "@/lib/auth/errorContract";
import { validateSigninBody } from "@/lib/auth/signinValidation";
import type { AuthSignInData, SessionUser } from "@/types/auth";

export type SigninHandlerDeps = {
  signInWithIdToken: (idToken: string) => Promise<{
    user: SessionUser;
    sessionCookie: string;
  }>;
  setAuthCookie: (sessionCookie: string) => Promise<void>;
};

export async function handleSigninPost(
  request: Request,
  deps: SigninHandlerDeps,
): Promise<Response> {
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
    const session = await deps.signInWithIdToken(validated.idToken);
    await deps.setAuthCookie(session.sessionCookie);
    const data: AuthSignInData = { user: session.user };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    const failure = toAuthApiError(error);
    return NextResponse.json(failure, {
      status: authErrorHttpStatus(asAuthErrorCode(failure.error.code)),
    });
  }
}
