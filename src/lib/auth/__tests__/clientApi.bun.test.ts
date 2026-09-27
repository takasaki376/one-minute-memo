import { describe, expect, it, mock } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import {
  AuthApiError,
  fetchAuthSession,
  postAuthSignIn,
  postAuthSignOut,
  postAuthSignUp,
} from "../clientApi";

describe("clientApi", () => {
  it("fetchAuthSession returns user on success", async () => {
    const fetchImpl = mock(async () =>
      Response.json({
        success: true,
        data: {
          user: {
            uid: "uid-1",
            email: "a@example.com",
            emailVerified: true,
          },
        },
      }),
    );

    await expect(fetchAuthSession(fetchImpl)).resolves.toEqual({
      uid: "uid-1",
      email: "a@example.com",
      emailVerified: true,
    });
  });

  it("fetchAuthSession returns null on 401", async () => {
    const fetchImpl = mock(async () =>
      Response.json(
        {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.UNAUTHENTICATED,
            message: "ログインしていません",
          },
        },
        { status: 401 },
      ),
    );

    await expect(fetchAuthSession(fetchImpl)).resolves.toBeNull();
  });

  it("postAuthSignIn returns user", async () => {
    const fetchImpl = mock(async () =>
      Response.json({
        success: true,
        data: {
          user: {
            uid: "uid-1",
            email: "a@example.com",
            emailVerified: false,
          },
        },
      }),
    );

    await expect(postAuthSignIn("token", fetchImpl)).resolves.toEqual({
      uid: "uid-1",
      email: "a@example.com",
      emailVerified: false,
    });
  });

  it("postAuthSignUp throws AuthApiError on failure", async () => {
    const fetchImpl = mock(async () =>
      Response.json(
        {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
            message: "このメールアドレスは既に登録されています",
          },
        },
        { status: 400 },
      ),
    );

    await expect(postAuthSignUp("a@example.com", "pass", fetchImpl)).rejects.toBeInstanceOf(
      AuthApiError,
    );
  });

  it("maps fetch network failures to AUTH_NETWORK", async () => {
    const fetchImpl = mock(async () => {
      throw new TypeError("Failed to fetch");
    });

    try {
      await postAuthSignIn("token", fetchImpl);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuthApiError);
      expect((error as AuthApiError).code).toBe(AUTH_ERROR_CODES.NETWORK);
    }
  });

  it("maps invalid JSON responses to AUTH_INTERNAL", async () => {
    const fetchImpl = mock(async () => new Response("not-json", { status: 200 }));

    try {
      await postAuthSignOut(fetchImpl);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuthApiError);
      expect((error as AuthApiError).code).toBe(AUTH_ERROR_CODES.INTERNAL);
    }
  });

  it("postAuthSignOut resolves on success", async () => {
    const fetchImpl = mock(async () =>
      Response.json({
        success: true,
        data: { user: null },
      }),
    );

    await expect(postAuthSignOut(fetchImpl)).resolves.toBeUndefined();
  });
});
