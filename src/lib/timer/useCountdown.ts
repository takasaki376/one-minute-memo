import { useCallback, useEffect, useRef, useState } from "react";

function clampSeconds(seconds: number): number {
  return Math.max(0, seconds);
}

export interface UseCountdownOptions {
  /**
   * 初期秒数（例: 60）
   * マウント時の state 初期化にのみ使用する。再レンダーで変えても `secondsLeft` は追従しない。
   * 実行中に秒数を変える場合は `reset()` を使う。
   */
  initialSeconds: number;
  /**
   * 自動でカウントダウンを開始するか（デフォルト: true）
   * マウント時の `isRunning` 初期化にのみ使用する。
   */
  autoStart?: boolean;
  /** カウントダウンが終了したときに呼び出されるコールバック関数 */
  onFinish?: () => void;
}

export interface UseCountdownResult {
  /** 残り秒数 */
  secondsLeft: number;
  /** カウントダウンが実行中かどうか */
  isRunning: boolean;
  /** カウントダウンを開始する */
  start: () => void;
  /** カウントダウンを一時停止する */
  pause: () => void;
  /**
   * カウントダウンをリセットする
   * newInitialSeconds が指定された場合はその値で初期秒数を更新
   * 指定されなかった場合は initialSeconds の値で初期秒数を更新
   */
  reset: (newInitialSeconds?: number) => void;
}

/**
 * カウントダウンタイマーのカスタムフック
 */
export function useCountdown(options: UseCountdownOptions): UseCountdownResult {
  const { initialSeconds, autoStart = true, onFinish } = options;

  const initialSecondsRef = useRef(clampSeconds(initialSeconds));

  const onFinishRef = useRef<(() => void) | undefined>(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const [secondsLeft, setSecondsLeft] = useState(() =>
    clampSeconds(initialSeconds),
  );
  const [isRunning, setIsRunning] = useState(() => autoStart);

  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    initialSecondsRef.current = clampSeconds(initialSeconds);
  }, [initialSeconds]);

  const intervalIdRef = useRef<number | null>(null);
  const onFinishCalledRef = useRef(false);

  useEffect(() => {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (!isRunning) return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalIdRef.current !== null) {
            window.clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
          }
          setIsRunning(false);
          if (onFinishRef.current && !onFinishCalledRef.current) {
            onFinishCalledRef.current = true;
            onFinishRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    intervalIdRef.current = id;

    return () => {
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    if (secondsLeftRef.current <= 0) {
      return;
    }
    onFinishCalledRef.current = false;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newInitialSeconds?: number) => {
    const next = clampSeconds(
      newInitialSeconds ?? initialSecondsRef.current ?? 0,
    );
    initialSecondsRef.current = next;
    secondsLeftRef.current = next;
    setSecondsLeft(next);
    setIsRunning(false);
    onFinishCalledRef.current = false;
  }, []);

  return {
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
  };
}
