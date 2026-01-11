import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">
            one-minute-memo
          </Link>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/"
            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Home
          </Link>
          <Link
            href="/session"
            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            セッション
          </Link>
          <Link
            href="/history"
            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            履歴
          </Link>
          <Link
            href="/themes"
            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            テーマ管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
