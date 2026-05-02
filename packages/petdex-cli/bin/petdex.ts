import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import * as p from "@clack/prompts";
import JSZip from "jszip";
import pc from "picocolors";

import { ClerkCliAuth } from "../src/cli-auth/index.js";

// ─── config ────────────────────────────────────────────────────────────────
const PETDEX_URL = process.env.PETDEX_URL ?? "https://petdex.crafter.run";
const CLERK_ISSUER =
  process.env.CLERK_ISSUER ?? "https://clerk.petdex.crafter.run";
const CLIENT_ID = process.env.CLERK_OAUTH_CLIENT_ID ?? "LcThwEayl6KAA1Qm";

const auth = new ClerkCliAuth({
  clientId: CLIENT_ID,
  issuer: CLERK_ISSUER,
  scopes: ["profile", "email", "openid", "offline_access"],
  storage: "keychain",
  keychainService: "petdex-cli",
});

const VERSION = "0.1.0";

// ─── entrypoint ────────────────────────────────────────────────────────────
main().catch((err) => {
  p.cancel(`petdex: ${(err as Error).message}`);
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }

  switch (cmd) {
    case "login":
      await cmdLogin();
      break;
    case "logout":
      await cmdLogout();
      break;
    case "whoami":
      await cmdWhoami();
      break;
    case "submit":
      await cmdSubmit(args.slice(1));
      break;
    case "install":
      await cmdInstall(args.slice(1));
      break;
    case "list":
      await cmdList();
      break;
    case "version":
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    default:
      console.error(pc.red(`Unknown command: ${cmd}`));
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  const c = pc.cyan;
  const dim = pc.dim;
  console.log(
    [
      "",
      `  ${pc.bold(pc.magenta("petdex"))} ${dim(VERSION)} ${dim("— Codex pet gallery CLI")}`,
      "",
      `  ${c("Usage")}`,
      `    petdex <command> [args]`,
      "",
      `  ${c("Commands")}`,
      `    ${pc.bold("login")}              Sign in with Clerk OAuth`,
      `    ${pc.bold("logout")}             Clear stored credentials`,
      `    ${pc.bold("whoami")}             Show signed-in user`,
      `    ${pc.bold("submit")} <path>      Submit a pet folder, zip, or parent of pets (bulk)`,
      `    ${pc.bold("install")} <slug>     Install a pet into ~/.codex/pets/<slug>`,
      `    ${pc.bold("list")}               List approved pets`,
      "",
      `  ${c("Examples")}`,
      `    ${dim("$")} petdex login`,
      `    ${dim("$")} petdex submit ~/.codex/pets/boba       ${dim("# single folder")}`,
      `    ${dim("$")} petdex submit ~/Downloads/boba.zip     ${dim("# zip file")}`,
      `    ${dim("$")} petdex submit ~/.codex/pets            ${dim("# bulk all subfolders")}`,
      `    ${dim("$")} petdex install boba`,
      "",
      `  ${dim("Gallery & docs:")} ${pc.underline(PETDEX_URL)}`,
      "",
    ].join("\n"),
  );
}

// ─── commands ──────────────────────────────────────────────────────────────

async function cmdLogin() {
  p.intro(pc.bgMagenta(pc.white(" petdex login ")));
  const s = p.spinner();
  s.start("Opening your browser to sign in with Clerk");
  try {
    const { user } = await auth.login();
    s.stop(pc.green("✓ ") + `Signed in as ${pc.cyan(user.email ?? user.username ?? user.sub)}`);
    p.outro(`Try ${pc.cyan("petdex submit ~/.codex/pets")} to share your pets.`);
  } catch (err) {
    s.stop(pc.red("× login failed"));
    throw err;
  }
}

async function cmdLogout() {
  await auth.logout();
  console.log(pc.green("✓ ") + "Signed out");
}

async function cmdWhoami() {
  try {
    const me = await auth.whoami();
    p.note(
      [
        `${pc.dim("user:    ")}${me.sub}`,
        `${pc.dim("email:   ")}${me.email ?? "—"}`,
        `${pc.dim("name:    ")}${[me.given_name, me.family_name].filter(Boolean).join(" ") || "—"}`,
        `${pc.dim("username:")}${me.preferred_username ?? "—"}`,
      ].join("\n"),
      "Signed in",
    );
  } catch {
    p.cancel(`Not signed in. Run ${pc.cyan("petdex login")}.`);
    process.exit(1);
  }
}

async function cmdInstall(args: string[]) {
  const slug = args[0];
  if (!slug) {
    p.cancel(`Usage: ${pc.cyan("petdex install <slug>")}`);
    process.exit(1);
  }
  const url = `${PETDEX_URL}/install/${slug}`;
  console.log(pc.dim(`fetching ${url}`));
  await runShellPipe(["sh", "-c", `curl -sSf ${shellEscape(url)} | sh`]);
  p.note(
    [
      `Activate inside Codex:`,
      `  ${pc.cyan("Settings → Appearance → Pets")} → select ${pc.bold(slug)}`,
      `Then ${pc.cyan("/pet")} inside Codex to wake or tuck it away.`,
    ].join("\n"),
    "Next steps",
  );
}

async function cmdList() {
  const s = p.spinner();
  s.start("Fetching gallery");
  const res = await fetch(`${PETDEX_URL}/api/manifest`);
  if (!res.ok) {
    s.stop(pc.red("failed"));
    throw new Error(`failed to fetch manifest: ${res.status}`);
  }
  const data = (await res.json()) as {
    total: number;
    pets: Array<{
      slug: string;
      displayName: string;
      kind: string;
      submittedBy: string | null;
    }>;
  };
  s.stop(`${data.total} pets`);

  const lines = data.pets.map((pet) => {
    const tag = pet.submittedBy ? pc.dim(` — by ${pet.submittedBy}`) : "";
    return `  ${pc.cyan(pet.slug.padEnd(26))} ${pet.displayName}${tag}`;
  });
  console.log(lines.join("\n"));
  console.log(
    `\n${pc.dim("Install with")} ${pc.cyan("petdex install <slug>")}\n${pc.dim("Browse:")} ${pc.underline(PETDEX_URL)}`,
  );
}

async function cmdSubmit(args: string[]) {
  const target = args[0];
  if (!target) {
    p.cancel(`Usage: ${pc.cyan("petdex submit <path>")}`);
    process.exit(1);
  }

  // Ensure auth before doing any work.
  let token: string;
  try {
    const t = await auth.getAccessToken();
    if (!t) {
      p.cancel(`Not signed in. Run ${pc.cyan("petdex login")}.`);
      process.exit(1);
    }
    token = t;
  } catch {
    p.cancel(`Not signed in. Run ${pc.cyan("petdex login")}.`);
    process.exit(1);
  }

  const absPath = path.resolve(target);
  const stats = await stat(absPath).catch(() => null);
  if (!stats) {
    p.cancel(`No such file or directory: ${target}`);
    process.exit(1);
  }

  p.intro(pc.bgMagenta(pc.white(" petdex submit ")));
  const scan = p.spinner();
  scan.start(`Scanning ${absPath}`);
  const candidates = await collectCandidates(absPath, stats.isDirectory());
  scan.stop(
    candidates.length > 0
      ? `${candidates.length} pet${candidates.length === 1 ? "" : "s"} found`
      : pc.red("no pets found"),
  );

  if (candidates.length === 0) {
    p.cancel(
      "A pet folder must contain pet.json and spritesheet.{webp,png}.",
    );
    process.exit(1);
  }

  if (candidates.length > 1) {
    const proceed = await p.confirm({
      message: `Submit all ${pc.bold(String(candidates.length))} pets?`,
    });
    if (p.isCancel(proceed) || !proceed) {
      p.cancel("Aborted.");
      process.exit(1);
    }
  }

  let succeeded = 0;
  let failed = 0;
  const failures: Array<{ label: string; error: string }> = [];

  for (const cand of candidates) {
    const ps = p.spinner();
    ps.start(`Submitting ${pc.cyan(cand.label)}`);
    try {
      const t = await auth.getAccessToken();
      if (!t) throw new Error("session expired");
      token = t;
      const result = await submitOne(cand, token);
      ps.stop(`${pc.green("✓")} ${pc.cyan(cand.label)} → ${pc.dim(result.slug)}`);
      succeeded++;
    } catch (err) {
      const msg = (err as Error).message;
      ps.stop(`${pc.red("×")} ${pc.cyan(cand.label)} ${pc.red(msg.slice(0, 60))}`);
      failures.push({ label: cand.label, error: msg });
      failed++;
    }
  }

  if (failures.length > 0) {
    p.note(
      failures
        .map((f) => `${pc.red("•")} ${pc.bold(f.label)}: ${f.error}`)
        .join("\n"),
      "Failures",
    );
  }

  p.outro(
    `${pc.green(String(succeeded))} submitted, ${
      failed > 0 ? pc.red(String(failed)) : pc.dim(String(failed))
    } failed. Review at ${pc.underline(PETDEX_URL + "/admin")} (admin only).`,
  );
  if (failed > 0) process.exit(1);
}

// ─── candidate collection ──────────────────────────────────────────────────

type Candidate = {
  label: string;
  source: "folder" | "zip";
  petJson: string;
  petJsonObj: Record<string, unknown>;
  zipBuffer: Buffer;
  zipFileName: string;
  spritesheetBuffer: Buffer;
  spritesheetExt: "webp" | "png";
  petIdHint: string;
};

async function collectCandidates(
  target: string,
  isDir: boolean,
): Promise<Candidate[]> {
  if (!isDir) {
    if (!target.endsWith(".zip")) {
      throw new Error(`Expected a .zip file or a folder, got: ${target}`);
    }
    const cand = await readZipCandidate(target);
    return cand ? [cand] : [];
  }

  const targetHasPetJson = await fileExists(path.join(target, "pet.json"));
  if (targetHasPetJson) {
    const cand = await readFolderCandidate(target);
    return cand ? [cand] : [];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const out: Candidate[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = path.join(target, e.name);
    const cand = await readFolderCandidate(sub);
    if (cand) out.push(cand);
  }
  return out;
}

async function readFolderCandidate(folder: string): Promise<Candidate | null> {
  const petJsonPath = path.join(folder, "pet.json");
  if (!(await fileExists(petJsonPath))) return null;

  let spritePath = path.join(folder, "spritesheet.webp");
  let spritesheetExt: "webp" | "png" = "webp";
  if (!(await fileExists(spritePath))) {
    const pngPath = path.join(folder, "spritesheet.png");
    if (!(await fileExists(pngPath))) return null;
    spritePath = pngPath;
    spritesheetExt = "png";
  }

  const petJson = await readFile(petJsonPath, "utf8");
  let petJsonObj: Record<string, unknown> = {};
  try {
    petJsonObj = JSON.parse(petJson);
  } catch {
    throw new Error(`pet.json in ${folder} is not valid JSON`);
  }
  const spritesheetBuffer = await readFile(spritePath);

  const zip = new JSZip();
  zip.file("pet.json", petJson);
  zip.file(`spritesheet.${spritesheetExt}`, spritesheetBuffer);
  const zipBuffer = Buffer.from(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
  );

  const folderName = path.basename(folder);
  return {
    label: folderName,
    source: "folder",
    petJson,
    petJsonObj,
    zipBuffer,
    zipFileName: `${folderName}.zip`,
    spritesheetBuffer,
    spritesheetExt,
    petIdHint: typeof petJsonObj.id === "string" ? petJsonObj.id : folderName,
  };
}

async function readZipCandidate(zipPath: string): Promise<Candidate | null> {
  const buf = await readFile(zipPath);
  const zip = await JSZip.loadAsync(buf);
  const petJsonEntry = zip.file("pet.json");
  const webpEntry = zip.file("spritesheet.webp");
  const pngEntry = zip.file("spritesheet.png");
  const spriteEntry = webpEntry ?? pngEntry;
  const spritesheetExt: "webp" | "png" = webpEntry ? "webp" : "png";

  if (!petJsonEntry || !spriteEntry) {
    throw new Error(
      `Zip is missing pet.json or spritesheet.{webp,png}: ${zipPath}`,
    );
  }

  const petJson = await petJsonEntry.async("string");
  let petJsonObj: Record<string, unknown> = {};
  try {
    petJsonObj = JSON.parse(petJson);
  } catch {
    throw new Error(`pet.json in zip is not valid JSON`);
  }
  const spritesheetBuffer = Buffer.from(await spriteEntry.async("uint8array"));

  const baseName = path.basename(zipPath, ".zip");
  return {
    label: baseName,
    source: "zip",
    petJson,
    petJsonObj,
    zipBuffer: buf,
    zipFileName: path.basename(zipPath),
    spritesheetBuffer,
    spritesheetExt,
    petIdHint: typeof petJsonObj.id === "string" ? petJsonObj.id : baseName,
  };
}

// ─── upload pipeline ───────────────────────────────────────────────────────

async function submitOne(
  cand: Candidate,
  bearer: string,
): Promise<{ slug: string }> {
  const { width, height } = parseImageDims(cand.spritesheetBuffer);
  if (width === 0 || height === 0) {
    throw new Error("spritesheet dimensions could not be parsed");
  }

  const presignRes = await fetch(`${PETDEX_URL}/api/cli/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slugHint: slugify(cand.petIdHint),
      petId: cand.petIdHint,
      spritesheetExt: cand.spritesheetExt,
    }),
  });

  if (!presignRes.ok) {
    const text = await presignRes.text().catch(() => "");
    throw new Error(`presign ${presignRes.status} ${text.slice(0, 100)}`);
  }

  const presigned = (await presignRes.json()) as {
    files: Array<{
      role: "zip" | "sprite" | "petjson";
      uploadUrl: string;
      publicUrl: string;
    }>;
  };

  const slot = (role: "zip" | "sprite" | "petjson") => {
    const f = presigned.files.find((x) => x.role === role);
    if (!f) throw new Error(`presign response missing ${role}`);
    return f;
  };
  const zipSlot = slot("zip");
  const spriteSlot = slot("sprite");
  const petSlot = slot("petjson");

  const spriteMime = cand.spritesheetExt === "png" ? "image/png" : "image/webp";

  await Promise.all([
    putR2(zipSlot.uploadUrl, cand.zipBuffer, "application/zip"),
    putR2(spriteSlot.uploadUrl, cand.spritesheetBuffer, spriteMime),
    putR2(
      petSlot.uploadUrl,
      Buffer.from(cand.petJson, "utf8"),
      "application/json",
    ),
  ]);

  const reg = await fetch(`${PETDEX_URL}/api/cli/submit/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zipUrl: zipSlot.publicUrl,
      spritesheetUrl: spriteSlot.publicUrl,
      petJsonUrl: petSlot.publicUrl,
      petId: cand.petIdHint,
      displayName: pickString(cand.petJsonObj.displayName, "Untitled pet"),
      description: pickString(
        cand.petJsonObj.description,
        "A Codex-compatible digital pet.",
      ),
      spritesheetWidth: width,
      spritesheetHeight: height,
    }),
  });

  if (!reg.ok) {
    const text = await reg.text().catch(() => "");
    throw new Error(`register ${reg.status} ${text.slice(0, 100)}`);
  }

  const data = (await reg.json()) as { slug: string };
  return data;
}

