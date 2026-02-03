import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 設定ファイル
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // テストファイルのディレクトリ
  testDir: "./e2e",

  // テストの並列実行
  fullyParallel: true,

  // CI環境では失敗時に2回リトライし、ローカルではリトライなし
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // CI環境では並列ワーカー数を制限
  workers: process.env.CI ? 1 : undefined,

  // レポーター設定
  reporter: [["html", { open: "never" }]],

  // 全テスト共通の設定
  use: {
    // ベースURL
    baseURL: "http://localhost:3000",

    // スクリーンショット設定（失敗時のみ）
    screenshot: "only-on-failure",

    // 動画設定（失敗時のみ）
    video: "retain-on-failure",

    // トレース設定（失敗時のみ）
    trace: "retain-on-failure",
  },

  // プロジェクト設定（ブラウザ）
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // 必要に応じて他のブラウザを追加
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
  ],

  // 開発サーバーの自動起動
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    // ローカル開発時のみ既存サーバーを再利用（CIでは常に新規起動）
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
