import { expect, test } from "@playwright/test";

import { resetE2eAppState } from "./helpers/reset";
import { waitForThemeSeedReady } from "./helpers/themeSeed";
import { SESSION_UI_TIMEOUT } from "./helpers/session";

const MOBILE_VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "375x667", width: 375, height: 667 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
] as const;

async function assertNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("スマホ向けレイアウト", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await resetE2eAppState(page);
      });

      test("ヘッダーメニューから各画面へ移動でき、横はみ出しがない", async ({
        page,
      }) => {
        await page.goto("/");
        await waitForThemeSeedReady(page);
        await assertNoHorizontalOverflow(page);

        const toggle = page.getByTestId("header-menu-toggle");
        await expect(toggle).toBeVisible();
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");

        const settingLink = page
          .getByTestId("header-nav")
          .getByRole("link", { name: "設定", exact: true });
        await settingLink.click();
        await expect(page).toHaveURL(/\/setting/);
        await assertNoHorizontalOverflow(page);
      });

      test("セッションはテキスト初期・一行操作・sticky・細固定", async ({
        page,
      }) => {
        await page.goto("/session");

        await expect(
          page.locator("text=/1\\s*\\/\\s*\\d+/ >> visible=true").first(),
        ).toBeVisible({ timeout: SESSION_UI_TIMEOUT });

        await assertNoHorizontalOverflow(page);

        const textTab = page.getByRole("tab", { name: "テキスト入力" });
        await expect(textTab).toHaveAttribute("aria-selected", "true");
        await expect(page.getByTestId("split-text-panel")).toBeVisible();

        const controls = page.getByTestId("session-controls");
        await expect(
          controls.getByRole("button", { name: "一時停止" }),
        ).toBeVisible();
        await expect(
          controls.getByRole("button", { name: "このテーマを終えて次へ" }),
        ).toBeVisible();

        const controlsBox = await controls.boundingBox();
        const pauseBox = await controls
          .getByRole("button", { name: "一時停止" })
          .boundingBox();
        expect(controlsBox).not.toBeNull();
        expect(pauseBox).not.toBeNull();
        // 入力切替と操作が同じ行付近に並ぶ
        expect(Math.abs(controlsBox!.y - pauseBox!.y)).toBeLessThan(24);

        const sticky = page.getByTestId("session-sticky-chrome");
        await expect(sticky).toBeVisible();

        await page.evaluate(() => {
          const surface = document.querySelector(
            '[data-testid="split-layout"]',
          ) as HTMLElement | null;
          if (surface) {
            surface.style.minHeight = "2200px";
          }
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(150);
        const stickyAfter = await sticky.boundingBox();
        expect(stickyAfter).not.toBeNull();
        // 共通ヘッダーはスクロールアウトし、テーマ＋操作行が上端付近に留まる
        expect(stickyAfter!.y).toBeLessThanOrEqual(4);

        await page.getByRole("tab", { name: "手書き入力" }).click();
        await expect(page.getByTestId("split-handwriting-panel")).toBeVisible();

        await expect(
          page.getByRole("toolbar", { name: "手書きツール" }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "ペン" })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "消しゴム" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "クリア" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "線の太さ 細" }),
        ).toBeHidden();
        await expect(
          page.getByRole("button", { name: "線の太さ 中" }),
        ).toBeHidden();

        const inputSurface = page.getByTestId("split-layout");
        const box = await inputSurface.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(200);
      });
    });
  }

  test("767px と 768px の境界でメニュー表示が切り替わる", async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 800 });
    await resetE2eAppState(page);
    await page.goto("/");
    await waitForThemeSeedReady(page);
    await expect(page.getByTestId("header-menu-toggle")).toBeVisible();

    await page.setViewportSize({ width: 768, height: 800 });
    await expect(page.getByTestId("header-menu-toggle")).toBeHidden();
    await expect(
      page
        .getByTestId("header-nav")
        .getByRole("link", { name: "セッション", exact: true }),
    ).toBeVisible();
  });

  test("768px では手書き初期で太さ切替が見える", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await resetE2eAppState(page);
    await page.goto("/session");

    await expect(
      page.locator("text=/1\\s*\\/\\s*\\d+/ >> visible=true").first(),
    ).toBeVisible({ timeout: SESSION_UI_TIMEOUT });

    await expect(
      page.getByRole("tab", { name: "手書き入力" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("button", { name: "線の太さ 細" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "線の太さ 中" }),
    ).toBeVisible();
  });
});
