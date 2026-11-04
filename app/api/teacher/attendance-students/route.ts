import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

type ClassData = {
  id: string;
  name: string;
  level: string;
};

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalize = (value: unknown): string =>
  clean(value).toLowerCase();

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string =>
        typeof item === "string" && item.trim().length > 0
      ).map((item) => item.trim())
    : [];

function resolveClass(identifier: string, classes: ClassData[]) {
  const key = normalize(identifier);
  if (!key) return null;

  return classes.find((item) => normalize(item.id) === key)
    || classes.find((item) => normalize(item.name) === key)
    || null;
}

function isSecondaryClass(classroom: ClassData): boolean {
  const level = normalize(classroom.level);
  const name = normalize(classroom.name).replace(/-/g, " ");

  return level === "jss"
    || level === "ss"
    || level.includes("jss")
    || level.includes("secondary")
    || /^(jss|ss)\s*[1-3]$/.test(name);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Require a valid, non-revoked server session.
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);

    // 2. Verify the account role and active status from the server profile.
    const userSnapshot = await adminDb().doc(`users/${decoded.uid}`).get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: "User profile was not found." }, { status: 404 });
    }

    const user = userSnapshot.data() || {};
    if (user.role !== "teacher" || user.status !== "active") {
      return NextResponse.json({ error: "An active teacher account is required." }, { status: 403 });
    }

    const requestedClassId = clean(request.nextUrl.searchParams.get("classId"));
    if (!requestedClassId) {
      return NextResponse.json({ error: "A class ID is required." }, { status: 400 });
    }

    // 3. Resolve the requested class and teacher assignment from trusted data.
    const [classesSnapshot, teachersSnapshot] = await Promise.all([
      adminDb().collection("classes").get(),
      adminDb().collection("teachers").get(),
    ]);

    const classes: ClassData[] = classesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: clean(doc.data().name),
      level: clean(doc.data().level),
    }));

    const selectedClass = resolveClass(requestedClassId, classes);
    if (!selectedClass) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const teachers = teachersSnapshot.docs.map((doc) => doc.data());
    const currentTeacher = teachers.find((teacher) => teacher.authUid === decoded.uid);
    if (!currentTeacher) {
      return NextResponse.json({ error: "Teacher record not found." }, { status: 404 });
    }

    if (currentTeacher.status && currentTeacher.status !== "active") {
      return NextResponse.json({ error: "Your teacher record is not active." }, { status: 403 });
    }

    // 4. Enforce the same attendance policy as the permissions and submit APIs.
    const formMasterIdentifier =
      clean(currentTeacher.formClassId)
      || clean(currentTeacher.formMasterClassId)
      || clean(currentTeacher.formMasterClassName);

    const formMasterClass = resolveClass(formMasterIdentifier, classes);
    const isFormMaster = formMasterClass?.id === selectedClass.id;
    const secondary = isSecondaryClass(selectedClass);

    if (secondary) {
      if (!isFormMaster) {
        return NextResponse.json(
          { error: "Only the Form Master can access attendance rosters for JSS and SS classes." },
          { status: 403 }
        );
      }
    } else if (!isFormMaster) {
      const assignedClasses = asStringArray(currentTeacher.classIds)
        .map((identifier) => resolveClass(identifier, classes))
        .filter((item): item is ClassData => Boolean(item));

      if (!assignedClasses.some((item) => item.id === selectedClass.id)) {
        return NextResponse.json({ error: "You are not assigned to this class." }, { status: 403 });
      }

      const teacherCount = teachers.filter((teacher) => {
        const assignedIds = new Set(
          asStringArray(teacher.classIds)
            .map((identifier) => resolveClass(identifier, classes)?.id)
            .filter((id): id is string => Boolean(id))
        );
        return assignedIds.has(selectedClass.id);
      }).length;

      if (teacherCount !== 1) {
        return NextResponse.json(
          { error: "Only the Form Master or the sole teacher assigned to this class can access its attendance roster." },
          { status: 403 }
        );
      }
    }

    // 5. Return only the student fields required by the attendance screen.
    const studentsSnapshot = await adminDb().collection("students").get();

    const students = studentsSnapshot.docs
      .filter((doc) => {
        const data = doc.data();
        return normalize(data.classId) === normalize(selectedClass.id)
          || normalize(data.classId) === normalize(selectedClass.name)
          || normalize(data.className) === normalize(selectedClass.name);
      })
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          admissionNo: clean(data.admissionNo),
          firstName: clean(data.firstName),
          lastName: clean(data.lastName),
          classId: clean(data.classId) || selectedClass.id,
          className: clean(data.className) || selectedClass.name,
          gender: data.gender === "female" ? "female" : "male",
          status: clean(data.status) || "active",
          attendsArabic: data.attendsArabic === true,
        };
      });

    return NextResponse.json(
      { students },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Teacher attendance roster API error:", error);
    return NextResponse.json(
      { error: "Unable to load the attendance roster for this class." },
      { status: 500 }
    );
  }
}
