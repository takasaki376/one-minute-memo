import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">
          <Link href="/">one-minute-memo</Link>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/">Home</Link>
          <Link href="/session">セッション</Link>
          <Link href="/history">履歴</Link>
          <Link href="/themes">テーマ管理</Link>
        </nav>
      </div>
    </header>
  );
}
