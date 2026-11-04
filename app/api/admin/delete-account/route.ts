import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

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
    // 1. Verify the caller's server session and authoritative profile.
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

    const callerData = callerDoc.data();
    const callerRole = callerData?.role;

    if (
      !callerDoc.exists ||
      callerData?.status !== "active" ||
      (callerRole !== "admin" && callerRole !== "super-admin")
    ) {
      return NextResponse.json(
        { error: "Only active administrators can remove teacher accounts." },
        { status: 403 }
      );
    }

    // 2. This endpoint is exclusively for deleting a teacher record.
    // Requiring teacherId prevents a caller from targeting an arbitrary UID/email.
    const body = await request.json();
    const teacherId =
      typeof body?.teacherId === "string"
        ? body.teacherId.trim()
        : "";
    const suppliedUid =
      typeof body?.uid === "string"
        ? body.uid.trim()
        : "";

    if (!teacherId) {
      return NextResponse.json(
        { error: "A valid teacher ID is required." },
        { status: 400 }
      );
    }

    const db = adminDb();
    const teacherRef = db.doc(`teachers/${teacherId}`);
    const teacherDoc = await teacherRef.get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: "Teacher record not found." },
        { status: 404 }
      );
    }

    const teacherData = teacherDoc.data() || {};
    const linkedUid =
      typeof teacherData.authUid === "string"
        ? teacherData.authUid.trim()
        : "";

    if (suppliedUid && suppliedUid !== linkedUid) {
      return NextResponse.json(
        { error: "The supplied login account is not linked to this teacher." },
        { status: 403 }
      );
    }

    const teacherEmail =
      typeof teacherData.email === "string"
        ? teacherData.email.trim().toLowerCase()
        : "";

    const teacherName = [
      teacherData.firstName,
      teacherData.lastName,
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ")
      .trim();

    // 3. If the teacher has a linked login, verify that its profile is
    // actually a teacher profile before deleting anything.
    if (linkedUid) {
      const userRef = db.doc(`users/${linkedUid}`);
      const userDoc = await userRef.get();

      if (userDoc.exists && userDoc.data()?.role !== "teacher") {
        return NextResponse.json(
          {
            error:
              "Deletion blocked: this login is not registered as a teacher account.",
          },
          { status: 409 }
        );
      }

      // Delete only the Auth UID explicitly linked on this teacher record.
      try {
        await adminAuth().deleteUser(linkedUid);
      } catch (error) {
        if (getErrorCode(error) !== "auth/user-not-found") {
          throw error;
        }
      }

      // Remove the matching teacher user profile, never an arbitrary UID.
      await userRef.delete();
    }

    // 4. Remove only the teacher record supplied and verified above.
    await teacherRef.delete();

    // 5. Keep an audit trail.
    await db.collection("activityLog").add({
      action: "Teacher account deleted",
      actor:
        callerData?.name ||
        callerData?.email ||
        "administrator",
      details: linkedUid
        ? `Teacher deleted — ${teacherName || teacherEmail || teacherId} (login: ${teacherEmail || linkedUid})`
        : `Teacher record deleted — ${teacherName || teacherEmail || teacherId} (no linked login)`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message: linkedUid
        ? "Teacher and linked login account deleted successfully."
        : "Teacher record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete teacher account error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete the teacher account.",
      },
      { status: 500 }
    );
  }
}
