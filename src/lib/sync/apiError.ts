import type { ApiFailure } from "@/types/api";

import { fail } from "@/lib/api/envelope";

import {
  SYNC_ERROR_CODES,
  syncErrorMessage,
  toSyncErrorCode,
  type SyncErrorCode,
} from "./errorContract";
import { SyncNotConfiguredError, SyncUnauthenticatedError } from "./syncErrors";

function extractCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

export function asSyncErrorCode(code: string): SyncErrorCode {
  const codes = Object.values(SYNC_ERROR_CODES) as string[];
  return codes.includes(code) ? (code as SyncErrorCode) : SYNC_ERROR_CODES.INTERNAL;
}

export function toSyncApiError(error: unknown): ApiFailure {
  if (error instanceof SyncNotConfiguredError) {
    return fail(
      SYNC_ERROR_CODES.NOT_CONFIGURED,
      syncErrorMessage(SYNC_ERROR_CODES.NOT_CONFIGURED),
    );
  }

  if (error instanceof SyncUnauthenticatedError) {
    return fail(
      SYNC_ERROR_CODES.UNAUTHENTICATED,
      syncErrorMessage(SYNC_ERROR_CODES.UNAUTHENTICATED),
    );
  }

  const code = toSyncErrorCode(extractCode(error));
  return fail(code, syncErrorMessage(code));
}
