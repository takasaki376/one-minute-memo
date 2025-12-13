"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider, atom, useAtomValue, useSetAtom } from "jotai";
import { initBuiltinThemesIfNeeded } from "@/lib/db/themesRepo";

type ThemeSeedState = {
  isReady: boolean;
  isSeeding: boolean;
  error?: Error;
};

const themeSeedStateAtom = atom<ThemeSeedState>({
  isReady: false,
  isSeeding: false,
  error: undefined,
});

export function ThemeSeedProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Provider>
      <ThemeSeedInitializer />
      {children}
    </Provider>
  );
}

function ThemeSeedInitializer() {
  const startedRef = useRef(false);
  const setState = useSetAtom(themeSeedStateAtom);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setState((prev) => ({ ...prev, isSeeding: true, error: undefined }));
    initBuiltinThemesIfNeeded()
      .then(() =>
        setState({ isReady: true, isSeeding: false, error: undefined }),
      )
      .catch((err) => {
        console.error("failed to seed builtin themes", err);
        setState({
          isReady: false,
          isSeeding: false,
          error: err instanceof Error ? err : new Error("failed to seed"),
        });
      });
  }, []);

  return null;
}

export function useThemeSeedState() {
  return useAtomValue(themeSeedStateAtom);
}
