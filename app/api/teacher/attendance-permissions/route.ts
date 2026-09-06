import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "jsa_session";

type TeacherData = {
  authUid?: string;
  classIds?: unknown;
  formClassId?: string | null;
  formMasterClassId?: string | null;
  status?: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim() !== ""
  );
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie =
      request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decoded = await adminAuth().verifySessionCookie(
      sessionCookie,
      true
    );

    const userRef = adminDb().doc(`users/${decoded.uid}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile was not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};

    if (userData.role !== "teacher") {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
      });
    }

    if (
      userData.status === "suspended" ||
      userData.status === "disabled"
    ) {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
      });
    }

    const teachersSnapshot = await adminDb()
      .collection("teachers")
      .get();

    const teachers: {
      id: string;
      data: TeacherData;
    }[] = teachersSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as TeacherData,
    }));

    const currentTeacher = teachers.find(
      (teacher) =>
        teacher.data.authUid === decoded.uid
    );

    if (!currentTeacher) {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
      });
    }

    const currentClassIds = asStringArray(
      currentTeacher.data.classIds
    );

    /*
     * Count how many teachers are assigned to each class.
     *
     * This is important because:
     * - Nursery/Primary single-teacher classes can mark attendance.
     * - JSS/SS classes with multiple teachers cannot be marked
     *   by ordinary subject teachers.
     */
    const teacherCountByClass: Record<string, number> = {};

    for (const teacher of teachers) {
      const classIds = asStringArray(
        teacher.data.classIds
      );

      for (const classId of classIds) {
        teacherCountByClass[classId] =
          (teacherCountByClass[classId] || 0) + 1;
      }
    }

    /*
     * A teacher may mark attendance for a class when:
     *
     * 1. They are the Form Master of that class, OR
     * 2. They are the only teacher assigned to that class.
     */
    const formMasterClassId =
      currentTeacher.data.formClassId ||
      currentTeacher.data.formMasterClassId ||
      "";

    const attendanceClassIds = currentClassIds.filter(
      (classId) => {
        const isFormMaster =
          classId === formMasterClassId;

        const isOnlyTeacher =
          teacherCountByClass[classId] === 1;

        return isFormMaster || isOnlyTeacher;
      }
    );

    /*
     * Make sure the Form Master class is included even if
     * it is not present in classIds.
     */
    if (
      formMasterClassId &&
      !attendanceClassIds.includes(
        formMasterClassId
      )
    ) {
      attendanceClassIds.push(formMasterClassId);
    }

    return NextResponse.json({
      canMarkAttendance:
        attendanceClassIds.length > 0,

      attendanceClassIds,

      formMasterClassId,

      isFormMaster:
        Boolean(formMasterClassId),

      singleTeacherClassIds:
        currentClassIds.filter(
          (classId) =>
            teacherCountByClass[classId] === 1
        ),
    });
  } catch (err) {
    console.error(
      "Could not determine attendance permissions:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not determine attendance permissions.",
      },
      { status: 500 }
    );
  }
}