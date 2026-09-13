import { describe, expect, it, mock } from "bun:test";

import { AUTH_ERROR_CODES, AUTH_SIGNUP_SUCCESS_MESSAGE } from "../errorContract";
import { handleSignupPost } from "../signupHandler";

describe("handleSignupPost", () => {
  it("returns 400 AUTH_VALIDATION for incomplete body", async () => {
    const response = await handleSignupPost(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      {
        createAuthUser: mock(async () => ({ uid: "uid-1" })),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.VALIDATION,
        message: expect.any(String),
      },
    });
  });

  it("returns 200 with success message and does not set cookies", async () => {
    const createAuthUser = mock(async () => ({ uid: "uid-1" }));

    const response = await handleSignupPost(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "secret1",
        }),
      }),
      { createAuthUser },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        user: null,
        message: AUTH_SIGNUP_SUCCESS_MESSAGE,
      },
    });
    expect(createAuthUser).toHaveBeenCalledWith("user@example.com", "secret1");
  });

  it("maps createAuthUser failures to API error envelope", async () => {
    const response = await handleSignupPost(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "secret1",
        }),
      }),
      {
        createAuthUser: mock(async () => {
          throw Object.assign(new Error("exists"), {
            code: "auth/email-already-in-use",
          });
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
        message: expect.stringContaining("既に登録"),
      },
    });
  });
});
