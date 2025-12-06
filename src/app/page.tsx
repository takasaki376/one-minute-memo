"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  useEffect(() => {
    // TODO: 初期テーマ投入処理 (initBuiltinThemesIfNeeded) を呼び出す
    // 実装が完了次第、ここで呼び出す
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 max-w-xl mx-auto px-4">
      {/* アプリ名・サブタイトル */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">one-minute-memo</h1>
        <p className="text-lg text-slate-600">
          1分で思考を書き出すメモアプリ
        </p>
      </div>

      {/* 説明文 */}
      <p className="text-center text-slate-700 max-w-md">
        ゼロ秒思考を簡単に・継続しやすく。10個のテーマについて、1分ずつ集中して書き出します。
      </p>

      {/* メインアクション：セッション開始ボタン */}
      <div className="w-full max-w-sm">
        <Button href="/session" variant="primary" className="w-full text-lg py-4">
          セッションを開始
        </Button>
      </div>

      {/* その他のアクション */}
      <div className="w-full max-w-sm space-y-3">
        <Button href="/history" variant="secondary" className="w-full">
          履歴を見る
        </Button>
        <Button href="/themes" variant="secondary" className="w-full">
          テーマを管理
        </Button>
      </div>

      {/* 将来的に統計を置くスペース */}
      <div className="w-full max-w-sm mt-8 pt-8 border-t border-slate-200">
        {/* TODO: 簡易統計（総セッション数など）をここに配置 */}
      </div>
    </div>
  );
}
