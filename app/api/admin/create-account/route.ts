
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

type AllowedRole =
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "super-admin";

function getErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error
  ) {
    return String((error as { code: unknown }).code);
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify administrator session.
    const sessionCookie =
      request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decoded = await adminAuth().verifySessionCookie(
      sessionCookie,
      true
    );

    // 2. Verify administrator profile and status.
    const callerDoc = await adminDb()
      .doc(`users/${decoded.uid}`)
      .get();

    if (!callerDoc.exists) {
      return NextResponse.json(
        { error: "Administrator profile not found." },
        { status: 403 }
      );
    }

    const callerData = callerDoc.data();
    const callerRole = callerData?.role;

    if (
      !["admin", "super-admin"].includes(callerRole) ||
      callerData?.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an active administrator can create or restore login accounts.",
        },
        { status: 403 }
      );
    }

    // 3. Read request.
    const body = await request.json();

    const {
      email,
      password,
      name,
      role,
      linkCollection,
      linkId,
    } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const allowedRoles: AllowedRole[] = [
      "admin",
      "teacher",
      "student",
      "parent",
      "super-admin",
    ];

    if (!allowedRoles.includes(role as AllowedRole)) {
      return NextResponse.json(
        { error: "Invalid account role." },
        { status: 400 }
      );
    }

    const requestedRole = role as AllowedRole;
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPassword = String(password);

    if (!normalizedEmail || !cleanName) {
      return NextResponse.json(
        { error: "Email and name are required." },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // 4. Only Super Admin can create administrative accounts.
    if (
      ["admin", "super-admin"].includes(requestedRole) &&
      callerRole !== "super-admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only a Super Admin can create Administrator or Super Admin accounts.",
        },
        { status: 403 }
      );
    }

    // 5. Validate linked record.
    let linkedRecordData: Record<string, unknown> | null = null;

    if (requestedRole === "teacher") {
      if (
        linkCollection !== "teachers" ||
        typeof linkId !== "string" ||
        !linkId.trim()
      ) {
        return NextResponse.json(
          { error: "A valid teacher record is required." },
          { status: 400 }
        );
      }

      const teacherRef = adminDb().doc(`teachers/${linkId}`);
      const teacherDoc = await teacherRef.get();

      if (!teacherDoc.exists) {
        return NextResponse.json(
          { error: "Teacher record not found." },
          { status: 404 }
        );
      }

      linkedRecordData = teacherDoc.data() || {};

      const teacherEmail = String(
        linkedRecordData.email || ""
      ).trim().toLowerCase();

      if (teacherEmail !== normalizedEmail) {
        return NextResponse.json(
          {
            error:
              "The email address must match the email saved in this teacher's record.",
          },
          { status: 400 }
        );
      }

      // Do not overwrite an existing link to another account.
      const existingTeacherUid = linkedRecordData.authUid;

      if (
        typeof existingTeacherUid === "string" &&
        existingTeacherUid.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "This teacher already has a linked login account. Contact the system administrator.",
          },
          { status: 409 }
        );
      }
    }

    // 6. Prepare teacher permissions.
    const userProfile: Record<string, unknown> = {
      name: cleanName,
      email: normalizedEmail,
      role: requestedRole,
      status: "active",
      mustChangePassword: true,
    };

    if (requestedRole === "teacher" && linkedRecordData) {
      userProfile.classIds = Array.isArray(
        linkedRecordData.classIds
      )
        ? linkedRecordData.classIds
        : [];

      userProfile.subjectIds = Array.isArray(
        linkedRecordData.subjectIds
      )
        ? linkedRecordData.subjectIds
        : [];

      userProfile.formClassId =
        typeof linkedRecordData.formClassId === "string"
          ? linkedRecordData.formClassId
          : null;

      userProfile.formMasterClassId =
        typeof linkedRecordData.formMasterClassId === "string"
          ? linkedRecordData.formMasterClassId
          : "";

      userProfile.formMasterClassName =
        typeof linkedRecordData.formMasterClassName === "string"
          ? linkedRecordData.formMasterClassName
          : "";

      userProfile.canUploadAllResults = Boolean(
        linkedRecordData.canUploadAllResults
      );
    }

    // 7. Find or create the Firebase Authentication account.
    let userRecord;
    let restoredExistingAccount = false;

    try {
      userRecord = await adminAuth().createUser({
        email: normalizedEmail,
        password: cleanPassword,
        displayName: cleanName,
        disabled: false,
      });
    } catch (error) {
      const errorCode = getErrorCode(error);

      if (
        errorCode !== "auth/email-already-exists" &&
        errorCode !== "auth/uid-already-exists"
      ) {
        throw error;
      }

      // Existing account restoration is permitted only for
      // a verified teacher record.
      if (
        requestedRole !== "teacher" ||
        !linkId ||
        !linkedRecordData
      ) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. It cannot be reused for this account type.",
          },
          { status: 409 }
        );
      }

      userRecord = await adminAuth().getUserByEmail(
        normalizedEmail
      );

      // Check whether this UID is already linked to another teacher.
      const linkedTeachers = await adminDb()
        .collection("teachers")
        .where("authUid", "==", userRecord.uid)
        .limit(2)
        .get();

      const belongsToAnotherTeacher = linkedTeachers.docs.some(
        (doc) => doc.id !== linkId
      );

      if (belongsToAnotherTeacher) {
        return NextResponse.json(
          {
            error:
              "This login account is already linked to another teacher.",
          },
          { status: 409 }
        );
      }

      // Do not take over an account belonging to another role.
      const existingProfile = await adminDb()
        .doc(`users/${userRecord.uid}`)
        .get();

      if (existingProfile.exists) {
        const existingRole = existingProfile.data()?.role;

        if (existingRole !== "teacher") {
          return NextResponse.json(
            {
              error:
                "This email belongs to an existing non-teacher account. Account restoration was blocked.",
            },
            { status: 409 }
          );
        }
      }

      // Restore the existing Auth account and set a temporary password.
      userRecord = await adminAuth().updateUser(
        userRecord.uid,
        {
          email: normalizedEmail,
          password: cleanPassword,
          displayName: cleanName,
          disabled: false,
        }
      );

      restoredExistingAccount = true;
    }

    // 8. Save or restore the user's Firestore profile.
    userProfile.uid = userRecord.uid;

    await adminDb()
      .doc(`users/${userRecord.uid}`)
      .set(userProfile, { merge: true });

    // 9. Link the account to its teacher record.
    if (requestedRole === "teacher" && linkId) {
      await adminDb()
        .doc(`teachers/${linkId}`)
        .update({
          authUid: userRecord.uid,
        });
    } else if (linkCollection && linkId) {
      const allowedCollections = [
        "students",
        "parents",
      ];

      if (!allowedCollections.includes(linkCollection)) {
        return NextResponse.json(
          { error: "Invalid linked collection." },
          { status: 400 }
        );
      }

      await adminDb()
        .doc(`${linkCollection}/${linkId}`)
        .update({
          authUid: userRecord.uid,
        });
    }

    // 10. Record activity.
    await adminDb()
      .collection("activityLog")
      .add({
        action: restoredExistingAccount
          ? "Teacher login account restored"
          : "Login account created",
        actor:
          callerData?.name ||
          callerData?.email ||
          "administrator",
        details: `${requestedRole} — ${normalizedEmail}`,
        createdAt: new Date(),
      });

    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      restored: restoredExistingAccount,
      message: restoredExistingAccount
        ? "Existing teacher login restored successfully."
        : "Login account created successfully.",
    });
  } catch (error) {
    console.error("Create/restore account error:", error);

    const code = getErrorCode(error);

    if (code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "The existing login account could not be found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create or restore the login account.",
      },
      { status: 500 }
    );
  }
}
