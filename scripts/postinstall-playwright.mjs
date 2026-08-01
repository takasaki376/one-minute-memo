/**
 * Vercel の本番/プレビュービルドでは E2E 用ブラウザは不要。
 * Bun の postinstall では `playwright` が PATH に乗らないことがあるため bunx を使う。
 */
import { execSync } from "node:child_process";

if (process.env.VERCEL) {
  console.log("Skipping Playwright browser install on Vercel");
  process.exit(0);
}

execSync("bunx playwright install chromium", { stdio: "inherit" });
