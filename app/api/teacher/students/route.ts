import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase();
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim())
    : [];
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const userSnap = await adminDb().doc(`users/${decoded.uid}`).get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User profile was not found." }, { status: 404 });
    }

    const user = userSnap.data() || {};
    if (user.role !== "teacher" || user.status !== "active") {
      return NextResponse.json({ error: "An active teacher account is required." }, { status: 403 });
    }

    const classId = clean(request.nextUrl.searchParams.get("classId"));
    if (!classId) {
      return NextResponse.json({ error: "A class ID is required." }, { status: 400 });
    }

    const [teacherSnap, classSnap] = await Promise.all([
      adminDb().collection("teachers").where("authUid", "==", decoded.uid).limit(1).get(),
      adminDb().collection("classes").get(),
    ]);

    if (teacherSnap.empty) {
      return NextResponse.json({ error: "Your teacher record could not be found." }, { status: 404 });
    }

    const teacher = teacherSnap.docs[0].data();
    if (teacher.status && teacher.status !== "active") {
      return NextResponse.json({ error: "Your teacher record is not active." }, { status: 403 });
    }

    const classes = classSnap.docs.map(doc => ({
      id: doc.id,
      name: clean(doc.data().name),
    }));

    const selectedClass = classes.find(item => item.id === classId);
    if (!selectedClass) {
      return NextResponse.json({ error: "The selected class could not be found." }, { status: 404 });
    }

    const assignedIdentifiers = [
      ...asStringArray(teacher.classIds),
      clean(teacher.formClassId),
      clean(teacher.formMasterClassId),
      clean(teacher.formMasterClassName),
    ].filter(Boolean);

    const isAssigned = assignedIdentifiers.some(identifier =>
      normalize(identifier) === normalize(selectedClass.id) ||
      normalize(identifier) === normalize(selectedClass.name)
    );

    if (!isAssigned) {
      return NextResponse.json({ error: "You are not assigned to this class." }, { status: 403 });
    }

    const studentsSnap = await adminDb().collection("students").get();
    const students = studentsSnap.docs
      .filter(doc => {
        const data = doc.data();
        return (
          normalize(data.classId) === normalize(selectedClass.id) ||
          normalize(data.classId) === normalize(selectedClass.name) ||
          normalize(data.className) === normalize(selectedClass.name)
        );
      })
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          admissionNo: clean(data.admissionNo),
          firstName: clean(data.firstName),
          lastName: clean(data.lastName),
          classId: clean(data.classId) || selectedClass.id,
          className: clean(data.className) || selectedClass.name,
          gender: data.gender === "female" ? "female" : "male",
          dateOfBirth: clean(data.dateOfBirth) || undefined,
          parentUid: clean(data.parentUid) || undefined,
          parentName: clean(data.parentName) || undefined,
          status: clean(data.status) || "active",
          photoUrl: clean(data.photoUrl) || undefined,
          attendsArabic: data.attendsArabic === true,
        };
      });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Teacher students API error:", error);
    return NextResponse.json({ error: "Unable to load students for this class." }, { status: 500 });
  }
}
