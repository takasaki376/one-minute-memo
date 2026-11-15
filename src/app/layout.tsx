import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Header } from "@/components/ui/Header";
import { ThemeSeedProvider } from "@/components/providers/ThemeSeedProvider";

const APP_NAME = "one-minute-memo";
const APP_DESCRIPTION = "1分で思考を書き出すメモアプリ";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <div className="mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-6">
                  {children}
                </div>
              </main>
              <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="mx-auto max-w-4xl px-3 py-3 text-xs text-slate-500 md:px-4 dark:text-slate-400">
                  © {new Date().getFullYear()} one-minute-memo
                </div>
              </footer>
            </div>
            <ServiceWorkerRegister />
          </AuthProvider>
        </ThemeSeedProvider>
      </body>
    </html>
  );
}
