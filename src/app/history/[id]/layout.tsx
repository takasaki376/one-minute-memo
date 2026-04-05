import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "メモ詳細",
};

export default function HistoryDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
