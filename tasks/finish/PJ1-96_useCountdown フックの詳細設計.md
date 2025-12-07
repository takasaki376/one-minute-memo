いいですね、ここをちゃんと決めておくとセッション画面の実装がかなり楽になります。
{{useCountdown}} *の詳細設計を、そのままタスクに落とせる形で*整理します。

----

## 🏷 タスク名

*useCountdown フック詳細設計＆実装（*{{src/lib/timer/useCountdown.ts}}*）*

----

## 1. 仕様・インターフェース設計

1. フックの置き場所を確定する
#* {{src/lib/timer/useCountdown.ts}}
1. 引数（options）を決める
#* 候補：
#** {{initialSeconds: number}}（必須）
#** {{autoStart?: boolean}}（デフォルト true or false を決める）
#** {{onFinish?: () => void}}（0になった瞬間に呼ばれるコールバック）
1. 戻り値の構造を決める
#* 候補：
#** {{secondsLeft: number}}
#** {{isRunning: boolean}}
#** {{start: () => void}}
#** {{pause: () => void}}
#** {{reset: (newInitialSeconds?: number) => void}}
1. セッション画面での利用シーンを想定したサンプル呼び出しをメモに書く
#* 例：
```const {
  secondsLeft,
  isRunning,
  start,
  pause,
  reset,
} = useCountdown({
  initialSeconds: 60,
  autoStart: true,
  onFinish: handleThemeFinished,
});
```

----

## 2. 動作仕様の詳細定義

1. {{autoStart}} が true の場合の挙動を定義
#* マウント時に自動でカウントダウン開始
1. {{autoStart}} が false の場合の挙動を定義
#* {{start()}} が呼ばれるまで {{secondsLeft = initialSeconds}} のまま待機
1. {{secondsLeft}} が 0 のときの扱いを定義
#* 0 になった瞬間に {{onFinish}} を1回だけ呼ぶ
#* 0 以下にはならない（{{0}} で止まる）
1. {{start()}} 呼び出し時の挙動定義
#* すでにカウント中（{{isRunning === true}}）なら何もしないか、再スタートするかを決める
#* MVP では「すでに実行中なら何もしない」でOK
1. {{pause()}} 呼び出し時の挙動定義
#* {{isRunning}} を false にする
#* 残り秒数は保持したまま
1. {{reset()}} 呼び出し時の挙動定義
#* タイマーを止めるかどうか（MVPでは止める）
#* {{secondsLeft}} を
#** 引数あり：{{newInitialSeconds}} に
#** 引数なし：最初の {{initialSeconds}} に
戻す方針にする

----

## 3. 実装方針（内部ロジック）の設計

1. タイマー実装方式を決める
#* {{setInterval}}（1000ms ごと）を使う
#* {{useEffect}} + {{setInterval}} で管理
1. {{setInterval}} の管理方法を決める
#* {{useRef<number | null>}} で timerId を保持
#* {{start()}} で interval を作成
#* {{pause()}} / {{reset()}} / アンマウント時に {{clearInterval}}
1. 時間のカウント方法を決める
#* MVPではシンプルに「1秒ごとに {{secondsLeft - 1}}」
#* 将来ずれが気になる場合に {{Date.now()}} ベースにする余地はメモだけ残す

----

## 4. ライフサイクル・クリーンアップ設計

1. コンポーネントのアンマウント時に {{clearInterval}} する処理を設計
#* {{useEffect}} の cleanup 内で実装
1. {{initialSeconds}} や {{onFinish}} が変わった場合の挙動をどうするか決める
#* MVPでは「基本的に変えない前提」として、依存配列は最小限にする
#* 変える可能性がある場合は {{useRef}} に閉じ込めるかどうかを検討

----

## 5. エッジケース対応の設計

1. {{initialSeconds <= 0}} のときの扱いを定義
#* 0 以下なら「即終了」とみなして、タイマーを回さず {{secondsLeft = 0}} にしておく
1. {{start()}} → {{reset()}} → {{start()}} のような連続操作の想定をする
#* 多重 {{setInterval}} が作られないようにガードする方法を決める
1. {{onFinish}} の多重実行を防ぐ仕様を決める
#* 「0 になった1回だけ」呼ぶようにフラグ管理するか
#* {{secondsLeft === 0 && isRunning === true}} のときだけ呼んで、その直後に停止する

----

## 6. 型定義・ファイル構成タスク

1. {{useCountdown}} の型定義をファイル内に書く
#* {{interface UseCountdownOptions { ... }}}
#* {{interface UseCountdownResult { ... }}}
1. export 形式を決める
#* {{export function useCountdown(...)}}（named export）
1. 他ファイルからは {{import { useCountdown } from '@/lib/timer/useCountdown';}} で使う想定にする

----

## 7. セッション画面への組み込み観点の確認

1. セッション画面での利用パターンを紙に書き出す
#* セッション開始時：{{autoStart: true}}
#* テーマ切替時：{{reset(60); start();}} のようなフロー
1. 「テーマごとに1分カウント → onFinish で次へ」という流れとインターフェースの整合を確認する

----

## 8. テスト観点・検証タスク

1. 手動テストシナリオを定義する
#* {{initialSeconds = 5}} で挙動確認（ブラウザ上で）
#* {{start}} → 5秒後に 0 / onFinish 呼ばれるか
#* {{pause}} → カウント停止するか
#* {{reset}} → 残り秒数が戻るか
1. 将来 Vitest 導入時にテストしやすいように
#* タイマー部分を {{setInterval}} ベタ書きにするか、ラッパー関数にするか軽く検討（今はメモだけ）

----

## ✅ useCountdown タスクの完了条件（DoD）

- {{useCountdown({ initialSeconds: 60, autoStart: true, onFinish })}} を
任意のコンポーネントから呼び出して、
** {{secondsLeft}} が 60 から 0 まで1秒ごとに減る
** 0 になったときに {{onFinish}} が1回だけ呼ばれる
- {{pause()}} / {{reset()}} / {{start()}} の基本的な動作が目視で確認できる
- 多重 {{setInterval}} や onFinish の多重実行が起きない実装になっている

----

- 今の設計に沿った {{useCountdown}} *の実装サンプル（TypeScriptコード）*


{{src/lib/timer/useCountdown.ts}} *の実装サンプル*です。

----

## 📄 {{src/lib/timer/useCountdown.ts}}

```import { useEffect, useRef, useState } from 'react';

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
    if (secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // 0 になるタイミング
          // ここで止めて onFinish を1回だけ呼ぶ
          window.clearInterval(id);
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
      window.clearInterval(id);
    };
  }, [isRunning, secondsLeft]);

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
```

----

## 🔍 セッション画面での利用イメージ

```import { useCountdown } from '@/lib/timer/useCountdown';

function SessionTimer({ onThemeFinished }: { onThemeFinished: () => void }) {
  const { secondsLeft, isRunning, start, reset } = useCountdown({
    initialSeconds: 60,
    autoStart: true,
    onFinish: onThemeFinished,
  });

  // テーマ切替時の例
  const handleNextTheme = () => {
    onThemeFinished();          // 現在テーマのメモ保存など
    reset(60);                  // 次のテーマ用に60秒に戻す
    start();                    // 再スタート
  };

  return (
    <div>
      <div>残り {secondsLeft} 秒</div>
      <button onClick={handleNextTheme} disabled={!isRunning}>
        （デバッグ用）次のテーマへ
      </button>
    </div>
  );
}
```

----
