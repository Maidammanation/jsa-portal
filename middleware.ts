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

/**
 * Determines whether a user role is allowed to access
 * the requested protected section.
 */
function isAllowed(
  role: UserRole,
  pathname: string
): boolean {
  // Super Admin has access to its own dashboard AND
  // the existing /admin management section.
  if (pathname.startsWith("/super-admin")) {
    return role === "super-admin";
  }

  if (pathname.startsWith("/admin")) {
    return (
      role === "admin" ||
      role === "super-admin"
    );
  }

  if (pathname.startsWith("/teacher")) {
    return role === "teacher";
  }

  if (pathname.startsWith("/student")) {
    return role === "student";
  }

  if (pathname.startsWith("/parent")) {
    return role === "parent";
  }

  return false;
}

export async function middleware(
  request: NextRequest
) {
  const pathname = request.nextUrl.pathname;

  const verifyUrl = new URL(
    "/api/auth/verify",
    request.url
  );

  try {
    // Ask the server-side verification route to validate
    // the Firebase session and return the Firestore role.
    const verifyResponse = await fetch(
      verifyUrl,
      {
        method: "GET",
        headers: {
          cookie:
            request.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    // No valid session.
    if (!verifyResponse.ok) {
      const loginUrl = new URL(
        "/login",
        request.url
      );

      loginUrl.searchParams.set(
        "redirect",
        pathname
      );

      return NextResponse.redirect(loginUrl);
    }

    const data = await verifyResponse.json();

    if (
      !data?.authenticated ||
      !data?.role
    ) {
      const loginUrl = new URL(
        "/login",
        request.url
      );

      loginUrl.searchParams.set(
        "redirect",
        pathname
      );

      return NextResponse.redirect(loginUrl);
    }

    const role = data.role as UserRole;

    // SERVER-SIDE authorization.
    //
    // This is the important security improvement:
    // the user cannot bypass this by typing another
    // dashboard URL into the browser.
    if (!isAllowed(role, pathname)) {
      return NextResponse.redirect(
        new URL(
          ROLE_HOME[role],
          request.url
        )
      );
    }

    return NextResponse.next();
  } catch {
    // If verification itself fails, fail closed.
    const loginUrl = new URL(
      "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
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