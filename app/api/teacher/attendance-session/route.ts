import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

type ClassData = { id: string; name?: string; level?: string };
type TeacherData = {
  authUid?: string;
  classIds?: unknown;
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string | null;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const normalize = (value: unknown) => clean(value).toLowerCase();

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim())
    : [];
}
function resolveClass(identifier: string, classes: ClassData[]) {
  const key = normalize(identifier);
  return classes.find((item) => normalize(item.id) === key)
    || classes.find((item) => normalize(item.name) === key)
    || null;
}
function isSecondaryClass(item: ClassData) {
  const level = normalize(item.level);
  const name = normalize(item.name).replace(/-/g, " ");
  return level === "jss" || level === "ss" || level.includes("jss")
    || level.includes("secondary") || /^(jss|ss)\s*[1-3]$/.test(name);
}

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const userDoc = await adminDb().doc(`users/${decoded.uid}`).get();
    if (!userDoc.exists) return NextResponse.json({ error: "User profile was not found." }, { status: 404 });
    const user = userDoc.data() || {};
    if (user.role !== "teacher" || user.status !== "active") {
      return NextResponse.json({ error: "An active teacher account is required." }, { status: 403 });
    }

    const classId = clean(request.nextUrl.searchParams.get("classId"));
    const date = clean(request.nextUrl.searchParams.get("date"));
    if (!classId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "A valid class and date are required." }, { status: 400 });
    }

    const [classSnap, teachersSnap] = await Promise.all([
      adminDb().collection("classes").get(),
      adminDb().collection("teachers").get(),
    ]);
    const classes: ClassData[] = classSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) }));
    const selectedClass = resolveClass(classId, classes);
    if (!selectedClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const teachers = teachersSnap.docs.map((doc) => doc.data() as TeacherData);
    const teacher = teachers.find((item) => item.authUid === decoded.uid);
    if (!teacher) return NextResponse.json({ error: "Teacher record not found." }, { status: 404 });

    const formIdentifier = clean(teacher.formClassId) || clean(teacher.formMasterClassId) || clean(teacher.formMasterClassName);
    const formClass = resolveClass(formIdentifier, classes);
    const isFormMaster = formClass?.id === selectedClass.id;
    const secondary = isSecondaryClass(selectedClass);

    if (secondary && !isFormMaster) {
      return NextResponse.json({ error: "Only the Form Master can view attendance for JSS and SS classes." }, { status: 403 });
    }

    if (!secondary && !isFormMaster) {
      const assigned = strings(teacher.classIds)
        .map((value) => resolveClass(value, classes))
        .filter((item): item is ClassData => !!item);
      if (!assigned.some((item) => item.id === selectedClass.id)) {
        return NextResponse.json({ error: "You are not assigned to this class." }, { status: 403 });
      }

      const assignedTeacherCount = new Set(
        teachers.flatMap((item) => strings(item.classIds)
          .map((value) => resolveClass(value, classes)?.id)
          .filter((id): id is string => !!id))
      );
      const count = teachers.filter((item) =>
        new Set(strings(item.classIds).map((value) => resolveClass(value, classes)?.id).filter(Boolean))
          .has(selectedClass.id)
      ).length;
      if (count !== 1) {
        return NextResponse.json({ error: "You are not authorized to view attendance for this class." }, { status: 403 });
      }
    }

    const snapshot = await adminDb().collection("attendance")
      .where("classId", "==", selectedClass.id)
      .where("date", "==", date)
      .limit(1).get();

    if (snapshot.empty) return NextResponse.json({ attendance: null });
    const doc = snapshot.docs[0];
    return NextResponse.json({ attendance: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Teacher attendance read error:", error);
    return NextResponse.json({ error: "Could not load attendance." }, { status: 500 });
  }
}
