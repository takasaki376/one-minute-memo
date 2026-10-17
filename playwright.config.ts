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

  // 並列ワーカー数を制限
  // next dev はオンデマンドコンパイルのため、ワーカー数が多いと
  // 複数ルートへの同時アクセスでサーバーが詰まりタイムアウトしやすい。
  // CIでは1、ローカルでも過度な並列を避けるため上限を設ける。
  workers: process.env.CI ? 1 : 2,

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
    command: "bun run dev",
    url: "http://localhost:3000",
    // ローカルは .env.local を優先する。CI だけサーバー用のダミーを足す。
    env: process.env.CI
      ? {
          ...process.env,
          FIREBASE_WEB_API_KEY:
            process.env.FIREBASE_WEB_API_KEY || "e2e-api-key",
          FIREBASE_ADMIN_PROJECT_ID:
            process.env.FIREBASE_ADMIN_PROJECT_ID || "e2e",
          FIREBASE_ADMIN_CLIENT_EMAIL:
            process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
            "firebase-adminsdk@e2e.iam.gserviceaccount.com",
          FIREBASE_ADMIN_PRIVATE_KEY:
            process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
            "-----BEGIN PRIVATE KEY-----\\ne2e\\n-----END PRIVATE KEY-----",
        }
      : undefined,
    // ローカル開発時のみ既存サーバーを再利用（CIでは常に新規起動）
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
