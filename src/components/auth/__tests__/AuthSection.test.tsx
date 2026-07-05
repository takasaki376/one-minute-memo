import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AuthSection } from "../AuthSection";

describe("AuthSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows unconfigured message when Firebase is not set up", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isConfigured: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(<AuthSection />);

    expect(screen.getByText(/Firebase 未設定/)).toBeInTheDocument();
  });

  it("shows login and signup buttons when logged out", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isConfigured: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });

    render(<AuthSection />);

    expect(screen.getByTestId("auth-open-login")).toBeInTheDocument();
    expect(screen.getByTestId("auth-open-signup")).toBeInTheDocument();
  });

  it("shows user email and logout when logged in", async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: {
        uid: "user-123",
        email: "test@example.com",
      },
      isLoading: false,
      isConfigured: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: mockSignOut,
    });

    const user = userEvent.setup();
    render(<AuthSection />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("user-123")).toBeInTheDocument();

    await user.click(screen.getByTestId("auth-sign-out"));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
