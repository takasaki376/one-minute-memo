import { SYNC_ERROR_CODES } from "./errorContract";

export class SyncUnauthenticatedError extends Error {
  readonly code = SYNC_ERROR_CODES.UNAUTHENTICATED;

  constructor() {
    super("Sync session is missing or invalid");
    this.name = "SyncUnauthenticatedError";
  }
}

export class SyncNotConfiguredError extends Error {
  readonly code = SYNC_ERROR_CODES.NOT_CONFIGURED;

  constructor() {
    super("Firebase Admin is not configured");
    this.name = "SyncNotConfiguredError";
  }
}
