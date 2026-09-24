import crypto from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "mp_session";
const USER_PREFIX = "u";
const ADMIN_PREFIX = "a";
const SESSION_DOMAIN = process.env.NODE_ENV==="production" ? ".vyralvideos.com" : undefined;
const CUSTOMER_MAX_AGE=60*60*24*7;
const ADMIN_MAX_AGE=60*60*12;
const cookieOptions = (maxAge=CUSTOMER_MAX_AGE) => ({ httpOnly:true, sameSite:"lax" as const, secure:process.env.NODE_ENV==="production", path:"/", maxAge, ...(SESSION_DOMAIN?{domain:SESSION_DOMAIN}:{}) });

export type CustomerSession = {
  userId: string;
  email: string;
  plan?: string;
  iat: number;
};

type AdminSession = {
  email: string;
  role: "admin";
  iat: number;
};

function legacySessionValue() {
  return crypto.createHmac("sha256", env("APP_PASSWORD")).update("tiktok-multiposter-session-v1").digest("hex");
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", env("APP_PASSWORD")).update(payload).digest("hex");
}

function encodeSession(prefix: string, data: unknown) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${prefix}.${payload}.${signPayload(payload)}`;
}

function decodeSigned<T>(value: string, prefix: string): T | null {
  const [actualPrefix, payload, signature] = value.split(".");
  if (actualPrefix !== prefix || !payload || !signature) return null;
  const expected = signPayload(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T; } catch { return null; }
}

function decodeCustomerSession(value: string): CustomerSession | null {
  const parsed = decodeSigned<CustomerSession>(value, USER_PREFIX);
  if (!parsed?.userId || !parsed.email || !parsed.iat || Date.now()-parsed.iat>CUSTOMER_MAX_AGE*1000) return null;
  return parsed;
}

function decodeAdminSession(value: string): AdminSession | null {
  const parsed = decodeSigned<AdminSession>(value, ADMIN_PREFIX);
  if (!parsed?.email || parsed.role !== "admin" || !parsed.iat || Date.now()-parsed.iat>ADMIN_MAX_AGE*1000) return null;
  return parsed;
}

export async function getCustomerSession() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  return actual ? decodeCustomerSession(actual) : null;
}

export async function getAdminSession() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  return actual ? decodeAdminSession(actual) : null;
}

export async function isAdmin() { return Boolean(await getAdminSession()); }

export async function isLoggedIn() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  if (!actual) return false;
  if (decodeCustomerSession(actual) || decodeAdminSession(actual)) return true;
  const expected = legacySessionValue();
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function setSession() {
  const store = await cookies();
  store.set(COOKIE, legacySessionValue(), cookieOptions());
}

export async function setCustomerSession(userId: string, email: string, plan?: string) {
  const store = await cookies();
  store.set(COOKIE, encodeSession(USER_PREFIX, { userId, email, plan, iat: Date.now() }), cookieOptions());
}

export async function setAdminSession(email: string) {
  const store = await cookies();
  store.set(COOKIE, encodeSession(ADMIN_PREFIX, { email, role:"admin", iat:Date.now() }), cookieOptions(ADMIN_MAX_AGE));
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
