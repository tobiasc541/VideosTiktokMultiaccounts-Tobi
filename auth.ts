import crypto from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "mp_session";

function sessionValue() {
  return crypto
    .createHmac("sha256", env("APP_PASSWORD"))
    .update("tiktok-multiposter-session-v1")
    .digest("hex");
}

export async function isLoggedIn() {
  const store = await cookies();
  const actual = store.get(COOKIE)?.value;
  if (!actual) return false;
  const expected = sessionValue();
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function setSession() {
  const store = await cookies();
  store.set(COOKIE, sessionValue(), {
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
