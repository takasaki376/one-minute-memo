import { describe, expect, it, mock } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import { AuthApiError } from "../clientApi";
import { fetchIdTokenWithPassword } from "../fetchIdToken";

describe("fetchIdTokenWithPassword", () => {
  it("returns idToken on success", async () => {
    const previous = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "example";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app-1";

    try {
      const fetchImpl = mock(async () =>
        Response.json({ idToken: "id-token-1" }),
      );

      await expect(
        fetchIdTokenWithPassword("a@example.com", "pass", fetchImpl),
      ).resolves.toBe("id-token-1");
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      } else {
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY = previous;
      }
    }
  });

  it("maps invalid credentials", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "example.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "example";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "app-1";

    const fetchImpl = mock(async () =>
      Response.json(
        { error: { message: "INVALID_LOGIN_CREDENTIALS" } },
        { status: 400 },
      ),
    );

    try {
      await fetchIdTokenWithPassword("a@example.com", "bad", fetchImpl);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuthApiError);
      expect((error as AuthApiError).code).toBe(
        AUTH_ERROR_CODES.INVALID_CREDENTIAL,
      );
    }
  });
});
