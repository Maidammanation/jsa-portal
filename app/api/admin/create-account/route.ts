import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

type AllowedRole =
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "super-admin";

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
          error: "Not authenticated.",
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
     * 2. Get authoritative caller profile.
     */
    const callerDoc =
      await adminDb()
        .doc(`users/${decoded.uid}`)
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
     * Only active Admin/Super Admin accounts
     * may create login accounts.
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
     * 4. Validate role.
     */
    const allowedRoles: AllowedRole[] = [
      "admin",
      "teacher",
      "student",
      "parent",
      "super-admin",
    ];

    if (
      !allowedRoles.includes(
        role as AllowedRole
      )
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

    const requestedRole =
      role as AllowedRole;

    /*
     * 5. SECURITY RULES
     *
     * Normal Admin:
     * - Teacher
     * - Student
     * - Parent
     *
     * Super Admin:
     * - Administrator
     * - Super Admin
     * - Teacher
     * - Student
     * - Parent
     *
     * This prevents a normal Admin from
     * creating or escalating another
     * administrative account.
     */
    const isAdministrativeRole =
      requestedRole === "admin" ||
      requestedRole === "super-admin";

    if (
      isAdministrativeRole &&
      callerRole !== "super-admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only a Super Admin can create Administrator or Super Admin accounts.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 6. Password validation.
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
     * 7. If linked to a teacher,
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
     * 8. Create Firebase Auth account.
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
     * 9. Create Firestore user profile.
     */
    const userProfile:
      Record<string, unknown> = {
      uid: userRecord.uid,
      name:
        String(name).trim(),
      email:
        normalizedEmail,
      role: requestedRole,
      status:
        "active",
      mustChangePassword:
        true,
    };

    /*
     * 10. Teacher permissions.
     */
    if (
      requestedRole === "teacher" &&
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
     * 11. Save Firestore profile.
     */
    await adminDb()
      .doc(
        `users/${userRecord.uid}`
      )
      .set(userProfile);

    /*
     * 12. Link Auth account back
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
     * 13. Activity log.
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
          `${requestedRole} — ${normalizedEmail}`,
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