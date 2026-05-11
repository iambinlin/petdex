import crypto from "node:crypto";

const PETDEX_URL = "https://petdex.crafter.run";
const DEFAULT_SCOPES = ["profile", "email", "openid", "offline_access"];
const REQUEST_TIMEOUT_MS = 10_000;

function assertString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`auth-config must include ${name}`);
  }
  return value.trim();
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function readAuthConfig() {
  const configUrl = new URL("/api/cli/auth-config", PETDEX_URL);
  const res = await fetchWithTimeout(configUrl);

  if (!res.ok) {
    throw new Error(`auth-config returned HTTP ${res.status}`);
  }

  const config = await res.json();
  const issuer = assertString(config.issuer, "issuer").replace(/\/+$/, "");
  const clientId = assertString(config.clientId, "clientId");
  const scopes = Array.isArray(config.scopes)
    ? config.scopes.filter(
        (scope) => typeof scope === "string" && scope.trim().length > 0,
      )
    : DEFAULT_SCOPES;

  new URL(issuer);

  return {
    issuer,
    clientId,
    scopes: scopes.length > 0 ? scopes : DEFAULT_SCOPES,
  };
}

function createCodeChallenge() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function createAuthorizeUrl(config) {
  const authorizeUrl = new URL(`${config.issuer}/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    "http://127.0.0.1:49152/callback",
  );
  authorizeUrl.searchParams.set("scope", config.scopes.join(" "));
  authorizeUrl.searchParams.set("state", "github-actions-smoke");
  authorizeUrl.searchParams.set("code_challenge", createCodeChallenge());
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  return authorizeUrl;
}

async function readUsefulResponseText(res) {
  const location = res.headers.get("location") ?? "";
  const contentType = res.headers.get("content-type") ?? "";
  const shouldReadBody =
    res.status >= 400 ||
    contentType.includes("application/json") ||
    contentType.includes("text/");
  const body = shouldReadBody ? await res.text() : "";
  return `${location}\n${body}`;
}

async function main() {
  const config = await readAuthConfig();
  // Stop before user sign-in. The failure this catches is Clerk rejecting the
  // public CLI OAuth client before the browser can show the login screen.
  const authorizeRes = await fetchWithTimeout(createAuthorizeUrl(config), {
    redirect: "manual",
  });
  const responseText = await readUsefulResponseText(authorizeRes);

  if (/invalid_client/i.test(responseText)) {
    throw new Error(
      "Clerk rejected the production CLI OAuth client with invalid_client",
    );
  }

  if (authorizeRes.status >= 500) {
    throw new Error(
      `OAuth authorize endpoint returned HTTP ${authorizeRes.status}`,
    );
  }

  if (authorizeRes.status >= 400 && /error/i.test(responseText)) {
    throw new Error(
      `OAuth authorize endpoint returned an error before sign-in: HTTP ${authorizeRes.status}`,
    );
  }

  console.log(
    `OAuth authorize smoke reached Clerk without invalid_client (HTTP ${authorizeRes.status}).`,
  );
}

await main();
