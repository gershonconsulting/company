// Session auth for company.gershonCRM.com
//
// Dependency-free, edge-runtime only (Web Crypto + the SETTINGS KV namespace).
//
// ── Accounts ──────────────────────────────────────────────────────────────
// Team accounts live in KV under `auth:users`:
//   { "<email>": { name, role: "admin" | "agent", salt, hash, iter, sv, … } }
// Passwords are PBKDF2-SHA256 with a per-user random salt. `sv` (session
// version) is bumped on password change / reset so old sessions die at once.
// Admins manage the team from Settings → Team access.
//
// ── Sessions ──────────────────────────────────────────────────────────────
// Cookie = `<base64url(payload)>.<base64url(hmac-sha256)>`, signed with a
// random 32-byte secret generated on first use and kept in KV
// (`auth:secret`). AUTH_SECRET as a Cloudflare env var overrides it.
// Every request re-checks that the user still exists and that `sv` matches,
// so removing a user or resetting a password signs them out immediately.
//
// ── Bootstrap ─────────────────────────────────────────────────────────────
// While no account exists, /api/auth/setup accepts a one-time setup code
// (only its SHA-256 lives here) to create the first admin. Once an account
// exists the endpoint refuses. There is NO built-in fallback password.

import { getRequestContext } from "@cloudflare/next-on-pages";

export const SESSION_COOKIE  = "gc_company_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;   // 7 days

/** sha256 of the one-time bootstrap code (used only while no account exists). */
export const SETUP_CODE_SHA256 = "11639425448cbc3a027be5fbee9d9001792a19a1f3fbcfe7ccb36bf480443867";

const PBKDF2_ITER   = 10_000;
const MAX_FAILS     = 8;          // per email, per window
const FAIL_WINDOW_S = 15 * 60;

export type Role = "admin" | "agent";

export interface UserRecord {
  name:      string;
  role:      Role;
  salt:      string;   // hex
  hash:      string;   // hex
  iter:      number;
  sv:        number;   // session version
  createdAt: string;
  updatedAt: string;
}
export type UserMap = Record<string, UserRecord>;

export interface PublicUser { email: string; name: string; role: Role; createdAt: string; updatedAt: string; }

export interface SessionPayload {
  sub:  string;   // email
  role: Role;
  sv:   number;
  iat:  number;
  exp:  number;
}

// ── KV ────────────────────────────────────────────────────────────────────
interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

function kv(): KV {
  const env = getRequestContext().env as unknown as { SETTINGS?: KV };
  if (!env?.SETTINGS) throw new Error("SETTINGS KV binding not available.");
  return env.SETTINGS;
}

function envVar(name: string): string {
  try {
    const v = process.env?.[name];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
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
function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf as ArrayBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function randomHex(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return toHex(b);
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}
async function pbkdf2(password: string, saltHex: string, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex) as BufferSource, iterations: iter }, key, 256);
  return toHex(bits);
}

// ── Secret ────────────────────────────────────────────────────────────────
// No in-memory cache: each isolate would keep a stale copy after rotation.
async function authSecret(): Promise<string> {
  const fromEnv = envVar("AUTH_SECRET");
  if (fromEnv) return fromEnv;
  const store = kv();
  let s = await store.get("auth:secret");
  if (!s) {
    s = randomHex(32);
    await store.put("auth:secret", s);
  }
  return s;
}
/** Rotate the signing secret — signs EVERYONE out. */
export async function rotateSecret(): Promise<void> {
  const s = randomHex(32);
  await kv().put("auth:secret", s);
}
async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await authSecret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64urlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

// ── Users ─────────────────────────────────────────────────────────────────
export function normEmail(e: string): string { return (e ?? "").trim().toLowerCase(); }

export async function getUsers(): Promise<UserMap> {
  const raw = await kv().get("auth:users");
  if (!raw) return {};
  try { return JSON.parse(raw) as UserMap; } catch { return {}; }
}
async function saveUsers(u: UserMap): Promise<void> {
  await kv().put("auth:users", JSON.stringify(u));
}
export function publicUsers(u: UserMap): PublicUser[] {
  return Object.entries(u)
    .map(([email, r]) => ({ email, name: r.name, role: r.role, createdAt: r.createdAt, updatedAt: r.updatedAt }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function passwordProblem(pw: string): string | null {
  if (!pw || pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must mix letters and numbers.";
  return null;
}

export async function upsertUser(email: string, name: string, role: Role, password: string | null): Promise<void> {
  const users = await getUsers();
  const key = normEmail(email);
  const now = new Date().toISOString();
  const prev = users[key];
  let salt = prev?.salt ?? "", hash = prev?.hash ?? "", iter = prev?.iter ?? PBKDF2_ITER, sv = prev?.sv ?? 1;
  if (password !== null) {
    salt = randomHex(16);
    iter = PBKDF2_ITER;
    hash = await pbkdf2(password, salt, iter);
    sv = (prev?.sv ?? 0) + 1;   // new password → old sessions die
  }
  if (!hash) throw new Error("A password is required for a new account.");
  users[key] = { name: name || prev?.name || key, role, salt, hash, iter, sv, createdAt: prev?.createdAt ?? now, updatedAt: now };
  await saveUsers(users);
}

export async function deleteUser(email: string): Promise<void> {
  const users = await getUsers();
  delete users[normEmail(email)];
  await saveUsers(users);
}

// ── Login ─────────────────────────────────────────────────────────────────
export type LoginResult =
  | { ok: true; sub: string; role: Role; sv: number }
  | { ok: false; reason: "invalid" | "locked" | "no-accounts" };

export async function verifyCredentials(email: string, password: string): Promise<LoginResult> {
  const sub   = normEmail(email);
  const store = kv();
  const failKey = `auth:fail:${await sha256Hex(sub)}`;
  const fails = Number(await store.get(failKey) ?? "0");
  if (fails >= MAX_FAILS) return { ok: false, reason: "locked" };

  const users = await getUsers();
  const u = users[sub];
  // Always run PBKDF2 so a miss costs the same time as a hit.
  const computed = await pbkdf2(password ?? "", u?.salt ?? "00".repeat(16), u?.iter ?? PBKDF2_ITER);

  if (Object.keys(users).length === 0) return { ok: false, reason: "no-accounts" };
  if (u && timingSafeEqual(computed, u.hash)) {
    if (fails) await store.delete(failKey);
    return { ok: true, sub, role: u.role, sv: u.sv };
  }
  await store.put(failKey, String(fails + 1), { expirationTtl: FAIL_WINDOW_S });
  return { ok: false, reason: "invalid" };
}

// ── Sessions ──────────────────────────────────────────────────────────────
export async function createSessionToken(sub: string, role: Role, sv: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub, role, sv, iat: now, exp: now + SESSION_MAX_AGE };
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded)}`;
}

/** Valid signature, not expired, user still exists, session version matches. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  try {
    if (!timingSafeEqual(await sign(encoded), signature)) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded))) as SessionPayload;
    if (!p?.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
    const u = (await getUsers())[p.sub];
    if (!u || u.sv !== p.sv) return null;
    return { ...p, role: u.role };   // role always from the live record
  } catch (e) {
    console.log("[auth] verify failed:", String(e));
    return null;
  }
}

/** Read + verify the session from a request's cookie header. */
export async function sessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return verifySessionToken(m ? decodeURIComponent(m[1]) : null);
}

export function sessionCookie(token: string): string {
  return [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax", `Max-Age=${SESSION_MAX_AGE}`].join("; ");
}
export function clearedSessionCookie(): string {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax", "Max-Age=0"].join("; ");
}