async function putR2(
  url: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${res.status}`);
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function pickString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function runShellPipe(cmd: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd[0], cmd.slice(1), { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`shell exit ${code}`));
    });
  });
}

function parseImageDims(buf: Buffer): { width: number; height: number } {
  // PNG
  if (
    buf.length > 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // WebP
  if (
    buf.length > 30 &&
    buf.slice(0, 4).toString() === "RIFF" &&
    buf.slice(8, 12).toString() === "WEBP"
  ) {
    const fourcc = buf.slice(12, 16).toString();
    if (fourcc === "VP8X") {
      return {
        width: ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) >>> 0) + 1,
        height: ((buf[27] | (buf[28] << 8) | (buf[29] << 16)) >>> 0) + 1,
      };
    }
    if (fourcc === "VP8L") {
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      return {
        width: ((buf[21] | ((b1 & 0x3f) << 8)) >>> 0) + 1,
        height:
          ((((b1 >> 6) | (b2 << 2)) | ((b3 & 0x0f) << 10)) >>> 0) + 1,
      };
    }
    if (fourcc === "VP8 ") {
      for (let i = 23; i < Math.min(60, buf.length - 7); i++) {
        if (buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a) {
          return {
            width: (buf[i + 3] | (buf[i + 4] << 8)) & 0x3fff,
            height: (buf[i + 5] | (buf[i + 6] << 8)) & 0x3fff,
          };
        }
      }
    }
  }
  return { width: 0, height: 0 };
}
