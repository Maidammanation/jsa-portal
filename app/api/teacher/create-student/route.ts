
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const db = adminDb();

    const userDoc = await db.doc(`users/${decoded.uid}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const user = userDoc.data() || {};
    if (user.role !== "teacher" || user.status !== "active") {
      return NextResponse.json(
        { error: "Only active teacher accounts can use this feature." },
        { status: 403 }
      );
    }

    const teachers = await db.collection("teachers")
      .where("authUid", "==", decoded.uid)
      .limit(1)
      .get();

    if (teachers.empty) {
      return NextResponse.json(
        { error: "Your account is not linked to a teacher record." },
        { status: 403 }
      );
    }

    const teacher = teachers.docs[0].data();
    const assignment = clean(
      teacher.formClassId ||
      teacher.formMasterClassId ||
      teacher.formMasterClassName
    );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned as a Form Master." },
        { status: 403 }
      );
    }

    const classes = await db.collection("classes").get();
    const classroom = classes.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .find(item =>
        normalize(item.id) === normalize(assignment) ||
        normalize(item.name) === normalize(assignment)
      );

    if (!classroom) {
      return NextResponse.json(
        { error: "Your assigned class could not be found." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const gender = clean(body.gender);
    const dateOfBirth = clean(body.dateOfBirth);
    const attendsArabic = body.attendsArabic === true;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 }
      );
    }

    if (gender !== "male" && gender !== "female") {
      return NextResponse.json(
        { error: "Please select a valid gender." },
        { status: 400 }
      );
    }

    const className = clean(classroom.name);
    const normalizedName = normalize(className);
    const match = normalizedName.match(/^(pre nursery|nursery|primary|jss|ss)\s*(\d+)?/);

    const code = !match ? "GEN" :
      match[1] === "pre nursery" ? "PN" :
      match[1] === "nursery" ? `N${match[2] || ""}` :
      match[1] === "primary" ? `P${match[2] || ""}` :
      `${match[1].toUpperCase()}${match[2] || ""}`;

    const existing = await db.collection("students")
      .where("classId", "==", classroom.id)
      .get();

    let highest = 0;
    existing.docs.forEach(doc => {
      const number = clean(doc.data().admissionNo).match(/\/(\d+)$/);
      if (number) highest = Math.max(highest, Number(number[1]));
    });

    let admissionNo = "";
    for (let i = highest + 1; i <= highest + 100; i++) {
      const candidate = `JSA/${code}/${String(i).padStart(4, "0")}`;
      const duplicate = await db.collection("students")
        .where("admissionNo", "==", candidate)
        .limit(1)
        .get();

      if (duplicate.empty) {
        admissionNo = candidate;
        break;
      }
    }

    if (!admissionNo) {
      return NextResponse.json(
        { error: "Could not generate an admission number. Contact the administrator." },
        { status: 409 }
      );
    }

    const student: Record<string, unknown> = {
      admissionNo,
      firstName,
      lastName,
      classId: classroom.id,
      className,
      gender,
      status: "active",
      attendsArabic,
      createdBy: clean(user.name) || clean(user.email) || "Form Master",
      createdAt: new Date()
    };

    if (dateOfBirth) student.dateOfBirth = dateOfBirth;

    const studentRef = await db.collection("students").add(student);

    await db.collection("activityLog").add({
      action: "Student added by Form Master",
      actor: clean(user.name) || clean(user.email) || "Form Master",
      details: `${firstName} ${lastName} — ${className} — ${admissionNo}`,
      createdAt: new Date()
    });

    return NextResponse.json({
      ok: true,
      message: "Student added successfully.",
      student: {
        id: studentRef.id,
        admissionNo,
        firstName,
        lastName,
        classId: classroom.id,
        className
      }
    });
  } catch (error) {
    console.error("Form Master student creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add student." },
      { status: 500 }
    );
  }
}
