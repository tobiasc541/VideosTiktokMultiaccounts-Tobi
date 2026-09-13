import crypto from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "mp_session";
const USER_PREFIX = "u";

type CustomerSession = {
  userId: string;
  email: string;
  plan?: string;
  iat: number;
};

function legacySessionValue() {
  return crypto
    .createHmac("sha256", env("APP_PASSWORD"))
    .update("tiktok-multiposter-session-v1")
    .digest("hex");
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", env("APP_PASSWORD")).update(payload).digest("hex");
}

function encodeCustomerSession(session: CustomerSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${USER_PREFIX}.${payload}.${signPayload(payload)}`;
}

function decodeCustomerSession(value: string): CustomerSession | null {
  const [prefix, payload, signature] = value.split(".");
  if (prefix !== USER_PREFIX || !payload || !signature) return null;
  const expected = signPayload(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CustomerSession;
    if (!parsed.userId || !parsed.email || !parsed.iat) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCustomerSession() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  if (!actual) return null;
  return decodeCustomerSession(actual);
}

export async function isLoggedIn() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  if (!actual) return false;

  const customer = decodeCustomerSession(actual);
  if (customer) return true;

  const expected = legacySessionValue();
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function setSession() {
  const store = await cookies();
  store.set(COOKIE, legacySessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function setCustomerSession(userId: string, email: string, plan?: string) {
  const store = await cookies();
  store.set(COOKIE, encodeCustomerSession({ userId, email, plan, iat: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
