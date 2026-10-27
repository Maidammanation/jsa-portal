
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!cookie) {
      return NextResponse.json(
        { error: "Please sign in as an administrator." },
        { status: 401 }
      );
    }

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const db = adminDb();

    const callerDoc = await db.doc(`users/${decoded.uid}`).get();

    if (!callerDoc.exists) {
      return NextResponse.json(
        { error: "Administrator profile not found." },
        { status: 403 }
      );
    }

    const caller = callerDoc.data() || {};

    if (
      caller.status !== "active" ||
      (caller.role !== "admin" && caller.role !== "super-admin")
    ) {
      return NextResponse.json(
        { error: "Only active admins can run this operation." },
        { status: 403 }
      );
    }

    // Read all student records. Only the Arabic setting will be changed.
    const snapshot = await db.collection("students").get();

    if (snapshot.empty) {
      return NextResponse.json({
        ok: true,
        updated: 0,
        message: "No student records were found.",
      });
    }

    let updated = 0;

    // Firestore allows at most 500 writes per batch.
    // Use batches of 400 to stay safely below that limit.
    for (let start = 0; start < snapshot.docs.length; start += 400) {
      const chunk = snapshot.docs.slice(start, start + 400);
      const batch = db.batch();

      for (const studentDoc of chunk) {
        if (studentDoc.data().attendsArabic !== true) {
          batch.update(studentDoc.ref, { attendsArabic: true });
          updated++;
        }
      }

      if (chunk.some((doc) => doc.data().attendsArabic !== true)) {
        await batch.commit();
      }
    }

    await db.collection("activityLog").add({
      action: "Arabic section enabled for existing students",
      actor: caller.name || caller.email || decoded.uid,
      details: `${updated} student record(s) updated. Other student fields were preserved.`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      updated,
      totalStudents: snapshot.size,
      message: `Arabic was enabled for ${updated} student record(s).`,
    });
  } catch (error) {
    console.error("Bulk Arabic update failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update student Arabic settings.",
      },
      { status: 500 }
    );
  }
}
