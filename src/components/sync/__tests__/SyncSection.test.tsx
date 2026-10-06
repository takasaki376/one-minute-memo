import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SyncSection } from "@/components/sync/SyncSection";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/sync/syncService", () => ({
  syncUserData: vi.fn(),
  fetchSyncState: vi.fn().mockResolvedValue({
    lastSyncedAt: null,
    hasRemoteDifference: false,
  }),
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

  it("shows an error when sync state fails", async () => {
    const { fetchSyncState } = await import("@/lib/sync/syncService");
    vi.mocked(fetchSyncState).mockRejectedValueOnce(
      new Error("同期に失敗しました"),
    );
    mockUseAuth.mockReturnValue({
      user: { uid: "user-1", email: "test@example.com" },
      isLoading: false,
      isConfigured: true,
    });

    render(<SyncSection />);

    expect(await screen.findByText("同期に失敗しました")).toBeInTheDocument();
  });
});
