import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">one-minute-memo</h1>
        <p className="text-lg text-slate-600">1分で思考を書き出すメモアプリ</p>
        <p className="text-slate-700 leading-relaxed">
          テーマに沿って、1分間思いつくままに書き出してみましょう。
          書き終えた内容は履歴として振り返ることができます。
        </p>
      </div>
      <div className="space-x-2">
        <Link href="/session">セッションを開始</Link>
        <Link href="/history">履歴を見る</Link>
        <Link href="/themes">テーマ管理</Link>
      </div>
    </div>
  );
}
