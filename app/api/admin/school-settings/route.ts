import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/services/firebaseAdmin";

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

type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

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

  if (
    profile.status !== "active" ||
    !profile.role ||
    !["admin", "super-admin"].includes(
      profile.role
    )
  ) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    uid: decoded.uid,
    role: profile.role,
  };
}

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

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

    const identity = {
      ...DEFAULT_IDENTITY,
      ...(data.identity || {}),
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
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          "You are not authorized to access school settings.",
      },
      { status: 403 }
    );
  }
}

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
          error:
            "School identity information is required.",
        },
        { status: 400 }
      );
    }

    const identity: SchoolIdentity = {
      schoolName:
        cleanString(
          incoming.schoolName
        ),

      shortName:
        cleanString(
          incoming.shortName
        ),

      motto:
        cleanString(
          incoming.motto
        ),

      mainCampusName:
        cleanString(
          incoming.mainCampusName
        ),

      mainCampusAddress:
        cleanString(
          incoming.mainCampusAddress
        ),

      annexName:
        cleanString(
          incoming.annexName
        ),

      annexAddress:
        cleanString(
          incoming.annexAddress
        ),

      phone1:
        cleanString(
          incoming.phone1
        ),

      phone2:
        cleanString(
          incoming.phone2
        ),

      email:
        cleanString(
          incoming.email
        ),

      website:
        cleanString(
          incoming.website
        ),
    };

    if (!identity.schoolName) {
      return NextResponse.json(
        {
          error:
            "School name is required.",
        },
        { status: 400 }
      );
    }

    if (!identity.shortName) {
      return NextResponse.json(
        {
          error:
            "School short name is required.",
        },
        { status: 400 }
      );
    }

    if (!identity.motto) {
      return NextResponse.json(
        {
          error:
            "School motto is required.",
        },
        { status: 400 }
      );
    }

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

    await ref.set(
      {
        ...existing,
        identity,
        updatedAt:
          new Date(),
      },
      {
        merge: true,
      }
    );

    const actor =
      cleanString(body?.actor) ||
      admin.uid;

    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "School identity updated",
        actor,
        details:
          `${identity.schoolName} — ${identity.shortName}`,
        createdAt:
          new Date(),
      });

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
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active administrators can change school settings.",
        },
        { status: 403 }
      );
    }

    console.error(
      "School settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not save school settings.",
      },
      { status: 500 }
    );
  }
}