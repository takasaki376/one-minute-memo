import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import {
  asAuthErrorCode,
  authErrorHttpStatus,
  toAuthApiError,
} from "@/lib/auth/apiError";
import {
  annotateAuthFailure,
  createAuthRequestId,
  logAuthHandlerFault,
  resolveAuthFailureRequestId,
} from "@/lib/auth/authDiagnostics";
import {
  AUTH_ERROR_CODES,
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  authErrorMessage,
} from "@/lib/auth/errorContract";
import { validateSignupBody } from "@/lib/auth/signupValidation";
import type { AuthSignUpData } from "@/types/auth";

export type SignupHandlerDeps = {
  createAuthUser: (
    email: string,
    password: string,
    options?: { requestId?: string },
  ) => Promise<{ uid: string }>;
};

export async function handleSignupPost(
  request: Request,
  deps: SignupHandlerDeps,
): Promise<Response> {
  const requestId = createAuthRequestId();
  const route = "/api/auth/signup";

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

  const validated = validateSignupBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      fail(validated.code, authErrorMessage(validated.code)),
      { status: authErrorHttpStatus(validated.code) },
    );
  }

  try {
    await deps.createAuthUser(validated.email, validated.password, {
      requestId,
    });
    const data: AuthSignUpData = {
      user: null,
      message: AUTH_SIGNUP_SUCCESS_MESSAGE,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    const annotated = annotateAuthFailure(error, { stage: "unknown", requestId });
    const failure = toAuthApiError(annotated);
    const status = authErrorHttpStatus(
      asAuthErrorCode(failure.error.code),
    );
    logAuthHandlerFault({
      error: annotated,
      requestId: resolveAuthFailureRequestId(annotated) || requestId,
      route,
      httpStatus: status,
      publicErrorCode: failure.error.code,
    });
    return NextResponse.json(failure, { status });
  }
}
