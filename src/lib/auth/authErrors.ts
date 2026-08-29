import { AUTH_ERROR_CODES } from "./errorContract";

export class AuthNotConfiguredError extends Error {
  readonly code = AUTH_ERROR_CODES.NOT_CONFIGURED;

  constructor() {
    super("Firebase Admin is not configured");
    this.name = "AuthNotConfiguredError";
  }
}
