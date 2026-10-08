import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. Verify server session.
     */
    const sessionCookie =
      request.cookies.get(
        SESSION_COOKIE_NAME
      )?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    /*
     * 2. Get authoritative caller
     * profile from Firestore.
     */
    const callerDoc =
      await adminDb()
        .doc(
          `users/${decoded.uid}`
        )
        .get();

    if (!callerDoc.exists) {
      return NextResponse.json(
        {
          error:
            "Administrator profile not found.",
        },
        {
          status: 403,
        }
      );
    }

    const callerData =
      callerDoc.data();

    const callerRole =
      callerData?.role;

    const callerStatus =
      callerData?.status;

    /*
     * Only active Admin/Super Admin
     * accounts may create login accounts.
     */
    if (
      ![
        "admin",
        "super-admin",
      ].includes(callerRole) ||
      callerStatus !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an active administrator can create login accounts.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 3. Read request.
     */
    const {
      email,
      password,
      name,
      role,
      linkCollection,
      linkId,
    } = await request.json();

    if (
      !email ||
      !password ||
      !name ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 4. Allowed account types.
     */
    const allowedRoles = [
      "teacher",
      "student",
      "parent",
      "super-admin",
    ];

    if (
      !allowedRoles.includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid role for this action.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * CRITICAL SECURITY RULE:
     *
     * A normal Admin may create:
     * - Teacher
     * - Student
     * - Parent
     *
     * ONLY Super Admin may create:
     * - Super Admin
     */
    if (
      role === "super-admin" &&
      callerRole !== "super-admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only a Super Admin can create another Super Admin account.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 5. Password validation.
     */
    if (
      String(password).length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    /*
     * 6. If linked to a teacher,
     * student, or parent record,
     * read it before creating Auth.
     */
    let linkedRecordData:
      | Record<string, unknown>
      | null = null;

    if (
      linkCollection &&
      linkId
    ) {
      const linkedDoc =
        await adminDb()
          .doc(
            `${linkCollection}/${linkId}`
          )
          .get();

      if (linkedDoc.exists) {
        linkedRecordData =
          linkedDoc.data() ||
          null;
      }
    }

    /*
     * 7. Create Firebase Auth account.
     */
    const userRecord =
      await adminAuth().createUser({
        email:
          normalizedEmail,
        password:
          String(password),
        displayName:
          String(name).trim(),
      });

    /*
     * 8. Create user profile.
     */
    const userProfile:
      Record<string, unknown> = {
      uid: userRecord.uid,
      name:
        String(name).trim(),
      email:
        normalizedEmail,
      role,
      status:
        "active",
      mustChangePassword:
        true,
    };

    /*
     * 9. Teacher permissions.
     */
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

    /*
     * 10. Save Firestore profile.
     */
    await adminDb()
      .doc(
        `users/${userRecord.uid}`
      )
      .set(userProfile);

    /*
     * 11. Link Auth account back
     * to the original record.
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
          authUid:
            userRecord.uid,
        });
    }

    /*
     * 12. Activity log.
     */
    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "Login account created",
        actor:
          callerData?.name ||
          callerData?.email ||
          "administrator",
        details:
          `${role} — ${normalizedEmail}`,
        createdAt:
          new Date(),
      });

    return NextResponse.json({
      ok: true,
      uid:
        userRecord.uid,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not create account.";

    const isDuplicate =
      message.includes(
        "already exists"
      ) ||
      message.includes(
        "EMAIL_EXISTS"
      );

    return NextResponse.json(
      {
        error: isDuplicate
          ? "An account with this email already exists."
          : message,
      },
      {
        status:
          isDuplicate
            ? 409
            : 500,
      }
    );
  }
}