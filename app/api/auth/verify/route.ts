import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

/*
 * Firebase Admin must run in the
 * Node.js runtime on Vercel.
 */
export const runtime = "nodejs";

const SESSION_COOKIE_NAME =
  "jsa_session";

type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

/**
 * Verifies the server session cookie
 * AND loads the user's authoritative
 * Firestore role/status.
 *
 * This route is called by middleware.ts.
 */
export async function GET(
  request: NextRequest
) {
  const sessionCookie =
    request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "No active session.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    /*
     * Verify Firebase server session.
     *
     * checkRevoked = true means revoked
     * sessions are also rejected.
     */
    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    const uid = decoded.uid;

    /*
     * Load the authoritative user
     * profile from Firestore.
     */
    const userDoc =
      await adminDb()
        .doc(`users/${uid}`)
        .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            "User profile not found.",
        },
        {
          status: 403,
        }
      );
    }

    const userData =
      userDoc.data();

    const role =
      userData?.role as
        | UserRole
        | undefined;

    const status =
      userData?.status;

    /*
     * Reject accounts with an
     * invalid or missing role.
     */
    if (
      !role ||
      ![
        "super-admin",
        "admin",
        "teacher",
        "student",
        "parent",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            "Invalid user role.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Only active accounts can enter
     * protected areas.
     */
    if (status !== "active") {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            "Account is not active.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json({
      authenticated: true,
      uid,
      role,
      status,
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        error:
          "Invalid or expired session.",
      },
      {
        status: 401,
      }
    );
  }
}