"use client";

import Link from "next/link";
import { useCountdown } from "@/lib/timer/useCountdown";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function SessionPage() {
  const [onFinishCallCount, setOnFinishCallCount] = useState(0);
  const [testInitialSeconds, setTestInitialSeconds] = useState(5);

  const { secondsLeft, isRunning, start, pause, reset } = useCountdown({
    initialSeconds: testInitialSeconds,
    autoStart: false,
    onFinish: () => {
      setOnFinishCallCount((prev) => prev + 1);
    },
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        セッション画面（useCountdown テスト）
      </h1>

      <div className="space-y-4 p-4 border rounded">
        <div>
          <p className="text-lg">
            残り秒数: <span className="font-bold text-2xl">{secondsLeft}</span>
          </p>
          <p className="text-sm text-gray-600">
            実行中: {isRunning ? "はい" : "いいえ"}
          </p>
          <p className="text-sm text-gray-600">
            onFinish 呼び出し回数: {onFinishCallCount}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={start}
            variant="primary"
            disabled={isRunning || secondsLeft <= 0}
          >
            開始
          </Button>
          <Button onClick={pause} variant="secondary" disabled={!isRunning}>
            一時停止
          </Button>
          <Button onClick={() => reset()} variant="secondary">
            リセット
          </Button>
          <Button onClick={() => reset(10)} variant="secondary">
            10秒にリセット
          </Button>
        </div>

        <div className="pt-4 border-t">
          <label
            htmlFor="initial-seconds-slider"
            className="block text-sm font-medium mb-2"
          >
            初期秒数: {testInitialSeconds}
          </label>
          <input
            id="initial-seconds-slider"
            type="range"
            min="1"
            max="60"
            value={testInitialSeconds}
            onChange={(e) => setTestInitialSeconds(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <Link href="/session/complete" className="text-blue-600 underline">
          （テスト用）完了画面へ
        </Link>
      </div>
    </div>
  );
}
