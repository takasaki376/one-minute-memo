import { useEffect, useRef, useState } from "react";

export interface UseCountdownOptions {
  /** 初期秒数（例: 60） */
  initialSeconds: number;
  /** マウント時に自動でスタートするかどうか（デフォルト: true） */
  autoStart?: boolean;
  /** 0秒になったタイミングで1度だけ呼ばれるコールバック */
  onFinish?: () => void;
}

export interface UseCountdownResult {
  /** 残り秒数 */
  secondsLeft: number;
  /** タイマーが動作中かどうか */
  isRunning: boolean;
  /** カウントダウンを開始・再開 */
  start: () => void;
  /** カウントダウンを一時停止 */
  pause: () => void;
  /**
   * カウントダウンをリセット
   * newInitialSeconds が指定されていればその値でリセット、
   * なければ初期値(initialSeconds)でリセット
   */
  reset: (newInitialSeconds?: number) => void;
}

/**
 * シンプルなカウントダウン用フック。
 * セッション画面の「1分タイマー」にそのまま使える想定。
 */
export function useCountdown(options: UseCountdownOptions): UseCountdownResult {
  const { initialSeconds, autoStart = true, onFinish } = options;

  // 現在の "基準の初期値" を保持（reset のときに使う）
  const initialSecondsRef = useRef(initialSeconds);

  // onFinish を ref に保持して、依存配列を増やさないようにする
  const onFinishRef = useRef<(() => void) | undefined>(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const safeInitialSeconds = Math.max(0, initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState<number>(safeInitialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);

  // initialSeconds が外から変わった場合の追従（頻繁には変えない想定）
  // 注意: このuseEffectはinitialSecondsRefの更新のみを行い、
  // 状態の更新はreset関数経由で行うことを推奨
  useEffect(() => {
    const safe = Math.max(0, initialSeconds);
    initialSecondsRef.current = safe;
    // initialSecondsが変わった場合、状態を更新する必要がある場合は
    // 呼び出し側でreset()を呼び出すことを推奨
    // ここではrefのみ更新（パフォーマンスとReactのベストプラクティスのため）
  }, [initialSeconds]);

  // interval ID を保持する ref（クリーンアップ用）
  const intervalIdRef = useRef<number | null>(null);
  // onFinish が既に呼ばれたかどうかを追跡（React Strict Mode での重複呼び出しを防ぐ）
  const onFinishCalledRef = useRef<boolean>(false);

  // カウントダウン本体

  // secondsLeft を依存配列に含めない理由: setInterval のコールバック内で prev を使っているため、
  // secondsLeft が変わるたびに interval を再作成する必要はない。含めると毎秒 interval が再作成される問題が発生する。
  useEffect(() => {
    // 既存の interval をクリーンアップ
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (!isRunning) return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // 0 になるタイミング
          // ここで止めて onFinish を1回だけ呼ぶ
          if (intervalIdRef.current !== null) {
            window.clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
          }
          setIsRunning(false);
          // onFinish が既に呼ばれていない場合のみ呼ぶ（React Strict Mode での重複呼び出しを防ぐ）
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

  const start = () => {
    if (secondsLeft <= 0) {
      // 0から再スタートしたい場合は reset → start の組み合わせで呼んでもらう前提
      return;
    }
    onFinishCalledRef.current = false;
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = (newInitialSeconds?: number) => {
    const next = Math.max(
      0,
      newInitialSeconds ?? initialSecondsRef.current ?? 0
    );
    initialSecondsRef.current = next;
    setSecondsLeft(next);
    setIsRunning(false);
    // reset 時に onFinish 呼び出しフラグをリセット
    onFinishCalledRef.current = false;
  };

  return {
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
  };
}
