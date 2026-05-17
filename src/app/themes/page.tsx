import type { Metadata } from "next";
import ThemesPageClient from "./themesPageClient";

export const metadata: Metadata = {
  title: "テーマ管理",
};

export default function ThemesPage() {
  return <ThemesPageClient />;
}
