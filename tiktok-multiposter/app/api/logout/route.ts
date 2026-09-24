import { NextResponse } from "next/server";
import { clearSession } from "../../../lib/auth";

export async function POST(req: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(req: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
