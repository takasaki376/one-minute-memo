/**
 * Resolve Bun unit tests under src/ (files named *.bun.test.ts or *.bun.test.tsx)
 * and run them with `bun test`.
 * Keeps package.json's Bun suite target explicit without relying on
 * ambiguous CLI substring filters (see PJ1-198 review).
 */
import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = "src";
const BUN_TEST_FILE = /\.bun\.test\.tsx?$/;

async function collectBunTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectBunTestFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && BUN_TEST_FILE.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = (await collectBunTestFiles(ROOT)).sort();

if (files.length === 0) {
  console.error(
    `No Bun test files matched under ${ROOT}/ (expected *.bun.test.ts or *.bun.test.tsx)`,
  );
  process.exit(1);
}

const result = spawnSync("bun", ["test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
