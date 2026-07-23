import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

/**
 * Creates a Firebase Auth account + matching Firestore `users` profile for a
 * teacher or student, and links it back to their staff/student record.
 * Restricted to signed-in admins (checked via session cookie + Firestore role lookup).
 * Uses the Admin SDK, so — unlike client-side signup — this does NOT sign the
 * calling admin out or switch their session to the new account.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an authenticated admin.
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const callerDoc = await adminDb().doc(`users/${decoded.uid}`).get();
    const callerRole = callerDoc.data()?.role;
    if (callerRole !== "admin" && callerRole !== "super-admin") {
      return NextResponse.json({ error: "Only admins can create login accounts." }, { status: 403 });
    }

    // 2. Read the request body.
    const { email, password, name, role, linkCollection, linkId } = await request.json();
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!["teacher", "student", "parent"].includes(role)) {
      return NextResponse.json({ error: "Invalid role for this action." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // 3. Create the Firebase Auth account.
    const userRecord = await adminAuth().createUser({ email, password, displayName: name });

    // 4. Create the matching Firestore profile — mustChangePassword forces
    // them to set their own password on first login.
    await adminDb().doc(`users/${userRecord.uid}`).set({
      name,
      email,
      role,
      status: "active",
      mustChangePassword: true,
    });

    // 5. Link back to the student/teacher/parent record so the portal knows
    // which staff/student record this login belongs to.
    if (linkCollection && linkId) {
      await adminDb()
        .doc(`${linkCollection}/${linkId}`)
        .update({ authUid: userRecord.uid });
    }

    // 6. Audit trail.
    await adminDb().collection("activityLog").add({
      action: "Login account created",
      actor: callerDoc.data()?.name || callerDoc.data()?.email || "admin",
      details: `${role} — ${email}`,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account.";
    // Firebase gives a specific code for "email already in use" — surface that clearly.
    const isDuplicate = message.includes("already exists") || message.includes("EMAIL_EXISTS");
    return NextResponse.json(
      { error: isDuplicate ? "An account with this email already exists." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}