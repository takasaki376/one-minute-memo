import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "セッション完了",
};

export default function SessionCompleteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
