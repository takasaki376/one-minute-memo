import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("manifest", () => {
  it("exposes installable PWA metadata", () => {
    const data = manifest();

    expect(data.name).toBe("one-minute-memo");
    expect(data.short_name).toBe("1分メモ");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.theme_color).toBe("#0f172a");
    expect(data.background_color).toBe("#f8fafc");
    expect(data.icons?.length).toBeGreaterThanOrEqual(2);
    expect(data.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
