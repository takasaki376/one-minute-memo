import { beforeEach, describe, expect, it, mock } from "bun:test";

import { AUTH_SESSION_COOKIE } from "../sessionCookie";

const verifyIdToken = mock(async (_idToken: string) => ({
  uid: "uid-1",
  email: "user@example.com",
  email_verified: true,
}));
const createSessionCookie = mock(
  async (_idToken: string, _options: unknown) => "session-cookie-1",
);

mock.module("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken,
    createSessionCookie,
  }),
}));

const { signInWithIdToken } = await import("../signin");

describe("signInWithIdToken", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    createSessionCookie.mockReset();
    verifyIdToken.mockImplementation(async () => ({
      uid: "uid-1",
      email: "user@example.com",
      email_verified: true,
    }));
    createSessionCookie.mockImplementation(async () => "session-cookie-1");
  });

  it("verifies id token then creates a session cookie", async () => {
    await expect(signInWithIdToken("id-token-1")).resolves.toEqual({
      sessionCookie: "session-cookie-1",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        emailVerified: true,
      },
    });

    expect(verifyIdToken).toHaveBeenCalledWith("id-token-1");
    expect(createSessionCookie).toHaveBeenCalledWith("id-token-1", {
      expiresIn: AUTH_SESSION_COOKIE.maxAgeSeconds * 1000,
    });
  });

  it("propagates invalid-id-token from verifyIdToken", async () => {
    verifyIdToken.mockImplementationOnce(async () => {
      throw Object.assign(new Error("bad token"), {
        code: "auth/invalid-id-token",
      });
    });

    await expect(signInWithIdToken("bad")).rejects.toMatchObject({
      code: "auth/invalid-id-token",
    });
    expect(createSessionCookie).not.toHaveBeenCalled();
  });
});
