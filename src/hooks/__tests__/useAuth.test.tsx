import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockFetchAuthSession = vi.fn();
const mockPostAuthSignIn = vi.fn();
const mockPostAuthSignUp = vi.fn();
const mockPostAuthSignOut = vi.fn();

vi.mock("@/lib/auth/clientApi", () => ({
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
  postAuthSignIn: (...args: unknown[]) => mockPostAuthSignIn(...args),
  postAuthSignUp: (...args: unknown[]) => mockPostAuthSignUp(...args),
  postAuthSignOut: (...args: unknown[]) => mockPostAuthSignOut(...args),
}));

import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuthSession.mockResolvedValue({
      user: null,
      configured: true,
    });
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

  it("marks auth as unconfigured from session", async () => {
    mockFetchAuthSession.mockResolvedValue({
      user: null,
      configured: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConfigured).toBe(false);
  });

  it("restores SessionUser from GET /api/auth/session", async () => {
    mockFetchAuthSession.mockResolvedValue({
      user: {
        uid: "uid-1",
        email: "user@example.com",
        emailVerified: true,
      },
      configured: true,
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

  it("signs in via POST /api/auth/signin with email and password", async () => {
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

    expect(mockPostAuthSignIn).toHaveBeenCalledWith(
      "user@example.com",
      "password123",
    );
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
      user: {
        uid: "uid-1",
        email: "user@example.com",
        emailVerified: true,
      },
      configured: true,
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
