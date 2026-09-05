import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

async function verifyAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new Error("Not authenticated.");
  }

  const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);

  const callerDoc = await adminDb()
    .doc(`users/${decoded.uid}`)
    .get();

  if (!callerDoc.exists) {
    throw new Error("Administrator profile not found.");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData?.role;

  if (callerRole !== "admin" && callerRole !== "super-admin") {
    throw new Error("Only administrators can manage team accounts.");
  }

  return {
    uid: decoded.uid,
    role: callerRole,
    name: callerData?.name || callerData?.email || "admin",
  };
}

/**
 * Update an existing team/director account.
 */
export async function PATCH(request: NextRequest) {
  try {
    const caller = await verifyAdmin(request);

    const {
      uid,
      name,
      email,
      role,
      status,
      password,
    } = await request.json();

    if (!uid || !name || !email || !role || !status) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!["admin", "super-admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid team role." },
        { status: 400 }
      );
    }

    if (!["active", "suspended", "disabled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid account status." },
        { status: 400 }
      );
    }

    // Prevent an administrator from accidentally removing their own
    // administrative access.
    if (uid === caller.uid && role !== "super-admin") {
      return NextResponse.json(
        {
          error:
            "You cannot remove your own Director access from this page.",
        },
        { status: 400 }
      );
    }

    const auth = adminAuth();
    const db = adminDb();

    const authUser = await auth.getUser(uid);

    // Update Firebase Authentication.
    const authUpdate: {
      displayName: string;
      email?: string;
      password?: string;
      disabled?: boolean;
    } = {
      displayName: name,
      disabled: status !== "active",
    };

    if (email !== authUser.email) {
      authUpdate.email = email;
    }

    if (password && password.trim()) {
      if (password.length < 8) {
        return NextResponse.json(
          {
            error:
              "New password must be at least 8 characters.",
          },
          { status: 400 }
        );
      }

      authUpdate.password = password;
    }

    await auth.updateUser(uid, authUpdate);

    // Update the Firestore profile.
    await db.doc(`users/${uid}`).update({
      name,
      email,
      role,
      status,
      mustChangePassword:
        password && password.trim() ? true : false,
      updatedAt: new Date(),
    });

    // Activity log.
    await db.collection("activityLog").add({
      action: "Team account updated",
      actor: caller.name,
      details: `${role} — ${email}`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message: "Team account updated successfully.",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not update account.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Delete an existing team/director account.
 */
export async function DELETE(request: NextRequest) {
  try {
    const caller = await verifyAdmin(request);

    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    // Never allow an administrator to delete their own account
    // from this page.
    if (uid === caller.uid) {
      return NextResponse.json(
        {
          error:
            "You cannot delete your own account.",
        },
        { status: 400 }
      );
    }

    const db = adminDb();

    const userDoc = await db
      .doc(`users/${uid}`)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Team member not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Delete Firebase Authentication account.
    await adminAuth().deleteUser(uid);

    // Delete Firestore profile.
    await db.doc(`users/${uid}`).delete();

    // Activity log.
    await db.collection("activityLog").add({
      action: "Team account deleted",
      actor: caller.name,
      details:
        userData?.name ||
        userData?.email ||
        uid,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message: "Team account deleted successfully.",
    });
  } catch (err) {
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