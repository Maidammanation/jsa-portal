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
  formMasterClassName?: string | null;
  status?: string;
};

type ClassData = {
  id: string;
  name?: string;
  level?: string;
};

type AttendanceRecord = {
  studentId: string;
  status:
    | "present"
    | "absent"
    | "late";
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

function normalize(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isAttendanceStatus(
  value: unknown
): value is
  | "present"
  | "absent"
  | "late" {
  return (
    value === "present" ||
    value === "absent" ||
    value === "late"
  );
}

/*
 * JSS1–JSS3 and SS1–SS3.
 */
function isSecondaryClass(
  classroom: ClassData
): boolean {
  const level = normalize(
    classroom.level
  );

  const name = normalize(
    classroom.name
  ).replace(/-/g, " ");

  const levelIsSecondary =
    level === "jss" ||
    level === "ss" ||
    level.includes("jss") ||
    level.includes("secondary");

  const nameIsSecondary =
    /^(jss|ss)\s*[1-3]$/.test(
      name
    );

  return (
    levelIsSecondary ||
    nameIsSecondary
  );
}

/*
 * Resolve either:
 * - class document ID
 * - class name
 */
function resolveClass(
  identifier: string,
  classes: ClassData[]
): ClassData | null {
  const value =
    normalize(identifier);

  if (!value) {
    return null;
  }

  return (
    classes.find(
      (classroom) =>
        normalize(classroom.id) ===
        value
    ) ||
    classes.find(
      (classroom) =>
        normalize(classroom.name) ===
        value
    ) ||
    null
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. Verify secure session.
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
     * 2. Verify user profile.
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

    if (
      userData.role !== "teacher"
    ) {
      return NextResponse.json(
        {
          error:
            "Only teachers can submit attendance.",
        },
        { status: 403 }
      );
    }

    if (
      userData.status !== "active"
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
     * 3. Read request.
     */
    const body =
      await request.json();

    const requestedClassId =
      cleanString(
        body.classId
      );

    const date =
      cleanString(
        body.date
      );

    const records =
      body.records;

    if (!requestedClassId) {
      return NextResponse.json(
        {
          error:
            "A class is required.",
        },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          error:
            "An attendance date is required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(records)) {
      return NextResponse.json(
        {
          error:
            "Attendance records are required.",
        },
        { status: 400 }
      );
    }

    /*
     * 4. Validate attendance records.
     */
    const normalizedRecords: AttendanceRecord[] =
      [];

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
        "studentId" in record
          ? cleanString(
              record.studentId
            )
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

      if (
        !isAttendanceStatus(
          status
        )
      ) {
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

    if (
      normalizedRecords.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one student attendance record is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Prevent duplicate students.
     */
    const uniqueStudentIds = [
      ...new Set(
        normalizedRecords.map(
          (record) =>
            record.studentId
        )
      ),
    ];

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
     * 5. Load classes and teachers.
     */
    const [
      classesSnapshot,
      teachersSnapshot,
    ] = await Promise.all([
      adminDb()
        .collection("classes")
        .get(),

      adminDb()
        .collection("teachers")
        .get(),
    ]);

    const classes: ClassData[] =
      classesSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...(doc.data() as {
            name?: string;
            level?: string;
          }),
        })
      );

    const teachers = teachersSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        data:
          doc.data() as TeacherData,
      })
    );

    /*
     * 6. Resolve selected class.
     */
    const selectedClass =
      resolveClass(
        requestedClassId,
        classes
      );

    if (!selectedClass) {
      return NextResponse.json(
        {
          error:
            "The selected class could not be found.",
        },
        { status: 404 }
      );
    }

    const classId =
      selectedClass.id;

    const className =
      cleanString(
        selectedClass.name
      );

    /*
     * 7. Find current teacher.
     */
    const currentTeacher =
      teachers.find(
        (teacher) =>
          teacher.data.authUid ===
          decoded.uid
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
     * 8. Resolve teacher's Form Master
     * class.
     */
    const formMasterIdentifier =
      typeof currentTeacher.data
        .formClassId === "string" &&
      currentTeacher.data.formClassId.trim()
        ? currentTeacher.data.formClassId
        : typeof currentTeacher.data
            .formMasterClassId ===
            "string" &&
          currentTeacher.data.formMasterClassId.trim()
        ? currentTeacher.data.formMasterClassId
        : typeof currentTeacher.data
            .formMasterClassName ===
            "string"
        ? currentTeacher.data.formMasterClassName
        : "";

    const formMasterClass =
      resolveClass(
        formMasterIdentifier,
        classes
      );

    const isFormMaster =
      Boolean(
        formMasterClass &&
        formMasterClass.id ===
          classId
      );

    /*
     * 9. Determine whether selected
     * class is JSS1–SS3 or SS1–SS3.
     */
    const secondaryClass =
      isSecondaryClass(
        selectedClass
      );

    /*
     * ==========================================================
     * HARD ATTENDANCE RULE
     * ==========================================================
     *
     * JSS1–SS3:
     * ONLY Form Master.
     *
     * This check happens BEFORE any
     * attendance is written.
     * ==========================================================
     */
    if (
      secondaryClass &&
      !isFormMaster
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Form Master can take attendance for JSS1 to SS3 classes.",
        },
        { status: 403 }
      );
    }

    /*
     * 10. For Nursery/Primary, preserve
     * the existing single-teacher rule.
     */
    if (!secondaryClass) {
      const teacherCountByClass: Record<
        string,
        number
      > = {};

      for (const teacher of teachers) {
        const identifiers =
          asStringArray(
            teacher.data.classIds
          );

        const uniqueClassIds =
          new Set<string>();

        for (const identifier of identifiers) {
          const resolved =
            resolveClass(
              identifier,
              classes
            );

          if (resolved) {
            uniqueClassIds.add(
              resolved.id
            );
          }
        }

        for (const resolvedClassId of uniqueClassIds) {
          teacherCountByClass[
            resolvedClassId
          ] =
            (teacherCountByClass[
              resolvedClassId
            ] || 0) + 1;
        }
      }

      const normalAssignments =
        asStringArray(
          currentTeacher.data.classIds
        );

      const assignedClassIds =
        new Set<string>();

      for (const identifier of normalAssignments) {
        const resolved =
          resolveClass(
            identifier,
            classes
          );

        if (resolved) {
          assignedClassIds.add(
            resolved.id
          );
        }
      }

      if (
        !assignedClassIds.has(
          classId
        ) &&
        !isFormMaster
      ) {
        return NextResponse.json(
          {
            error:
              "You are not assigned to this class.",
          },
          { status: 403 }
        );
      }

      const isOnlyTeacher =
        teacherCountByClass[
          classId
        ] === 1;

      if (
        !isFormMaster &&
        !isOnlyTeacher
      ) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to take attendance for this class.",
          },
          { status: 403 }
        );
      }
    } else {
      /*
       * Secondary teachers must also be
       * the Form Master.
       */
      if (!isFormMaster) {
        return NextResponse.json(
          {
            error:
              "Only the Form Master can take attendance for JSS1 to SS3 classes.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * 11. Validate every submitted student
     * belongs to the selected class.
     */
    for (const studentId of uniqueStudentIds) {
      const studentDoc =
        await adminDb()
          .collection("students")
          .doc(studentId)
          .get();

      if (!studentDoc.exists) {
        return NextResponse.json(
          {
            error:
              "One or more selected students could not be found.",
          },
          { status: 403 }
        );
      }

      const student =
        studentDoc.data() || {};

      const studentClassId =
        cleanString(
          student.classId
        );

      const studentClassName =
        cleanString(
          student.className
        );

      const belongsToClass =
        studentClassId ===
          classId ||
        studentClassId ===
          className ||
        studentClassName ===
          className;

      if (!belongsToClass) {
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
     * 12. Find existing attendance.
     */
    const attendanceQuery =
      await adminDb()
        .collection("attendance")
        .where(
          "classId",
          "==",
          classId
        )
        .where(
          "date",
          "==",
          date
        )
        .limit(1)
        .get();

    const takenBy =
      cleanString(
        userData.name
      ) ||
      cleanString(
        userData.email
      ) ||
      "teacher";

    if (
      !attendanceQuery.empty
    ) {
      const attendanceDoc =
        attendanceQuery.docs[0];

      await attendanceDoc.ref.update({
        records:
          normalizedRecords,
        takenBy,
        updatedAt:
          new Date(),
      });
    } else {
      await adminDb()
        .collection("attendance")
        .add({
          classId,
          className:
            className || null,
          date,
          records:
            normalizedRecords,
          takenBy,
          createdAt:
            new Date(),
        });
    }

    /*
     * 13. Activity log.
     */
    await adminDb()
      .collection("activityLog")
      .add({
        action:
          "Attendance submitted",
        actor: takenBy,
        details:
          `${className || classId} — ${normalizedRecords.length} student(s) — ${date}`,
        createdAt:
          new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Attendance submitted successfully.",
    });
  } catch (error) {
    console.error(
      "Could not submit attendance:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not submit attendance.",
      },
      { status: 500 }
    );
  }
}