import { afterEach, describe, expect, it } from "bun:test";

import {
  getFirebaseConfig,
  getFirebaseWebApiKey,
  isFirebaseConfigured,
} from "../env";

const PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const previous = new Map<string, string | undefined>();

function rememberEnv() {
  for (const key of PUBLIC_KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
}

afterEach(() => {
  for (const key of PUBLIC_KEYS) {
    const value = previous.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("firebase public env", () => {
  it("treats login as configured when only the web API key is set", () => {
    rememberEnv();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key";

    expect(getFirebaseWebApiKey()).toBe("test-key");
    expect(isFirebaseConfigured()).toBe(true);
    expect(getFirebaseConfig()).toBeNull();
  });

  it("treats a blank API key as unconfigured", () => {
    rememberEnv();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "  ";

    expect(isFirebaseConfigured()).toBe(false);
  });
});
