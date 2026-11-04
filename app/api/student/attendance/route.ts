import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const userDoc = await adminDb().doc(`users/${decoded.uid}`).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile was not found." }, { status: 404 });
    }

    const user = userDoc.data() || {};
    if (user.role !== "student" || user.status !== "active") {
      return NextResponse.json({ error: "An active student account is required." }, { status: 403 });
    }

    let studentDoc = typeof user.studentId === "string" && user.studentId.trim()
      ? await adminDb().collection("students").doc(user.studentId.trim()).get()
      : null;

    if (!studentDoc?.exists) {
      const linked = await adminDb().collection("students")
        .where("authUid", "==", decoded.uid).limit(1).get();
      studentDoc = linked.empty ? null : linked.docs[0];
    }

    if (!studentDoc?.exists) {
      return NextResponse.json({ error: "No student record is linked to this account." }, { status: 404 });
    }

    const studentData = studentDoc.data() || {};
    const storedClassId = typeof studentData.classId === "string" ? studentData.classId.trim() : "";
    const className = typeof studentData.className === "string" ? studentData.className.trim() : "";

    if (!storedClassId) {
      return NextResponse.json({
        student: {
          id: studentDoc.id,
          classId: "",
          className,
        },
        records: [],
      });
    }

    const classDoc = await adminDb().collection("classes").doc(storedClassId).get();
    let canonicalClassId = classDoc.exists ? classDoc.id : "";
    if (!canonicalClassId) {
      const byName = await adminDb().collection("classes")
        .where("name", "==", storedClassId).limit(1).get();
      if (!byName.empty) canonicalClassId = byName.docs[0].id;
    }
    if (!canonicalClassId && className) {
      const byName = await adminDb().collection("classes")
        .where("name", "==", className).limit(1).get();
      if (!byName.empty) canonicalClassId = byName.docs[0].id;
    }

    const attendanceClassId = canonicalClassId || storedClassId;
    const attendanceSnapshot = await adminDb().collection("attendance")
      .where("classId", "==", attendanceClassId).get();

    const records = attendanceSnapshot.docs.flatMap((doc) => {
      const data = doc.data();
      const match = Array.isArray(data.records)
        ? data.records.find((item: { studentId?: unknown }) => item?.studentId === studentDoc!.id)
        : null;
      if (!match || !["present", "absent", "late"].includes(match.status)) return [];
      return [{ date: String(data.date || ""), status: match.status as "present" | "absent" | "late" }];
    }).sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json(
      {
        student: {
          id: studentDoc.id,
          classId: attendanceClassId,
          className: className || (classDoc.exists ? String(classDoc.data()?.name || "") : ""),
        },
        records,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Student attendance read error:", error);
    return NextResponse.json({ error: "Could not load attendance." }, { status: 500 });
  }
}
