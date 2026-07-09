import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";
const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days (Firebase session cookies cap at 14 days)

/** Exchanges a client Firebase ID token for an httpOnly server session cookie. */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verifying first gives a clearer 401 (vs. a generic error) for expired/invalid tokens.
    await adminAuth().verifyIdToken(idToken);

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create session." },
      { status: 401 }
    );
  }
}

/** Clears the session cookie (call this alongside client-side signOut()). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
