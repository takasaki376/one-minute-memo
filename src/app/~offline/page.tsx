import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          オフラインです
        </h1>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          ネットワークに接続できません。IndexedDB
          に保存済みのデータは、ホーム画面から通常どおり利用できます。
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        ホームへ戻る
      </Link>
    </div>
  );
}
