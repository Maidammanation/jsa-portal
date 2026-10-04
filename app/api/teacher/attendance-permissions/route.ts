import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME =
  "jsa_session";

type TeacherData = {
  authUid?: string;
  classIds?: unknown;
  formClassId?: string | null;
  formMasterClassId?: string | null;
  status?: string;
};

function asStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim() !== ""
    )
    .map((item) => item.trim());
}

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * Secure session verification.
     */
    const sessionCookie =
      request.cookies.get(
        SESSION_COOKIE_NAME
      )?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    /*
     * Verify user account.
     */
    const userDoc =
      await adminDb()
        .doc(`users/${decoded.uid}`)
        .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          error:
            "User profile was not found.",
        },
        { status: 404 }
      );
    }

    const userData =
      userDoc.data() || {};

    if (userData.role !== "teacher") {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
        isFormMaster: false,
        singleTeacherClassIds: [],
      });
    }

    if (
      userData.status ===
        "suspended" ||
      userData.status ===
        "disabled"
    ) {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
        isFormMaster: false,
        singleTeacherClassIds: [],
      });
    }

    /*
     * Load teachers.
     */
    const teachersSnapshot =
      await adminDb()
        .collection("teachers")
        .get();

    const teachers = teachersSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        data:
          doc.data() as TeacherData,
      })
    );

    /*
     * Find current teacher.
     */
    const currentTeacher =
      teachers.find(
        (teacher) =>
          teacher.data.authUid ===
          decoded.uid
      );

    if (!currentTeacher) {
      return NextResponse.json({
        canMarkAttendance: false,
        attendanceClassIds: [],
        formMasterClassId: "",
        isFormMaster: false,
        singleTeacherClassIds: [],
      });
    }

    /*
     * Teacher's normal assigned classes.
     */
    const currentClassIds =
      asStringArray(
        currentTeacher.data.classIds
      );

    /*
     * Form Master assignment.
     *
     * We support BOTH fields because older
     * teacher records may use either one.
     */
    const formMasterClassId =
      typeof currentTeacher.data
        .formClassId === "string" &&
      currentTeacher.data.formClassId.trim()
        ? currentTeacher.data.formClassId.trim()
        : typeof currentTeacher.data
            .formMasterClassId ===
            "string" &&
          currentTeacher.data.formMasterClassId.trim()
        ? currentTeacher.data.formMasterClassId.trim()
        : "";

    /*
     * Effective classes:
     *
     * classIds
     * +
     * formClassId
     * +
     * formMasterClassId
     */
    const effectiveClassIds =
      new Set<string>(
        currentClassIds
      );

    if (formMasterClassId) {
      effectiveClassIds.add(
        formMasterClassId
      );
    }

    /*
     * Count teachers assigned to each
     * normal class.
     */
    const teacherCountByClass: Record<
      string,
      number
    > = {};

    for (const teacher of teachers) {
      const classIds =
        asStringArray(
          teacher.data.classIds
        );

      for (const classId of classIds) {
        teacherCountByClass[classId] =
          (teacherCountByClass[
            classId
          ] || 0) + 1;
      }
    }

    /*
     * Attendance classes:
     *
     * 1. Form Master class
     * 2. Single-teacher classes
     */
    const attendanceClassIds =
      Array.from(
        effectiveClassIds
      ).filter((classId) => {
        const isFormMaster =
          classId ===
          formMasterClassId;

        const isOnlyTeacher =
          teacherCountByClass[
            classId
          ] === 1;

        return (
          isFormMaster ||
          isOnlyTeacher
        );
      });

    /*
     * Make absolutely sure the Form Master
     * class is included.
     */
    if (
      formMasterClassId &&
      !attendanceClassIds.includes(
        formMasterClassId
      )
    ) {
      attendanceClassIds.push(
        formMasterClassId
      );
    }

    /*
     * Resolve whether this teacher is
     * actually a Form Master.
     */
    const isFormMaster =
      Boolean(
        formMasterClassId
      );

    return NextResponse.json({
      canMarkAttendance:
        attendanceClassIds.length >
        0,

      attendanceClassIds,

      formMasterClassId,

      isFormMaster,

      singleTeacherClassIds:
        currentClassIds.filter(
          (classId) =>
            teacherCountByClass[
              classId
            ] === 1
        ),
    });
  } catch (error) {
    console.error(
      "Attendance permission error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not determine attendance permissions.",
      },
      { status: 500 }
    );
  }
}