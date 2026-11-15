"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { HeaderAuthControl } from "@/components/auth/HeaderAuthControl";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/session", label: "セッション" },
  { href: "/history", label: "履歴" },
  { href: "/themes", label: "テーマ管理" },
  { href: "/setting", label: "設定" },
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const closeMenuAndRestoreFocus = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenuAndRestoreFocus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenuAndRestoreFocus]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        navRef.current?.contains(target) ||
        toggleRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header className="relative border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="relative mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-3 md:px-4">
        <div className="min-w-0 shrink font-semibold text-slate-900 dark:text-slate-100">
          <Link
            href="/"
            className="block truncate hover:text-slate-700 dark:hover:text-slate-300"
            onClick={closeMenu}
          >
            one-minute-memo
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          data-testid="header-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">
            {menuOpen ? "メニューを閉じる" : "メニューを開く"}
          </span>
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </span>
        </button>

        <nav
          ref={navRef}
          id={menuId}
          data-testid="header-nav"
          className={[
            "text-sm",
            menuOpen
              ? "absolute left-0 right-0 top-[3.25rem] z-40 flex flex-col gap-1 border-b border-slate-200 bg-white px-3 py-3 shadow-md dark:border-slate-700 dark:bg-slate-900"
              : "hidden",
            "md:relative md:top-auto md:z-auto md:flex md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none",
          ].join(" ")}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 md:min-h-0 md:rounded-none md:px-0 md:py-0 md:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:dark:hover:bg-transparent"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex min-h-11 items-center px-3 md:min-h-0 md:px-0">
            <HeaderAuthControl />
          </div>
        </nav>
      </div>
    </header>
  );
}
