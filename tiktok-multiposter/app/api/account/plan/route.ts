import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";

// Plan changes are intentionally disabled for customer sessions.
// Plans must be assigned through the authenticated admin flow (or a future
// verified billing provider) so a customer cannot self-upgrade for free.
export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);

  return NextResponse.redirect(new URL("/planes?error=upgrade_required", req.url), 303);
}
