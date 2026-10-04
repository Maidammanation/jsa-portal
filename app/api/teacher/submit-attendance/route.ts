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

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. Verify session.
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

    if (userData.role !== "teacher") {
      return NextResponse.json(
        {
          error:
            "Only teachers can submit attendance.",
        },
        { status: 403 }
      );
    }

    if (
      userData.status ===
        "suspended" ||
      userData.status ===
        "disabled"
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

    const classId =
      cleanString(body.classId);

    const date =
      cleanString(body.date);

    const records =
      body.records;

    if (!classId) {
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
     * 4. Validate records.
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
      normalizedRecords.length === 0
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
     * 5. Load teachers.
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
      return NextResponse.json(
        {
          error:
            "Your teacher record could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * 6. Determine effective teacher classes.
     */
    const currentClassIds =
      asStringArray(
        currentTeacher.data.classIds
      );

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
     * Teacher must have the class.
     */
    if (
      !effectiveClassIds.has(
        classId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this class.",
        },
        { status: 403 }
      );
    }

    /*
     * 7. Count teachers assigned to
     * normal classIds.
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
     * 8. Form Master permission.
     */
    const isFormMaster =
      Boolean(
        formMasterClassId
      ) &&
      classId ===
        formMasterClassId;

    /*
     * 9. Single-teacher permission.
     */
    const isOnlyTeacher =
      teacherCountByClass[
        classId
      ] === 1;

    /*
     * Must be Form Master OR sole teacher.
     */
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

    /*
     * 10. Resolve class name.
     */
    let className = "";

    try {
      const classDoc =
        await adminDb()
          .collection("classes")
          .doc(classId)
          .get();

      if (classDoc.exists) {
        className =
          cleanString(
            classDoc.data()?.name
          );
      }
    } catch (error) {
      console.warn(
        "Could not resolve class name:",
        error
      );
    }

    /*
     * If class ID itself was actually a
     * class name, try resolving by name.
     */
    if (!className) {
      try {
        const classByName =
          await adminDb()
            .collection("classes")
            .where(
              "name",
              "==",
              classId
            )
            .limit(1)
            .get();

        if (
          !classByName.empty
        ) {
          className =
            cleanString(
              classByName.docs[0].data()
                .name
            );
        }
      } catch (error) {
        console.warn(
          "Could not resolve class by name:",
          error
        );
      }
    }

    /*
     * 11. Load submitted students individually.
     *
     * We deliberately do NOT depend on one
     * Firestore query here because older student
     * records may use either classId or className.
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
        Boolean(
          className &&
            studentClassId ===
              className
        ) ||
        Boolean(
          className &&
            studentClassName ===
              className
        );

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
          `${normalizedRecords.length} student(s) — ${date}`,
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