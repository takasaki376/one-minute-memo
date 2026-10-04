import { NextResponse } from "next/server";

import { asSyncErrorCode, toSyncApiError } from "@/lib/sync/apiError";
import { getAdminFirestore } from "@/lib/sync/adminFirestore";
import { createAdminSyncStore } from "@/lib/sync/adminSyncStore";
import { syncErrorHttpStatus } from "@/lib/sync/errorContract";
import { requireSyncUid } from "@/lib/sync/requireSyncUid";
import {
  handleSyncPull,
  handleSyncRun,
  handleSyncState,
  handleSyncUpload,
} from "@/lib/sync/syncHandlers";

async function authorizedUid(): Promise<{ uid: string } | Response> {
  try {
    return { uid: await requireSyncUid() };
  } catch (error) {
    const failure = toSyncApiError(error);
    return NextResponse.json(failure, {
      status: syncErrorHttpStatus(asSyncErrorCode(failure.error.code)),
    });
  }
}

function openStore() {
  return createAdminSyncStore(getAdminFirestore());
}

export async function readSyncState(request: Request): Promise<Response> {
  const auth = await authorizedUid();
  if (auth instanceof Response) {
    return auth;
  }
  try {
    const url = new URL(request.url);
    return await handleSyncState(auth.uid, url.searchParams, openStore());
  } catch (error) {
    return failureResponse(error);
  }
}

export async function postSyncUpload(request: Request): Promise<Response> {
  const auth = await authorizedUid();
  if (auth instanceof Response) {
    return auth;
  }
  try {
    return await handleSyncUpload(auth.uid, await readJson(request), openStore());
  } catch (error) {
    return failureResponse(error);
  }
}

export async function postSyncPull(request: Request): Promise<Response> {
  const auth = await authorizedUid();
  if (auth instanceof Response) {
    return auth;
  }
  try {
    return await handleSyncPull(auth.uid, await readJson(request), openStore());
  } catch (error) {
    return failureResponse(error);
  }
}

export async function postSyncRun(request: Request): Promise<Response> {
  const auth = await authorizedUid();
  if (auth instanceof Response) {
    return auth;
  }
  try {
    return await handleSyncRun(auth.uid, await readJson(request), openStore());
  } catch (error) {
    return failureResponse(error);
  }
}

function failureResponse(error: unknown): Response {
  const failure = toSyncApiError(error);
  return NextResponse.json(failure, {
    status: syncErrorHttpStatus(asSyncErrorCode(failure.error.code)),
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
