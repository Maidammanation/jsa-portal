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

function resolveClass(identifier: string, classes: Array<{ id: string; name: string }>) {
  const key = normalize(identifier);
  if (!key) return undefined;
  return classes.find(item => normalize(item.id) === key) ||
    classes.find(item => normalize(item.name) === key);
}

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const db = adminDb();

    const userSnap = await db.doc(`users/${decoded.uid}`).get();
    const user = userSnap.data();

    if (!userSnap.exists || user?.role !== "teacher" || user?.status !== "active") {
      return NextResponse.json({ error: "An active teacher account is required." }, { status: 403 });
    }

    const [teacherSnap, classesSnap] = await Promise.all([
      db.collection("teachers").where("authUid", "==", decoded.uid).limit(1).get(),
      db.collection("classes").get(),
    ]);

    if (teacherSnap.empty) {
      return NextResponse.json({ error: "Your teacher record could not be found." }, { status: 404 });
    }

    const teacherDoc = teacherSnap.docs[0];
    const teacher = teacherDoc.data();

    if (teacher.status && teacher.status !== "active") {
      return NextResponse.json({ error: "Your teacher record is not active." }, { status: 403 });
    }

    const classes = classesSnap.docs.map(doc => ({
      id: doc.id,
      name: clean(doc.data().name),
    }));

    const assignedIdentifiers = [
      ...asStringArray(teacher.classIds),
      clean(teacher.formClassId),
      clean(teacher.formMasterClassId),
      clean(teacher.formMasterClassName),
    ].filter(Boolean);

    const assignedClasses = new Set(
      assignedIdentifiers
        .map(identifier => resolveClass(identifier, classes)?.id)
        .filter((id): id is string => Boolean(id))
    );

    const formMasterIdentifier =
      clean(teacher.formClassId) ||
      clean(teacher.formMasterClassId) ||
      clean(teacher.formMasterClassName);

    const formMasterClass = resolveClass(formMasterIdentifier, classes);
    const params = request.nextUrl.searchParams;
    const term = clean(params.get("term"));
    const session = clean(params.get("session"));
    const studentId = clean(params.get("studentId"));
    const classId = clean(params.get("classId"));
    const subjectId = clean(params.get("subjectId"));

    if (!term || !session) {
      return NextResponse.json({ error: "Term and session are required." }, { status: 400 });
    }

    // Individual student results are used by the Form Master report-card workflow.
    if (studentId) {
      const studentSnap = await db.doc(`students/${studentId}`).get();
      if (!studentSnap.exists) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      const student = studentSnap.data() || {};
      const studentClass = resolveClass(clean(student.classId) || clean(student.className), classes);
      if (!studentClass || formMasterClass?.id !== studentClass.id) {
        return NextResponse.json({ error: "You are not authorised to view this student's results." }, { status: 403 });
      }

      const resultsSnap = await db.collection("results")
        .where("studentId", "==", studentId)
        .where("term", "==", term)
        .where("session", "==", session)
        .get();

      return NextResponse.json({
        results: resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      });
    }

    // Class/subject results are used by the teacher result-entry screen.
    if (!classId || !subjectId) {
      return NextResponse.json({ error: "Class, subject, term and session are required." }, { status: 400 });
    }

    const classroom = classes.find(item => item.id === classId);
    if (!classroom) {
      return NextResponse.json({ error: "The selected class could not be found." }, { status: 404 });
    }

    const isFormMaster = formMasterClass?.id === classroom.id;
    const isAssigned = assignedClasses.has(classroom.id);

    if (!isAssigned) {
      return NextResponse.json({ error: "You are not assigned to this class." }, { status: 403 });
    }

    const subjectIds = new Set(asStringArray(teacher.subjectIds));
    const hasAllResultAccess = teacher.canUploadAllResults === true;

    if (!isFormMaster && !hasAllResultAccess && !subjectIds.has(subjectId)) {
      return NextResponse.json({ error: "You are not assigned to this subject." }, { status: 403 });
    }

    const subjectSnap = await db.doc(`subjects/${subjectId}`).get();
    if (!subjectSnap.exists) {
      return NextResponse.json({ error: "The selected subject could not be found." }, { status: 404 });
    }

    // The authenticated teacher assignment above is the read boundary.
    // Subject/class curriculum validation remains enforced on submission.

    const resultsSnap = await db.collection("results")
      .where("classId", "==", classId)
      .where("subjectId", "==", subjectId)
      .where("term", "==", term)
      .where("session", "==", session)
      .get();

    return NextResponse.json({
      results: resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error) {
    console.error("Teacher results API error:", error);
    return NextResponse.json({ error: "Unable to load results." }, { status: 500 });
  }
}
