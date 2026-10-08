import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

/*
 * Firebase Admin uses the Node.js runtime.
 */
export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type SchoolIdentity = {
  schoolName: string;
  shortName: string;
  motto: string;

  mainCampusName: string;
  mainCampusAddress: string;

  annexName: string;
  annexAddress: string;

  phone1: string;
  phone2: string;

  email: string;
  website: string;
};

type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

/* -------------------------------------------------------------------------- */
/* Default School Identity                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_IDENTITY: SchoolIdentity = {
  schoolName: "Jidda Standard Academy",
  shortName: "JSA",
  motto: "Knowledge is Light",

  mainCampusName: "Main Campus — Zaria",
  mainCampusAddress:
    "No. 5 Hayin Dogo, Anguwan Rafi Danmagaji, Zaria",

  annexName: "Annex — Gaskiya Road",
  annexAddress:
    "No. 5 Aminu Mai Kai Close, Behind Baba Kaduna's Garage, Gaskiya Road, Zaria",

  phone1: "08121414008",
  phone2: "08069121401",

  email: "",
  website: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Verify the current server session and make sure
 * the authenticated user is an active administrator.
 *
 * The role is always read from the authoritative
 * Firestore users/{uid} document.
 */
async function verifyAdmin(
  request: NextRequest
) {
  const sessionCookie =
    request.cookies.get("jsa_session")?.value;

  if (!sessionCookie) {
    throw new Error("UNAUTHENTICATED");
  }

  const decoded =
    await adminAuth().verifySessionCookie(
      sessionCookie,
      true
    );

  const userSnap =
    await adminDb()
      .collection("users")
      .doc(decoded.uid)
      .get();

  if (!userSnap.exists) {
    throw new Error("UNAUTHORIZED");
  }

  const profile =
    userSnap.data() as {
      role?: UserRole;
      status?: string;
    };

  const isAdmin =
    profile.role === "admin" ||
    profile.role === "super-admin";

  if (
    profile.status !== "active" ||
    !isAdmin
  ) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    uid: decoded.uid,
    role: profile.role,
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Returns the school's editable identity/contact settings.
 *
 * GET /api/admin/school-settings
 */
export async function GET(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const snapshot =
      await adminDb()
        .collection("schoolSettings")
        .doc("current")
        .get();

    const data = snapshot.exists
      ? snapshot.data() || {}
      : {};

    const storedIdentity =
      data.identity &&
      typeof data.identity === "object"
        ? data.identity
        : {};

    const identity: SchoolIdentity = {
      ...DEFAULT_IDENTITY,
      ...(storedIdentity as Partial<SchoolIdentity>),
    };

    return NextResponse.json({
      success: true,
      settings: identity,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized";

    if (
      message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to access school settings.",
        },
        {
          status: 403,
        }
      );
    }

    console.error(
      "GET school settings error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Could not load school settings.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Updates the school's editable identity/contact settings.
 *
 * PATCH /api/admin/school-settings
 */
export async function PATCH(
  request: NextRequest
) {
  try {
    const admin =
      await verifyAdmin(request);

    const body =
      await request.json();

    const incoming =
      body?.identity;

    if (
      !incoming ||
      typeof incoming !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "School identity information is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Clean and normalize submitted values                                   */
    /* ---------------------------------------------------------------------- */

    const identity: SchoolIdentity = {
      schoolName: cleanString(
        incoming.schoolName
      ),

      shortName: cleanString(
        incoming.shortName
      ),

      motto: cleanString(
        incoming.motto
      ),

      mainCampusName: cleanString(
        incoming.mainCampusName
      ),

      mainCampusAddress: cleanString(
        incoming.mainCampusAddress
      ),

      annexName: cleanString(
        incoming.annexName
      ),

      annexAddress: cleanString(
        incoming.annexAddress
      ),

      phone1: cleanString(
        incoming.phone1
      ),

      phone2: cleanString(
        incoming.phone2
      ),

      email: cleanString(
        incoming.email
      ),

      website: cleanString(
        incoming.website
      ),
    };

    /* ---------------------------------------------------------------------- */
    /* Required fields                                                        */
    /* ---------------------------------------------------------------------- */

    if (!identity.schoolName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "School name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!identity.shortName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "School short name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!identity.motto) {
      return NextResponse.json(
        {
          success: false,
          error:
            "School motto is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Basic email validation                                                 */
    /* ---------------------------------------------------------------------- */

    if (identity.email) {
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          identity.email
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please enter a valid school email address.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Basic website validation                                               */
    /* ---------------------------------------------------------------------- */

    if (identity.website) {
      const websitePattern =
        /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i;

      if (
        !websitePattern.test(
          identity.website
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please enter a valid website address.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Preserve existing schoolSettings fields                                */
    /* ---------------------------------------------------------------------- */

    const ref =
      adminDb()
        .collection("schoolSettings")
        .doc("current");

    const snapshot =
      await ref.get();

    const existing =
      snapshot.exists
        ? snapshot.data() || {}
        : {};

    /* ---------------------------------------------------------------------- */
    /* Save identity                                                           */
    /* ---------------------------------------------------------------------- */

    await ref.set(
      {
        ...existing,

        identity,

        updatedAt: new Date(),
        updatedBy: admin.uid,
      },
      {
        merge: true,
      }
    );

    /* ---------------------------------------------------------------------- */
    /* Activity log                                                            */
    /* ---------------------------------------------------------------------- */

    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "School identity updated",

        actor:
          admin.uid,

        details:
          `${identity.schoolName} — ${identity.shortName}`,

        createdAt:
          new Date(),
      });

    /* ---------------------------------------------------------------------- */
    /* Response                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      success: true,
      settings: identity,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update school settings.";

    if (
      message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only active administrators can change school settings.",
        },
        {
          status: 403,
        }
      );
    }

    console.error(
      "PATCH school settings error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Could not save school settings.",
      },
      {
        status: 500,
      }
    );
  }
}