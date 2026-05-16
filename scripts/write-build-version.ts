import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const versionPath = path.join(publicDir, "version.json");

async function main() {
  await mkdir(publicDir, { recursive: true });

  const versionInfo = {
    version: resolveBuildVersion(),
    builtAt: new Date().toISOString(),
  };

  await writeFile(versionPath, `${JSON.stringify(versionInfo, null, 2)}\n`);
}

function resolveBuildVersion() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return `local-${Date.now().toString()}`;
  }
}

await main();
