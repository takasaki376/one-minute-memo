import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import {
  authErrorHttpStatus,
  toAuthApiError,
} from "@/lib/auth/apiError";
import {
  AUTH_ERROR_CODES,
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  authErrorMessage,
  type AuthErrorCode,
} from "@/lib/auth/errorContract";
import { validateSignupBody } from "@/lib/auth/signupValidation";
import type { AuthSignUpData } from "@/types/auth";

export type SignupHandlerDeps = {
  createAuthUser: (
    email: string,
    password: string,
  ) => Promise<{ uid: string }>;
};

function asAuthErrorCode(code: string): AuthErrorCode {
  const codes = Object.values(AUTH_ERROR_CODES) as string[];
  return codes.includes(code)
    ? (code as AuthErrorCode)
    : AUTH_ERROR_CODES.INTERNAL;
}

export async function handleSignupPost(
  request: Request,
  deps: SignupHandlerDeps,
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

  const validated = validateSignupBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      fail(validated.code, authErrorMessage(validated.code)),
      { status: authErrorHttpStatus(validated.code) },
    );
  }

  try {
    await deps.createAuthUser(validated.email, validated.password);
    const data: AuthSignUpData = {
      user: null,
      message: AUTH_SIGNUP_SUCCESS_MESSAGE,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    const failure = toAuthApiError(error);
    return NextResponse.json(failure, {
      status: authErrorHttpStatus(asAuthErrorCode(failure.error.code)),
    });
  }
}
