import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "テーマ管理",
};

export default function ThemesPage() {
  return <ThemesPageClient />;
}

import ThemesPageClient from "./themesPageClient";
