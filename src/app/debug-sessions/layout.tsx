import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "デバッグ（セッション一覧）",
};

export default function DebugSessionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
