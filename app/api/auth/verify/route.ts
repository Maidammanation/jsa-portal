import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

/**
 * Verifies the jsa_session cookie. Called by middleware.ts (edge runtime,
 * where firebase-admin can't run directly) via a same-origin fetch that
 * forwards the incoming Cookie header.
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ authenticated: true, uid: decoded.uid });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
