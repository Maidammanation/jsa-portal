import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an authenticated admin.
    const sessionCookie =
      request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    const callerDoc = await adminDb()
      .doc(`users/${decoded.uid}`)
      .get();

    const callerRole = callerDoc.data()?.role;

    if (
      callerRole !== "admin" &&
      callerRole !== "super-admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only admins can create login accounts.",
        },
        { status: 403 }
      );
    }

    // 2. Read request body.
    const {
      email,
      password,
      name,
      role,
      linkCollection,
      linkId,
    } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        {
          error:
            "Missing required fields.",
        },
        { status: 400 }
      );
    }

    if (
      ![
        "teacher",
        "student",
        "parent",
        "super-admin",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid role for this action.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail =
      String(email).trim().toLowerCase();

    /*
     * 3. If this is a linked teacher account,
     * read the teacher record BEFORE creating
     * the Auth account.
     *
     * This lets us copy the teacher's permissions
     * into the users profile so Firestore Rules
     * can enforce them later.
     */
    let linkedRecordData:
      | Record<string, unknown>
      | null = null;

    if (
      linkCollection &&
      linkId
    ) {
      const linkedDoc = await adminDb()
        .doc(
          `${linkCollection}/${linkId}`
        )
        .get();

      if (linkedDoc.exists) {
        linkedRecordData =
          linkedDoc.data() || null;
      }
    }

    // 4. Create the Firebase Auth account.
    const userRecord =
      await adminAuth().createUser({
        email: normalizedEmail,
        password,
        displayName: name,
      });

    /*
     * 5. Build the user profile.
     *
     * For teachers, mirror the permission fields
     * from the teacher record.
     *
     * These fields are intentionally kept in
     * users/{uid} because Firestore Rules can
     * securely read the current user's document.
     */
    const userProfile: Record<
      string,
      unknown
    > = {
      uid: userRecord.uid,
      name,
      email: normalizedEmail,
      role,
      status: "active",
      mustChangePassword: true,
    };

    if (
      role === "teacher" &&
      linkedRecordData
    ) {
      userProfile.classIds =
        Array.isArray(
          linkedRecordData.classIds
        )
          ? linkedRecordData.classIds
          : [];

      userProfile.subjectIds =
        Array.isArray(
          linkedRecordData.subjectIds
        )
          ? linkedRecordData.subjectIds
          : [];

      userProfile.formClassId =
        typeof linkedRecordData.formClassId ===
        "string"
          ? linkedRecordData.formClassId
          : null;

      userProfile.formMasterClassId =
        typeof linkedRecordData.formMasterClassId ===
        "string"
          ? linkedRecordData.formMasterClassId
          : "";

      userProfile.formMasterClassName =
        typeof linkedRecordData.formMasterClassName ===
        "string"
          ? linkedRecordData.formMasterClassName
          : "";

      userProfile.canUploadAllResults =
        Boolean(
          linkedRecordData.canUploadAllResults
        );
    }

    // 6. Create the Firestore user profile.
    await adminDb()
      .doc(`users/${userRecord.uid}`)
      .set(userProfile);

    /*
     * 7. Link the Auth account back to the
     * teacher/student/parent record.
     */
    if (
      linkCollection &&
      linkId
    ) {
      await adminDb()
        .doc(
          `${linkCollection}/${linkId}`
        )
        .update({
          authUid: userRecord.uid,
        });
    }

    // 8. Audit trail.
    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "Login account created",
        actor:
          callerDoc.data()?.name ||
          callerDoc.data()?.email ||
          "admin",
        details: `${role} — ${normalizedEmail}`,
        createdAt: new Date(),
      });

    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not create account.";

    const isDuplicate =
      message.includes("already exists") ||
      message.includes("EMAIL_EXISTS");

    return NextResponse.json(
      {
        error: isDuplicate
          ? "An account with this email already exists."
          : message,
      },
      {
        status: isDuplicate
          ? 409
          : 500,
      }
    );
  }
}