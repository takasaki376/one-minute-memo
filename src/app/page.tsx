import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">one-minute-memo</h1>
      <div className="space-x-2">
        <Link href="/session">セッションを開始</Link>
        <Link href="/history">履歴を見る</Link>
        <Link href="/themes">テーマ管理</Link>
      </div>
    </div>
  );
}
