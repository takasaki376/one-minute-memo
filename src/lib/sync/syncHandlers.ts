import { NextResponse } from "next/server";

import { fail, ok } from "@/lib/api/envelope";
import type {
  SyncPullData,
  SyncRunData,
  SyncStateData,
  SyncUploadData,
} from "@/types/sync";

import { asSyncErrorCode, toSyncApiError } from "./apiError";
import { SYNC_ERROR_CODES, syncErrorHttpStatus, syncErrorMessage } from "./errorContract";
import { hasRemoteSyncDifference } from "./syncDiff";
import { executePull, executeUpload, type SyncStore } from "./syncExecute";
import {
  validateSyncPayload,
  validateSyncPullIndex,
  validateSyncRunRequest,
} from "./syncValidation";

function validationResponse(): Response {
  return NextResponse.json(
    fail(
      SYNC_ERROR_CODES.VALIDATION,
      syncErrorMessage(SYNC_ERROR_CODES.VALIDATION),
    ),
    { status: syncErrorHttpStatus(SYNC_ERROR_CODES.VALIDATION) },
  );
}

function failureResponse(error: unknown): Response {
  const failure = toSyncApiError(error);
  return NextResponse.json(failure, {
    status: syncErrorHttpStatus(asSyncErrorCode(failure.error.code)),
  });
}

export async function handleSyncState(
  uid: string,
  searchParams: URLSearchParams,
  store: SyncStore,
): Promise<Response> {
  try {
    const lastSyncedAt = await store.getLastSyncedAt(uid);
    const hasParam = searchParams.has("localLastSyncedAt");
    const localRaw = searchParams.get("localLastSyncedAt");
    const data: SyncStateData = {
      lastSyncedAt,
      hasRemoteDifference: hasParam
        ? hasRemoteSyncDifference(localRaw || null, lastSyncedAt)
        : false,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function handleSyncUpload(
  uid: string,
  body: unknown,
  store: SyncStore,
): Promise<Response> {
  const validated = validateSyncPayload(body);
  if (!validated.ok) {
    return validationResponse();
  }

  try {
    const executed = await executeUpload(uid, validated.value, store);
    const data: SyncUploadData = {
      ...executed.counts,
      lastSyncedAt: executed.lastSyncedAt,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function handleSyncPull(
  uid: string,
  body: unknown,
  store: SyncStore,
): Promise<Response> {
  const validated = validateSyncPullIndex(body);
  if (!validated.ok) {
    return validationResponse();
  }

  try {
    const remote = await store.load(uid);
    const pulled = executePull(validated.value, remote);
    const lastSyncedAt = (await store.getLastSyncedAt(uid)) ?? "";
    const data: SyncPullData = {
      ...pulled,
      lastSyncedAt,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function handleSyncRun(
  uid: string,
  body: unknown,
  store: SyncStore,
): Promise<Response> {
  const validated = validateSyncRunRequest(body);
  if (!validated.ok) {
    return validationResponse();
  }

  try {
    const remote = await store.load(uid);
    const uploaded = await executeUpload(
      uid,
      validated.value.payload,
      store,
      remote,
    );
    const remoteAfterUpload = await store.load(uid);
    const pulled = executePull(validated.value.index, remoteAfterUpload);
    const data: SyncRunData = {
      ...pulled,
      uploadedMemos: uploaded.counts.uploadedMemos,
      uploadedSessions: uploaded.counts.uploadedSessions,
      uploadedThemes: uploaded.counts.uploadedThemes,
      uploadedThemeSettings: uploaded.counts.uploadedThemeSettings,
      uploadFailures:
        uploaded.counts.uploadFailures + pulled.uploadFailures,
      lastSyncedAt: uploaded.lastSyncedAt,
    };
    return NextResponse.json(ok(data), { status: 200 });
  } catch (error) {
    return failureResponse(error);
  }
}
