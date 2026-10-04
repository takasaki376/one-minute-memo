import type {
  SyncPayload,
  SyncPullIndex,
  SyncRunRequest,
} from "@/types/sync";

import { SYNC_ERROR_CODES, type SyncErrorCode } from "./errorContract";

type ValidationOk<T> = { ok: true; value: T };
type ValidationFail = { ok: false; code: SyncErrorCode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSafeDocId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 200 &&
    !id.includes("/") &&
    !id.includes("\\")
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isSafeDocId(item));
}

function hasSafeId(value: unknown): value is { id: string } {
  return isRecord(value) && isSafeDocId(value.id);
}

function isEntityList(value: unknown): value is Array<{ id: string }> {
  return Array.isArray(value) && value.every((item) => hasSafeId(item));
}

export function validateSyncPayload(
  body: unknown,
): ValidationOk<SyncPayload> | ValidationFail {
  if (!isRecord(body)) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  const memos = body.memos;
  const sessions = body.sessions;
  const themes = body.themes;
  const themeSettings = body.themeSettings;
  const deletedThemeSettingIds = body.deletedThemeSettingIds;

  if (
    !isEntityList(memos) ||
    !isEntityList(sessions) ||
    !isEntityList(themes) ||
    !isEntityList(themeSettings) ||
    !isStringArray(deletedThemeSettingIds)
  ) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  return {
    ok: true,
    value: {
      memos: memos as SyncPayload["memos"],
      sessions: sessions as SyncPayload["sessions"],
      themes: themes as SyncPayload["themes"],
      themeSettings: themeSettings as SyncPayload["themeSettings"],
      deletedThemeSettingIds,
    },
  };
}

export function validateSyncPullIndex(
  body: unknown,
): ValidationOk<SyncPullIndex> | ValidationFail {
  if (!isRecord(body)) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  const memos = body.memos;
  const sessions = body.sessions;
  const themes = body.themes;
  const themeSettings = body.themeSettings;

  if (
    !isEntityList(memos) ||
    !isEntityList(sessions) ||
    !isEntityList(themes) ||
    !isEntityList(themeSettings)
  ) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  return {
    ok: true,
    value: {
      memos: memos as SyncPullIndex["memos"],
      sessions: sessions as SyncPullIndex["sessions"],
      themes: themes as SyncPullIndex["themes"],
      themeSettings: themeSettings as SyncPullIndex["themeSettings"],
    },
  };
}

export function validateSyncRunRequest(
  body: unknown,
): ValidationOk<SyncRunRequest> | ValidationFail {
  if (!isRecord(body)) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  const payload = validateSyncPayload(body.payload);
  const index = validateSyncPullIndex(body.index);
  if (!payload.ok || !index.ok) {
    return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
  }

  return { ok: true, value: { payload: payload.value, index: index.value } };
}
