/**
 * Bun unit tests are not Client Components. Stub `server-only` so modules
 * that guard secrets / server APIs (e.g. adminEnv) remain unit-testable.
 */
import { mock } from "bun:test";

mock.module("server-only", () => ({}));
