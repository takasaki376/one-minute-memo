import { beforeEach, describe, expect, it, mock } from "bun:test";

import { AuthNotConfiguredError } from "../authErrors";

const createUser = mock(
  async (_input: { email: string; password: string }) => ({ uid: "uid-1" }),
);
const deleteUser = mock(async (_uid: string) => undefined);

mock.module("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    createUser,
    deleteUser,
  }),
}));

const { createAuthUser, sendSignupVerificationEmail } = await import(
  "../signup"
);

describe("sendSignupVerificationEmail", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
  });

  it("throws AuthNotConfiguredError when API key is missing", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    await expect(
      sendSignupVerificationEmail("user@example.com", "secret1"),
    ).rejects.toBeInstanceOf(AuthNotConfiguredError);
  });

  it("signs in then requests VERIFY_EMAIL oob code", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });

      if (url.includes("signInWithPassword")) {
        return new Response(JSON.stringify({ idToken: "id-token-1" }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    });

    await sendSignupVerificationEmail(
      "user@example.com",
      "secret1",
      fetchImpl as unknown as typeof fetch,
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toContain("accounts:signInWithPassword");
    expect(calls[0]?.body).toEqual({
      email: "user@example.com",
      password: "secret1",
      returnSecureToken: true,
    });
    expect(calls[1]?.url).toContain("accounts:sendOobCode");
    expect(calls[1]?.body).toEqual({
      requestType: "VERIFY_EMAIL",
      idToken: "id-token-1",
    });
  });
});

describe("createAuthUser", () => {
  beforeEach(() => {
    createUser.mockClear();
    deleteUser.mockClear();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
  });

  it("creates a user and sends verification email", async () => {
    const fetchImpl = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("signInWithPassword")) {
        return new Response(JSON.stringify({ idToken: "id-token-1" }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    });

    await expect(
      createAuthUser("user@example.com", "secret1", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ uid: "uid-1" });

    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret1",
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the user when verification email sending fails", async () => {
    const fetchImpl = mock(async () => {
      return new Response(
        JSON.stringify({ error: { message: "TOO_MANY_ATTEMPTS_TRY_LATER" } }),
        { status: 400 },
      );
    });

    await expect(
      createAuthUser("user@example.com", "secret1", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "auth/too-many-requests" });

    expect(deleteUser).toHaveBeenCalledWith("uid-1");
  });

  it("maps email-already-in-use from createUser", async () => {
    createUser.mockImplementationOnce(async () => {
      throw Object.assign(new Error("already exists"), {
        code: "auth/email-already-in-use",
      });
    });

    await expect(
      createAuthUser("user@example.com", "secret1", {
        fetchImpl: mock(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "auth/email-already-in-use" });
  });
});
