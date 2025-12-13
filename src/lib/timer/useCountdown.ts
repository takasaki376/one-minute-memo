import { useEffect, useRef, useState } from 'react';

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

  const [secondsLeft, setSecondsLeft] = useState<number>(
    Math.max(0, initialSeconds),
  );
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);

  // initialSeconds が外から変わった場合の追従（頻繁には変えない想定）
  useEffect(() => {
    const safe = Math.max(0, initialSeconds);
    initialSecondsRef.current = safe;
    setSecondsLeft(safe);
    // autoStart の変更には追従しない（基本固定前提）
    // 必要になればここで setIsRunning(autoStart) など調整
  }, [initialSeconds]);

  // カウントダウン本体
  useEffect(() => {
    if (!isRunning) return;
    if (typeof window === 'undefined') return;

    const id = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // 0 になるタイミング
          // ここで止めて onFinish を1回だけ呼ぶ
          setIsRunning(false);
          if (onFinishRef.current) {
            onFinishRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (typeof window !== 'undefined') {
        window.clearInterval(id);
      }
    };
  }, [isRunning]);

  const start = () => {
    if (secondsLeft <= 0) {
      // 0から再スタートしたい場合は reset → start の組み合わせで呼んでもらう前提
      return;
    }
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = (newInitialSeconds?: number) => {
    const next = Math.max(
      0,
      newInitialSeconds ?? initialSecondsRef.current ?? 0,
    );
    initialSecondsRef.current = next;
    setSecondsLeft(next);
    setIsRunning(false);
  };

  return {
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
  };
}
