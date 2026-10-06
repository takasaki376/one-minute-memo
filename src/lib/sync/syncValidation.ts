import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";
import type {
  MemoEntityIndex,
  SessionEntityIndex,
  SyncPayload,
  SyncPullIndex,
  SyncRunRequest,
  ThemeEntityIndex,
  ThemeSettingEntityIndex,
  ThemeSettingRecord,
  UserThemeRecord,
} from "@/types/sync";

import { SYNC_ERROR_CODES, type SyncErrorCode } from "./errorContract";

type ValidationOk<T> = { ok: true; value: T };
type ValidationFail = { ok: false; code: SyncErrorCode };

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

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

export function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DATE_TIME.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isSafeDocId(item));
}

function parseList<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed: T[] = [];
  for (const item of value) {
    const next = parseItem(item);
    if (!next) {
      return null;
    }
    parsed.push(next);
  }
  return parsed;
}

function parseMemo(value: unknown): MemoRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isSafeDocId(value.id) ||
    !isSafeDocId(value.sessionId) ||
    !isSafeDocId(value.themeId) ||
    !isNonNegativeInteger(value.order) ||
    typeof value.textContent !== "string" ||
    (value.handwritingType !== "none" && value.handwritingType !== "dataUrl") ||
    !isIsoDateTime(value.createdAt) ||
    !isIsoDateTime(value.updatedAt)
  ) {
    return null;
  }
  if (
    value.handwritingDataUrl !== undefined &&
    typeof value.handwritingDataUrl !== "string"
  ) {
    return null;
  }

  const memo: MemoRecord = {
    id: value.id,
    sessionId: value.sessionId,
    themeId: value.themeId,
    order: value.order,
    textContent: value.textContent,
    handwritingType: value.handwritingType,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (typeof value.handwritingDataUrl === "string") {
    memo.handwritingDataUrl = value.handwritingDataUrl;
  }
  return memo;
}

function parseSession(value: unknown): SessionRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const endedAt =
    value.endedAt === null
      ? null
      : isIsoDateTime(value.endedAt)
        ? value.endedAt
        : undefined;
  if (
    !isSafeDocId(value.id) ||
    !isIsoDateTime(value.startedAt) ||
    endedAt === undefined ||
    !isStringArray(value.themeIds) ||
    !isNonNegativeInteger(value.memoCount)
  ) {
    return null;
  }

  return {
    id: value.id,
    startedAt: value.startedAt,
    endedAt,
    themeIds: value.themeIds,
    memoCount: value.memoCount,
  };
}

function parseUserTheme(value: unknown): UserThemeRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isSafeDocId(value.id) ||
    typeof value.title !== "string" ||
    typeof value.category !== "string" ||
    typeof value.isActive !== "boolean" ||
    value.source !== "user" ||
    !isIsoDateTime(value.createdAt) ||
    !isIsoDateTime(value.updatedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    category: value.category,
    isActive: value.isActive,
    source: "user",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseThemeSetting(value: unknown): ThemeSettingRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isSafeDocId(value.id) ||
    typeof value.isActive !== "boolean" ||
    !isIsoDateTime(value.updatedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    isActive: value.isActive,
    updatedAt: value.updatedAt,
  };
}

function parseMemoIndex(value: unknown): MemoEntityIndex | null {
  if (!isRecord(value) || !isSafeDocId(value.id) || !isIsoDateTime(value.updatedAt)) {
    return null;
  }
  return { id: value.id, updatedAt: value.updatedAt };
}

function parseSessionIndex(value: unknown): SessionEntityIndex | null {
  if (!isRecord(value) || !isSafeDocId(value.id)) {
    return null;
  }
  const endedAt =
    value.endedAt === null
      ? null
      : isIsoDateTime(value.endedAt)
        ? value.endedAt
        : undefined;
  if (endedAt === undefined) {
    return null;
  }
  return { id: value.id, endedAt };
}

function parseThemeIndex(value: unknown): ThemeEntityIndex | null {
  if (!isRecord(value) || !isSafeDocId(value.id) || !isIsoDateTime(value.updatedAt)) {
    return null;
  }
  return { id: value.id, updatedAt: value.updatedAt };
}

function parseThemeSettingIndex(value: unknown): ThemeSettingEntityIndex | null {
  if (!isRecord(value) || !isSafeDocId(value.id) || !isIsoDateTime(value.updatedAt)) {
    return null;
  }
  return { id: value.id, updatedAt: value.updatedAt };
}

function validationFail(): ValidationFail {
  return { ok: false, code: SYNC_ERROR_CODES.VALIDATION };
}

export function validateSyncPayload(
  body: unknown,
): ValidationOk<SyncPayload> | ValidationFail {
  if (!isRecord(body) || !isStringArray(body.deletedThemeSettingIds)) {
    return validationFail();
  }

  const memos = parseList(body.memos, parseMemo);
  const sessions = parseList(body.sessions, parseSession);
  const themes = parseList(body.themes, parseUserTheme);
  const themeSettings = parseList(body.themeSettings, parseThemeSetting);
  if (!memos || !sessions || !themes || !themeSettings) {
    return validationFail();
  }

  return {
    ok: true,
    value: {
      memos,
      sessions,
      themes,
      themeSettings,
      deletedThemeSettingIds: body.deletedThemeSettingIds,
    },
  };
}

export function validateSyncPullIndex(
  body: unknown,
): ValidationOk<SyncPullIndex> | ValidationFail {
  if (!isRecord(body)) {
    return validationFail();
  }

  const memos = parseList(body.memos, parseMemoIndex);
  const sessions = parseList(body.sessions, parseSessionIndex);
  const themes = parseList(body.themes, parseThemeIndex);
  const themeSettings = parseList(body.themeSettings, parseThemeSettingIndex);
  if (!memos || !sessions || !themes || !themeSettings) {
    return validationFail();
  }

  return {
    ok: true,
    value: { memos, sessions, themes, themeSettings },
  };
}

export function validateSyncRunRequest(
  body: unknown,
): ValidationOk<SyncRunRequest> | ValidationFail {
  if (!isRecord(body)) {
    return validationFail();
  }

  const payload = validateSyncPayload(body.payload);
  const index = validateSyncPullIndex(body.index);
  if (!payload.ok || !index.ok) {
    return validationFail();
  }

  return { ok: true, value: { payload: payload.value, index: index.value } };
}
