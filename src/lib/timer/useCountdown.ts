import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownOptions {
  /** 初期秒数（例: 60） */
  initialSeconds: number;
  /** 自動でカウントダウンを開始するかどうか（true で自動開始） */
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

  // 初期秒数の参照を保持（reset で使用）
  const initialSecondsRef = useRef(initialSeconds);

  // onFinish の ref に値を設定
  const onFinishRef = useRef<(() => void) | undefined>(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const safeInitialSeconds = Math.max(0, initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState<number>(safeInitialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);

  // secondsLeft の ref に値を設定（start で使用）
  const secondsLeftRef = useRef(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // initialSeconds の変更時の処理（reset で使用）
  useEffect(() => {
    initialSecondsRef.current = Math.max(0, initialSeconds);
  }, [initialSeconds]);

  // interval ID を保持する ref
  const intervalIdRef = useRef<number | null>(null);
  // onFinish の呼び出し状態を管理（Strict Mode 対策）
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
    const next = Math.max(
      0,
      newInitialSeconds ?? initialSecondsRef.current ?? 0
    );
    initialSecondsRef.current = next;
    // Keep the ref in sync so a start() immediately after reset() can proceed.
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
