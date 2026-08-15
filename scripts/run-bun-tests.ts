/**
 * Resolve Bun unit tests under src/ (files named *.bun.test.ts or *.bun.test.tsx)
 * and run them with `bun test`.
 * Keeps package.json's Bun suite target explicit without relying on
 * ambiguous CLI substring filters (see PJ1-198 review).
 */
import { Glob } from "bun";

const patterns = ["src/**/*.bun.test.ts", "src/**/*.bun.test.tsx"] as const;

const files: string[] = [];
for (const pattern of patterns) {
  for await (const path of new Glob(pattern).scan()) {
    files.push(path);
  }
}

files.sort();

if (files.length === 0) {
  console.error(
    `No Bun test files matched: ${patterns.map((p) => JSON.stringify(p)).join(", ")}`,
  );
  process.exit(1);
}

const proc = Bun.spawn(["bun", "test", ...files], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

process.exit(await proc.exited);
