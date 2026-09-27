import { NextResponse } from "next/server";

import { ok } from "@/lib/api/envelope";
import type { AuthSignOutData } from "@/types/auth";

import {
  asAuthErrorCode,
  authErrorHttpStatus,
  toAuthApiError,
} from "./apiError";

export type SignoutHandlerDeps = {
  clearAuthCookie: () => Promise<void>;
};

/**
 * POST /api/auth/signout (PJ1-199-01):
 * Always clears `__session` and returns `{ user: null }`.
 */
export async function handleSignoutPost(
  deps: SignoutHandlerDeps,
): Promise<Response> {
  try {
    await deps.clearAuthCookie();
    const data: AuthSignOutData = { user: null };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    const failure = toAuthApiError(error);
    return NextResponse.json(failure, {
      status: authErrorHttpStatus(asAuthErrorCode(failure.error.code)),
    });
  }
}
