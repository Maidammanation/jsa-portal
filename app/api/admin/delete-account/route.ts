import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify that the person making the request is an admin.
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

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

    if (callerRole !== "admin" && callerRole !== "super-admin") {
      return NextResponse.json(
        { error: "Only admins can delete accounts." },
        { status: 403 }
      );
    }

    // 2. Read the account details.
    const body = await request.json();

    const {
      uid,
      teacherId,
      email,
    }: {
      uid?: string;
      teacherId?: string;
      email?: string;
    } = body;

    if (!uid && !teacherId && !email) {
      return NextResponse.json(
        {
          error:
            "Please provide the account UID, teacher ID, or email address.",
        },
        { status: 400 }
      );
    }

    let authUid = uid || "";

    // 3. If we only received the teacher ID, find the Auth UID
    // from the teacher record.
    if (!authUid && teacherId) {
      const teacherDoc = await adminDb()
        .doc(`teachers/${teacherId}`)
        .get();

      if (teacherDoc.exists) {
        authUid = teacherDoc.data()?.authUid || "";
      }
    }

    // 4. If we still don't have a UID but have an email,
    // find the Firebase Auth account by email.
    if (!authUid && email) {
      try {
        const userRecord = await adminAuth().getUserByEmail(
          email.trim().toLowerCase()
        );

        authUid = userRecord.uid;
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: unknown }).code)
            : "";

        // No Firebase Auth account exists for this email.
        // That's okay — we can still remove the Firestore record.
        if (code !== "auth/user-not-found") {
          throw err;
        }
      }
    }

    // 5. Get email/name information for the activity log.
    let accountEmail = email || "";
    let accountName = "";

    if (authUid) {
      try {
        const authUser = await adminAuth().getUser(authUid);

        accountEmail = authUser.email || accountEmail;
        accountName = authUser.displayName || "";
      } catch {
        // The Auth account may already have been removed.
      }
    }

    // 6. Delete Firebase Authentication account.
    if (authUid) {
      try {
        await adminAuth().deleteUser(authUid);
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: unknown }).code)
            : "";

        // If the Auth account is already gone, continue cleaning up.
        if (code !== "auth/user-not-found") {
          throw err;
        }
      }
    }

    // 7. Delete the users profile.
    if (authUid) {
      await adminDb()
        .doc(`users/${authUid}`)
        .delete();
    }

    // 8. Remove the teacher record.
    if (teacherId) {
      await adminDb()
        .doc(`teachers/${teacherId}`)
        .delete();
    } else if (authUid) {
      // Fallback: find a teacher record linked to this Auth UID.
      const teacherSnapshot = await adminDb()
        .collection("teachers")
        .where("authUid", "==", authUid)
        .limit(10)
        .get();

      for (const teacherDoc of teacherSnapshot.docs) {
        await teacherDoc.ref.delete();
      }
    }

    // 9. Write an audit log.
    await adminDb().collection("activityLog").add({
      action: "Login account deleted",
      actor:
        callerDoc.data()?.name ||
        callerDoc.data()?.email ||
        "admin",
      details: accountName
        ? `Teacher account deleted — ${accountName} (${accountEmail})`
        : `Teacher account deleted — ${accountEmail || authUid || teacherId}`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message:
        "Account and linked teacher record deleted successfully.",
    });
  } catch (err) {
    console.error("Delete account error:", err);

    const message =
      err instanceof Error
        ? err.message
        : "Could not delete account.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}