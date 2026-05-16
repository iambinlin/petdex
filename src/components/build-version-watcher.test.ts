import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./build-version-watcher.tsx", import.meta.url),
  "utf8",
);

describe("BuildVersionWatcher polling behavior", () => {
  it("checks on visibility and focus changes", () => {
    expect(source).toContain("visibilitychange");
    expect(source).toContain("focus");
  });

  it("starts and clears a foreground interval", () => {
    expect(source).toContain("setInterval");
    expect(source).toContain("clearInterval");
    expect(source).toContain('document.visibilityState !== "visible"');
  });
});
