import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockFetchAuthSession = vi.fn();
const mockFetchIdTokenWithPassword = vi.fn();
const mockPostAuthSignIn = vi.fn();
const mockPostAuthSignUp = vi.fn();
const mockPostAuthSignOut = vi.fn();

vi.mock("@/lib/firebase/env", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("@/lib/auth/clientApi", () => ({
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
  postAuthSignIn: (...args: unknown[]) => mockPostAuthSignIn(...args),
  postAuthSignUp: (...args: unknown[]) => mockPostAuthSignUp(...args),
  postAuthSignOut: (...args: unknown[]) => mockPostAuthSignOut(...args),
}));

vi.mock("@/lib/auth/fetchIdToken", () => ({
  fetchIdTokenWithPassword: (...args: unknown[]) =>
    mockFetchIdTokenWithPassword(...args),
}));

import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuthSession.mockResolvedValue(null);
  });

  it("starts unauthenticated after session restore", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isConfigured).toBe(true);
    expect(mockFetchAuthSession).toHaveBeenCalled();
  });

  it("restores SessionUser from GET /api/auth/session", async () => {
    mockFetchAuthSession.mockResolvedValue({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });
  });

  it("signs in via idToken exchange then POST /api/auth/signin", async () => {
    mockFetchIdTokenWithPassword.mockResolvedValue("id-token-1");
    mockPostAuthSignIn.mockResolvedValue({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockFetchIdTokenWithPassword).toHaveBeenCalledWith(
      "user@example.com",
      "password123",
    );
    expect(mockPostAuthSignIn).toHaveBeenCalledWith("id-token-1");
    expect(result.current.user?.uid).toBe("uid-1");
  });

  it("signs up via POST /api/auth/signup", async () => {
    mockPostAuthSignUp.mockResolvedValue({ message: "ok" });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPostAuthSignUp).toHaveBeenCalledWith(
      "new@example.com",
      "password123",
    );
    expect(result.current.user).toBeNull();
  });

  it("signs out via POST /api/auth/signout", async () => {
    mockFetchAuthSession.mockResolvedValue({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });
    mockPostAuthSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.uid).toBe("uid-1");
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockPostAuthSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});
