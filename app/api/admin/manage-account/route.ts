import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

async function verifySuperAdmin(request: NextRequest) {
  const sessionCookie =
    request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

  if (!sessionCookie) {
    throw new Error("Not authenticated.");
  }

  const decoded =
    await adminAuth().verifySessionCookie(
      sessionCookie,
      true
    );

  const callerDoc =
    await adminDb()
      .doc(`users/${decoded.uid}`)
      .get();

  if (!callerDoc.exists) {
    throw new Error(
      "Administrator profile not found."
    );
  }

  const callerData =
    callerDoc.data();

  /*
   * IMPORTANT:
   * Only an ACTIVE Super Admin can use
   * this endpoint.
   */
  if (
    callerData?.role !== "super-admin" ||
    callerData?.status !== "active"
  ) {
    throw new Error(
      "Only an active Super Admin can manage team accounts."
    );
  }

  return {
    uid: decoded.uid,
    role: callerData.role,
    name:
      callerData?.name ||
      callerData?.email ||
      "Super Admin",
  };
}

/**
 * UPDATE TEAM ACCOUNT
 *
 * Only Super Admin can:
 * - change Admin accounts
 * - change Super Admin accounts
 * - change role
 * - suspend accounts
 * - disable accounts
 * - reset passwords
 */
export async function PATCH(
  request: NextRequest
) {
  try {
    const caller =
      await verifySuperAdmin(request);

    const {
      uid,
      name,
      email,
      role,
      status,
      password,
    } = await request.json();

    if (
      !uid ||
      !name ||
      !email ||
      !role ||
      !status
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
     * Team Management only handles
     * Admin and Super Admin accounts.
     */
    if (
      ![
        "admin",
        "super-admin",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid team role.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "active",
        "suspended",
        "disabled",
      ].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid account status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * A Super Admin must never be able
     * to accidentally lock themselves out.
     */
    if (
      uid === caller.uid &&
      (
        role !== "super-admin" ||
        status !== "active"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot remove, demote, suspend, or disable your own Super Admin access.",
        },
        {
          status: 400,
        }
      );
    }

    const auth = adminAuth();
    const db = adminDb();

    let authUser;

    try {
      authUser =
        await auth.getUser(uid);
    } catch {
      return NextResponse.json(
        {
          error:
            "Firebase Authentication account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Firebase Authentication update.
     */
    const authUpdate: {
      displayName: string;
      email?: string;
      password?: string;
      disabled?: boolean;
    } = {
      displayName: name,
      disabled:
        status !== "active",
    };

    if (
      email !== authUser.email
    ) {
      authUpdate.email = String(
        email
      )
        .trim()
        .toLowerCase();
    }

    /*
     * Optional password reset.
     */
    if (
      password &&
      String(password).trim()
    ) {
      if (
        String(password).length < 8
      ) {
        return NextResponse.json(
          {
            error:
              "New password must be at least 8 characters.",
          },
          {
            status: 400,
          }
        );
      }

      authUpdate.password =
        String(password);
    }

    await auth.updateUser(
      uid,
      authUpdate
    );

    /*
     * Firestore profile update.
     */
    await db
      .doc(`users/${uid}`)
      .update({
        name,
        email: String(email)
          .trim()
          .toLowerCase(),
        role,
        status,
        mustChangePassword:
          password &&
          String(password).trim()
            ? true
            : false,
        updatedAt: new Date(),
      });

    /*
     * Audit trail.
     */
    await db
      .collection("activityLog")
      .add({
        action:
          "Team account updated",
        actor: caller.name,
        details:
          `${role} — ${email}`,
        createdAt:
          new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Team account updated successfully.",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not update account.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message.includes(
            "Only an active Super Admin"
          )
            ? 403
            : 500,
      }
    );
  }
}

/**
 * DELETE TEAM ACCOUNT
 *
 * Only Super Admin can delete
 * Admin/Super Admin team accounts.
 */
export async function DELETE(
  request: NextRequest
) {
  try {
    const caller =
      await verifySuperAdmin(request);

    const { uid } =
      await request.json();

    if (!uid) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Never allow a Super Admin
     * to delete their own account.
     */
    if (uid === caller.uid) {
      return NextResponse.json(
        {
          error:
            "You cannot delete your own Super Admin account.",
        },
        {
          status: 400,
        }
      );
    }

    const db = adminDb();

    const userDoc =
      await db
        .doc(`users/${uid}`)
        .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          error:
            "Team member not found.",
        },
        {
          status: 404,
        }
      );
    }

    const userData =
      userDoc.data();

    /*
     * Safety check:
     * this endpoint must NEVER be used
     * to delete Teacher/Student/Parent
     * profiles.
     */
    if (
      ![
        "admin",
        "super-admin",
      ].includes(
        userData?.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This endpoint can only delete Admin or Super Admin team accounts.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Delete Firebase Authentication
     * account first.
     */
    await adminAuth()
      .deleteUser(uid);

    /*
     * Then delete Firestore profile.
     */
    await db
      .doc(`users/${uid}`)
      .delete();

    /*
     * Audit trail.
     */
    await db
      .collection("activityLog")
      .add({
        action:
          "Team account deleted",
        actor: caller.name,
        details:
          userData?.name ||
          userData?.email ||
          uid,
        createdAt:
          new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Team account deleted successfully.",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not delete account.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message.includes(
            "Only an active Super Admin"
          )
            ? 403
            : 500,
      }
    );
  }
}