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
  // Super Admin dashboard is Super Admin only.
  if (pathname.startsWith("/super-admin")) {
    return role === "super-admin";
  }

  // Team/User Management is Super Admin only.
  if (pathname.startsWith("/admin/team")) {
    return role === "super-admin";
  }

  // Normal admin area remains available to Admin + Super Admin.
  if (pathname.startsWith("/admin")) {
    return role === "admin" || role === "super-admin";
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const verifyUrl = new URL(
    "/api/auth/verify",
    request.url
  );

  try {
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