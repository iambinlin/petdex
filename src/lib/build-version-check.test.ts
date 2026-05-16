import { describe, expect, it } from "bun:test";

import {
  fetchBuildVersion,
  getBuildVersionFromPayload,
  isChunkLoadFailure,
} from "./build-version-check";

describe("build version check helpers", () => {
  it("reads a non-empty version from version payloads", () => {
    expect(
      getBuildVersionFromPayload({
        version: "abc123",
        builtAt: "2026-05-17T00:00:00.000Z",
      }),
    ).toBe("abc123");
  });

  it("ignores missing or blank version payloads", () => {
    expect(getBuildVersionFromPayload({ version: "" })).toBeNull();
    expect(getBuildVersionFromPayload({ builtAt: "2026-05-17" })).toBeNull();
    expect(getBuildVersionFromPayload(null)).toBeNull();
  });

  it("recognizes stale chunk loading failures", () => {
    expect(isChunkLoadFailure(new Error("ChunkLoadError"))).toBe(true);
    expect(isChunkLoadFailure("Loading chunk app-gallery failed")).toBe(true);
    expect(
      isChunkLoadFailure({
        reason: new Error("failed to fetch dynamically imported module"),
      }),
    ).toBe(true);
    expect(isChunkLoadFailure(new Error("network timeout"))).toBe(false);
  });

  it("aborts version fetches that do not settle", async () => {
    let signal: AbortSignal | undefined;

    const hangingFetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as typeof fetch;

    const version = await fetchBuildVersion(hangingFetch, { timeoutMs: 1 });

    expect(version).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});
