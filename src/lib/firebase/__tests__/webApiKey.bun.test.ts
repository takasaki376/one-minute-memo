import { afterEach, describe, expect, it } from "bun:test";

import {
  getFirebaseWebApiKey,
  isFirebaseWebApiKeyConfigured,
} from "../webApiKey";

const previous = process.env.FIREBASE_WEB_API_KEY;

afterEach(() => {
  if (previous === undefined) {
    delete process.env.FIREBASE_WEB_API_KEY;
  } else {
    process.env.FIREBASE_WEB_API_KEY = previous;
  }
});

describe("FIREBASE_WEB_API_KEY", () => {
  it("returns the trimmed key when set", () => {
    process.env.FIREBASE_WEB_API_KEY = "  key-1  ";
    expect(getFirebaseWebApiKey()).toBe("key-1");
    expect(isFirebaseWebApiKeyConfigured()).toBe(true);
  });

  it("returns null when blank", () => {
    process.env.FIREBASE_WEB_API_KEY = "  ";
    expect(getFirebaseWebApiKey()).toBeNull();
    expect(isFirebaseWebApiKeyConfigured()).toBe(false);
  });
});
