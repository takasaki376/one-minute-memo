import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SyncSection } from "@/components/sync/SyncSection";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/sync/syncService", () => ({
  syncUserData: vi.fn(),
  fetchCloudLastSyncedAt: vi.fn().mockResolvedValue(null),
  fetchLocalLastSyncedAt: vi.fn().mockResolvedValue(null),
}));

describe("SyncSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows login required message when not logged in", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isConfigured: true,
    });

    render(<SyncSection />);

    expect(
      await screen.findByText("データ同期を利用するにはログインしてください"),
    ).toBeInTheDocument();
  });

  it("shows sync button when logged in", async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "user-1", email: "test@example.com" },
      isLoading: false,
      isConfigured: true,
    });

    render(<SyncSection />);

    expect(await screen.findByTestId("sync-data-button")).toBeInTheDocument();
    expect(await screen.findByText("前回同期")).toBeInTheDocument();
  });
});
