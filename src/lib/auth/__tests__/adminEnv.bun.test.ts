import { describe, expect, it } from "bun:test";

import {
  getFirebaseAdminConfig,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/adminEnv";

const ENV_KEYS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

function clearAdminEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("getFirebaseAdminConfig", () => {
  it("returns null when any required env is missing", () => {
    clearAdminEnv();
    expect(getFirebaseAdminConfig()).toBeNull();
    expect(isFirebaseAdminConfigured()).toBe(false);
  });

  it("normalizes escaped newlines in the private key", () => {
    process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-project";
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "firebase-adminsdk@test.iam.gserviceaccount.com";
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";

    const config = getFirebaseAdminConfig();
    expect(config).not.toBeNull();
    expect(config?.privateKey).toContain("\nabc\n");
    expect(isFirebaseAdminConfigured()).toBe(true);

    clearAdminEnv();
  });
});
