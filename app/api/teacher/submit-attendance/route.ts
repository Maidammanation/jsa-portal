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

type AttendanceRecord = {
  studentId: string;
  status: "present" | "absent" | "late";
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim() !== ""
  );
}

function isAttendanceStatus(
  value: unknown
): value is "present" | "absent" | "late" {
  return (
    value === "present" ||
    value === "absent" ||
    value === "late"
  );
}

export async function POST(request: NextRequest) {
  try {
    /*
     * 1. Verify secure server session.
     */
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

    /*
     * 2. Verify the logged-in user's profile.
     */
    const userRef = adminDb().doc(
      `users/${decoded.uid}`
    );

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile was not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};

    /*
     * Only teachers can use this endpoint.
     */
    if (userData.role !== "teacher") {
      return NextResponse.json(
        {
          error:
            "Only teachers can submit attendance through this endpoint.",
        },
        { status: 403 }
      );
    }

    /*
     * Suspended/disabled teachers cannot submit attendance.
     */
    if (
      userData.status === "suspended" ||
      userData.status === "disabled"
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is not permitted to submit attendance.",
        },
        { status: 403 }
      );
    }

    /*
     * 3. Read the requested attendance data.
     */
    const body = await request.json();

    const {
      classId,
      date,
      records,
    } = body;

    if (
      typeof classId !== "string" ||
      !classId.trim()
    ) {
      return NextResponse.json(
        { error: "A class is required." },
        { status: 400 }
      );
    }

    if (
      typeof date !== "string" ||
      !date.trim()
    ) {
      return NextResponse.json(
        { error: "An attendance date is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Attendance records are required." },
        { status: 400 }
      );
    }

    /*
     * 4. Validate every attendance record.
     */
    const normalizedRecords: AttendanceRecord[] = [];

    for (const record of records) {
      if (
        !record ||
        typeof record !== "object"
      ) {
        return NextResponse.json(
          {
            error:
              "One or more attendance records are invalid.",
          },
          { status: 400 }
        );
      }

      const studentId =
        "studentId" in record &&
        typeof record.studentId === "string"
          ? record.studentId.trim()
          : "";

      const status =
        "status" in record
          ? record.status
          : undefined;

      if (!studentId) {
        return NextResponse.json(
          {
            error:
              "Every attendance record must contain a student ID.",
          },
          { status: 400 }
        );
      }

      if (!isAttendanceStatus(status)) {
        return NextResponse.json(
          {
            error:
              "Attendance status must be present, absent, or late.",
          },
          { status: 400 }
        );
      }

      normalizedRecords.push({
        studentId,
        status,
      });
    }

    if (normalizedRecords.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one student attendance record is required.",
        },
        { status: 400 }
      );
    }

    /*
     * 5. Load all teacher records.
     *
     * We intentionally verify permissions on the server
     * instead of trusting the browser.
     */
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

    /*
     * Find the currently authenticated teacher.
     */
    const currentTeacher = teachers.find(
      (teacher) =>
        teacher.data.authUid === decoded.uid
    );

    if (!currentTeacher) {
      return NextResponse.json(
        {
          error:
            "Your teacher record could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * 6. Determine the classes assigned to this teacher.
     */
    const currentClassIds = asStringArray(
      currentTeacher.data.classIds
    );

    if (!currentClassIds.includes(classId)) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this class.",
        },
        { status: 403 }
      );
    }

    /*
     * 7. Count how many teachers are assigned
     * to each class.
     */
    const teacherCountByClass: Record<
      string,
      number
    > = {};

    for (const teacher of teachers) {
      const classIds = asStringArray(
        teacher.data.classIds
      );

      for (const assignedClassId of classIds) {
        teacherCountByClass[
          assignedClassId
        ] =
          (teacherCountByClass[
            assignedClassId
          ] || 0) + 1;
      }
    }

    /*
     * 8. Determine Form Master class.
     */
    const formMasterClassId =
      currentTeacher.data.formClassId ||
      currentTeacher.data.formMasterClassId ||
      "";

    const isFormMaster =
      Boolean(formMasterClassId) &&
      classId === formMasterClassId;

    /*
     * 9. Determine whether this teacher is the
     * sole teacher assigned to this class.
     */
    const isOnlyTeacher =
      teacherCountByClass[classId] === 1;

    /*
     * Attendance is permitted only when:
     *
     * A. Teacher is Form Master for this class
     * OR
     * B. Teacher is the only teacher assigned
     *    to this class.
     */
    if (!isFormMaster && !isOnlyTeacher) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to take attendance for this class.",
        },
        { status: 403 }
      );
    }

    /*
     * 10. Verify every student belongs to the
     * requested class.
     *
     * This prevents a teacher from submitting
     * attendance for students from another class.
     */
    const studentIds = normalizedRecords.map(
      (record) => record.studentId
    );

    const uniqueStudentIds = [
      ...new Set(studentIds),
    ];

    const studentsSnapshot = await adminDb()
      .collection("students")
      .where("classId", "==", classId)
      .get();

    const validStudentIds = new Set(
      studentsSnapshot.docs.map(
        (doc) => doc.id
      )
    );

    for (const studentId of uniqueStudentIds) {
      if (!validStudentIds.has(studentId)) {
        return NextResponse.json(
          {
            error:
              "One or more students do not belong to the selected class.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * 11. Prevent duplicate student entries.
     */
    if (
      uniqueStudentIds.length !==
      normalizedRecords.length
    ) {
      return NextResponse.json(
        {
          error:
            "Duplicate student attendance records are not allowed.",
        },
        { status: 400 }
      );
    }

    /*
     * 12. Find an existing attendance session.
     */
    const attendanceQuery = await adminDb()
      .collection("attendance")
      .where("classId", "==", classId)
      .where("date", "==", date)
      .get();

    const takenBy =
      userData.name ||
      userData.email ||
      "teacher";

    if (!attendanceQuery.empty) {
      /*
       * Update existing attendance.
       */
      const attendanceDoc =
        attendanceQuery.docs[0];

      await attendanceDoc.ref.update({
        records: normalizedRecords,
        takenBy,
      });
    } else {
      /*
       * Create new attendance session.
       */
      await adminDb()
        .collection("attendance")
        .add({
          classId,
          date,
          records: normalizedRecords,
          takenBy,
        });
    }

    /*
     * 13. Activity log.
     */
    await adminDb()
      .collection("activityLog")
      .add({
        action: "Attendance submitted",
        actor: takenBy,
        details:
          `${normalizedRecords.length} student(s) — ${date}`,
        createdAt: new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Attendance submitted successfully.",
    });
  } catch (err) {
    console.error(
      "Could not submit attendance securely:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not submit attendance.",
      },
      { status: 500 }
    );
  }
}