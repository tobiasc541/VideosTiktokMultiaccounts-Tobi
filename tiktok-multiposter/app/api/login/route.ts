import { NextResponse } from "next/server";
import { env } from "../../../lib/env";
import { setSession } from "../../../lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  if (password !== env("APP_PASSWORD")) {
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }
  await setSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
