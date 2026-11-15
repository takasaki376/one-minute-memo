import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/auth/HeaderAuthControl", () => ({
  HeaderAuthControl: () => (
    <button type="button" data-testid="header-auth-login">
      ログイン
    </button>
  ),
}));

import { Header } from "@/components/ui/Header";

describe("Header", () => {
  afterEach(() => {
    cleanup();
  });

  it("toggles the mobile menu with aria attributes", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByTestId("header-menu-toggle");
    const nav = screen.getByTestId("header-nav");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(nav.className).toContain("hidden");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", nav.id);
    expect(nav.className).not.toMatch(/(?:^|\s)hidden(?:\s|$)/);
    expect(screen.getByRole("link", { name: "セッション" })).toBeVisible();
  });

  it("closes the menu when a nav link is selected", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByTestId("header-menu-toggle");
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "履歴" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByTestId("header-menu-toggle");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("keeps login control reachable inside the menu", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByTestId("header-menu-toggle"));
    expect(screen.getByTestId("header-auth-login")).toBeInTheDocument();
  });
});
