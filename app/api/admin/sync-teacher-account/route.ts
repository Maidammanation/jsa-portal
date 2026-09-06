import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

export async function POST(request: NextRequest) {
  try {
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
            "Only admins can synchronize teacher accounts.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      teacherId,
      authUid,
      firstName,
      lastName,
      email,
      classIds,
      subjectIds,
      formClassId,
      formMasterClassId,
      formMasterClassName,
      canUploadAllResults,
      status,
    } = body;

    if (!teacherId || !authUid) {
      return NextResponse.json(
        {
          error:
            "Teacher ID and authentication UID are required.",
        },
        { status: 400 }
      );
    }

    const teacherRef = adminDb().doc(
      `teachers/${teacherId}`
    );

    const teacherDoc = await teacherRef.get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher record was not found." },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data() || {};

    /*
     * Security check:
     * The supplied authUid must belong to this teacher.
     */
    if (
      teacherData.authUid &&
      teacherData.authUid !== authUid
    ) {
      return NextResponse.json(
        {
          error:
            "The authentication account does not belong to this teacher.",
        },
        { status: 403 }
      );
    }

    /*
     * Make sure the Firebase Auth account actually exists.
     */
    try {
      await adminAuth().getUser(authUid);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "";

      if (
        message.includes("user-not-found") ||
        message.includes("User not found")
      ) {
        return NextResponse.json(
          {
            error:
              "The teacher's login account could not be found.",
          },
          { status: 404 }
        );
      }

      throw err;
    }

    const normalizedClassIds = Array.isArray(classIds)
      ? classIds.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim() !== ""
        )
      : [];

    const normalizedSubjectIds = Array.isArray(subjectIds)
      ? subjectIds.filter(
          (value: unknown): value is string =>
            typeof value === "string" && value.trim() !== ""
        )
      : [];

    const normalizedFormClassId =
      typeof formClassId === "string"
        ? formClassId
        : "";

    const normalizedFormMasterClassId =
      typeof formMasterClassId === "string"
        ? formMasterClassId
        : "";

    const normalizedFormMasterClassName =
      typeof formMasterClassName === "string"
        ? formMasterClassName
        : "";

    const profileUpdate: Record<string, unknown> = {
      name: `${firstName || ""} ${lastName || ""}`.trim(),
      email:
        typeof email === "string"
          ? email.trim().toLowerCase()
          : "",
      role: "teacher",
      status:
        status === "suspended" ||
        status === "disabled"
          ? status
          : "active",

      /*
       * Teacher security permissions.
       */
      classIds: normalizedClassIds,
      subjectIds: normalizedSubjectIds,

      formClassId:
        normalizedFormClassId || null,

      formMasterClassId:
        normalizedFormMasterClassId,

      formMasterClassName:
        normalizedFormMasterClassName,

      /*
       * Form Master automatically receives
       * full result-upload permission.
       */
      canUploadAllResults:
        Boolean(normalizedFormMasterClassId),
    };

    await adminDb()
      .doc(`users/${authUid}`)
      .set(profileUpdate, { merge: true });

    /*
     * Keep the teacher document linked correctly.
     */
    await teacherRef.update({
      authUid,
    });

    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "Teacher account permissions synchronized",
        actor:
          callerDoc.data()?.name ||
          callerDoc.data()?.email ||
          "admin",
        details:
          `${firstName || ""} ${lastName || ""}`.trim() ||
          email ||
          teacherId,
        createdAt: new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Teacher account permissions synchronized successfully.",
    });
  } catch (err) {
    console.error(
      "Could not synchronize teacher account:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not synchronize teacher account.",
      },
      { status: 500 }
    );
  }
}