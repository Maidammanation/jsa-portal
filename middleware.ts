import { NextResponse, type NextRequest } from "next/server";

type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

const ROLE_HOME: Record<UserRole, string> = {
  "super-admin": "/super-admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

function isAllowed(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith("/super-admin")) return role === "super-admin";
  if (pathname.startsWith("/admin/team")) return role === "super-admin";
  if (pathname.startsWith("/admin")) return role === "admin" || role === "super-admin";
  if (pathname.startsWith("/teacher")) return role === "teacher";
  if (pathname.startsWith("/student")) return role === "student";
  if (pathname.startsWith("/parent")) return role === "parent";
  return false;
}

function loginRedirect(request: NextRequest, reason?: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  if (reason) loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const verifyUrl = new URL("/api/auth/verify", request.url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const verifyResponse = await fetch(verifyUrl, {
      method: "GET",
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!verifyResponse.ok) return loginRedirect(request);

    const data = await verifyResponse.json();
    if (!data?.authenticated || !data?.role) {
      return loginRedirect(request);
    }

    const role = data.role as UserRole;
    if (!ROLE_HOME[role] || !isAllowed(role, request.nextUrl.pathname)) {
      return ROLE_HOME[role]
        ? NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
        : loginRedirect(request);
    }

    return NextResponse.next();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return loginRedirect(request, "session-check-timeout");
    }
    return loginRedirect(request, "session-check-failed");
  } finally {
    clearTimeout(timeoutId);
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/super-admin/:path*",
  ],
};
