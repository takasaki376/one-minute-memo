import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  sendEmailVerification: (...args: unknown[]) =>
    mockSendEmailVerification(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/lib/firebase/env", () => ({
  isFirebaseConfigured: () => true,
}));

const mockAuth = { app: { name: "[DEFAULT]" } };

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => mockAuth,
}));

import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: null) => void) => {
        callback(null);
        return vi.fn();
      },
    );
  });

  it("starts unauthenticated after auth state resolves", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isConfigured).toBe(true);
  });

  it("calls signInWithEmailAndPassword", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: "1" } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      "user@example.com",
      "password123",
    );
  });

  it("calls createUserWithEmailAndPassword and sendEmailVerification on signUp", async () => {
    const mockUser = { uid: "new-user" };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockSendEmailVerification.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      "new@example.com",
      "password123",
    );
    expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser);
  });

  it("calls signOut", async () => {
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
  });
});
