import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { ThemeSeedProvider } from "@/components/providers/ThemeSeedProvider";

export const metadata: Metadata = {
  title: {
    default: "one-minute-memo",
    template: "%s | one-minute-memo",
  },
  description: "1分で思考を書き出すメモアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      >
        <ThemeSeedProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <div className="max-w-4xl mx-auto px-4 py-6">
                {children}
              </div>
            </main>
            <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="max-w-4xl mx-auto px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                © {new Date().getFullYear()} one-minute-memo
              </div>
            </footer>
          </div>
        </ThemeSeedProvider>
      </body>
    </html>
  );
}
