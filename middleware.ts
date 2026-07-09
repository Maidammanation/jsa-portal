import { NextResponse, type NextRequest } from "next/server";

// Edge middleware can't run the Firebase Admin SDK directly (it needs Node's
// crypto APIs), so it delegates verification to /api/auth/verify — a Node-runtime
// route — forwarding the incoming Cookie header. If that route says the session
// is invalid/missing, we redirect to /login.
//
// This only confirms the visitor is authenticated. Matching the visitor's role
// to the section they're viewing (e.g. blocking a teacher from /admin) is handled
// client-side in DashboardShell, since role lives in Firestore, not the session
// cookie's claims.

export async function middleware(request: NextRequest) {
  const verifyUrl = new URL("/api/auth/verify", request.url);

  const verifyResponse = await fetch(verifyUrl, {
    headers: { cookie: request.headers.get("cookie") || "" },
  });

  if (verifyResponse.ok) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*", "/super-admin/:path*"],
};
