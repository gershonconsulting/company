// Session auth for company.gershonCRM.com
//
// Deliberately dependency-free: everything below runs on the Cloudflare
// Workers / Next.js edge runtime using Web Crypto only. No next-auth, no
// Prisma, no bcrypt — this platform has a single operator account, so a
// signed cookie is the whole story.
//
// The session cookie is `<base64url(payload)>.<base64url(hmac-sha256)>`.
// The payload carries the subject and an expiry; the signature is what
// makes it unforgeable. Middleware verifies the signature on every
// request — no KV read, no database round-trip.
//
// ── Configuration ─────────────────────────────────────────────────────────
// All three values below can be overridden as Cloudflare Pages environment
// variables (Settings → Environment variables, for BOTH Production and
// Preview) without touching this file:
//
//   AUTH_EMAIL          login identifier
//   AUTH_PASSWORD_HASH  lowercase hex SHA-256 of the password
//   AUTH_SECRET         random string used to sign session cookies
//                       (changing it invalidates every existing session)
//
// To rotate the password without a deploy: set AUTH_PASSWORD_HASH in
// Cloudflare to the output of
//   node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD').digest('hex'))"

export const SESSION_COOKIE = "gc_company_session";

/** Session lifetime, in seconds. 7 days. */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/** Fallbacks used when the Cloudflare env vars are not set. */
const DEFAULT_EMAIL = "admin@gershonconsulting";
const DEFAULT_PASSWORD_HASH =
  "08a8efbf4b670e4792692a590ef3096e0365b793d9c13cb6f24fcea9c41200f5";
const DEFAULT_SECRET =
  "18d25e67ae4262bbccbe07cd9f7383104afe177762f2bc39509464504a7bee78";

/**
 * Read a runtime env var. @cloudflare/next-on-pages mirrors Pages
 * environment variables onto process.env inside the worker, so this works
 * in middleware and in edge route handlers alike.
 */
function envVar(name: string): string {
  try {
    const v = process.env?.[name];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function authSecret(): string {
  return envVar("AUTH_SECRET") || DEFAULT_SECRET;
}

function expectedEmails(): string[] {
  const configured = envVar("AUTH_EMAIL") || DEFAULT_EMAIL;
  const set = new Set<string>();
  for (const raw of configured.split(",")) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    set.add(e);
    // Convenience: accept the `.com` variant of a bare-domain identifier,
    // so `admin@gershonconsulting` and `admin@gershonconsulting.com` both
    // work. Same password either way — this widens nothing.
    if (!e.split("@")[1]?.includes(".")) set.add(`${e}.com`);
  }
  return [...set];
}

function expectedPasswordHash(): string {
  return (envVar("AUTH_PASSWORD_HASH") || DEFAULT_PASSWORD_HASH).toLowerCase();
}

// ── Primitives ────────────────────────────────────────────────────────────

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent, value-comparing constant-time equality. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return toHex(digest);
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signPayload(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload)
  );
  return b64urlEncode(new Uint8Array(sig));
}

// ── Public API ────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub: string; // who logged in
  iat: number; // issued at (seconds)
  exp: number; // expires at (seconds)
}

/** Verify a submitted email + password against the configured credentials. */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ ok: boolean; sub: string }> {
  const submitted = (email ?? "").trim().toLowerCase();
  const emailOk = expectedEmails().some((e) => timingSafeEqual(e, submitted));

  // Always hash, even on an email miss, so failures cost the same time.
  const hash = await sha256Hex(password ?? "");
  const passwordOk = timingSafeEqual(expectedPasswordHash(), hash);

  return { ok: emailOk && passwordOk, sub: submitted };
}

/** Mint a signed session token for `sub`. */
export async function createSessionToken(sub: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };
  const encoded = b64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return `${encoded}.${await signPayload(encoded)}`;
}

/**
 * Validate a session token. Returns the payload when the signature checks
 * out and the token has not expired; null otherwise.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let expected: string;
  try {
    expected = await signPayload(encoded);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, signature)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(encoded))
    ) as SessionPayload;
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** `Set-Cookie` value that installs a session. */
export function sessionCookie(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join("; ");
}

/** `Set-Cookie` value that clears the session. */
export function clearedSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}
