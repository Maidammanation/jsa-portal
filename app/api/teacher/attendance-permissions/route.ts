import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";

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

function asStringArray(value: unknown): string[] {
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

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

/*
 * JSS1–JSS3 and SS1–SS3 are Secondary classes.
 *
 * We deliberately identify the actual class rather than
 * trusting a teacher's stored class ID alone.
 */
function isSecondaryClass(
  classroom: ClassData
): boolean {
  const level = normalize(
    classroom.level
  );

  const name = normalize(
    classroom.name
  );

  const levelIsSecondary =
    level === "jss" ||
    level === "ss" ||
    level.includes("jss") ||
    level.includes("secondary");

  const nameIsSecondary =
    /^(jss|ss)\s*[1-3]$/.test(
      name.replace(/-/g, " ")
    );

  return (
    levelIsSecondary ||
    nameIsSecondary
  );
}

/*
 * Resolve an assignment stored either as:
 *
 * - Firestore class document ID
 * - class name
 */
function resolveClass(
  identifier: string,
  classes: ClassData[]
): ClassData | null {
  const value = normalize(identifier);

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

function emptyPermissions() {
  return {
    canMarkAttendance: false,
    attendanceClassIds: [],
    formMasterClassId: "",
    isFormMaster: false,
    singleTeacherClassIds: [],
  };
}

export async function GET(
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
          error: "Not authenticated.",
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
     * 2. Verify user account.
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
        emptyPermissions()
      );
    }

    if (
      userData.status !== "active"
    ) {
      return NextResponse.json(
        emptyPermissions()
      );
    }

    /*
     * 3. Load all classes and teachers.
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
     * 4. Find current teacher.
     */
    const currentTeacher =
      teachers.find(
        (teacher) =>
          teacher.data.authUid ===
          decoded.uid
      );

    if (!currentTeacher) {
      return NextResponse.json(
        emptyPermissions()
      );
    }

    /*
     * 5. Resolve this teacher's normal
     * class assignments.
     */
    const normalAssignments =
      asStringArray(
        currentTeacher.data.classIds
      );

    const resolvedNormalClasses =
      normalAssignments
        .map((identifier) =>
          resolveClass(
            identifier,
            classes
          )
        )
        .filter(
          (
            classroom
          ): classroom is ClassData =>
            Boolean(classroom)
        );

    /*
     * 6. Resolve Form Master assignment.
     *
     * Support both old and new fields.
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

    const formMasterClassId =
      formMasterClass?.id || "";

    /*
     * 7. Resolve every teacher's normal
     * assigned class to a real class ID.
     *
     * This also supports older records where
     * classIds contains class names.
     */
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
        const classroom =
          resolveClass(
            identifier,
            classes
          );

        if (classroom) {
          uniqueClassIds.add(
            classroom.id
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

    /*
     * 8. Determine attendance permission.
     *
     * HARD RULE:
     *
     * JSS1–SS3:
     * ONLY Form Master.
     *
     * Nursery/Primary:
     * Form Master OR sole teacher.
     */
    const attendanceClassIds =
      new Set<string>();

    const singleTeacherClassIds: string[] =
      [];

    for (const classroom of resolvedNormalClasses) {
      const secondary =
        isSecondaryClass(
          classroom
        );

      const isFormMaster =
        classroom.id ===
        formMasterClassId;

      const isOnlyTeacher =
        teacherCountByClass[
          classroom.id
        ] === 1;

      if (secondary) {
        /*
         * JSS1–SS3 / SS1–SS3:
         * ONLY Form Master.
         */
        if (isFormMaster) {
          attendanceClassIds.add(
            classroom.id
          );
        }
      } else {
        /*
         * Nursery/Primary:
         * Preserve existing behaviour.
         */
        if (isFormMaster) {
          attendanceClassIds.add(
            classroom.id
          );
        }

        if (isOnlyTeacher) {
          attendanceClassIds.add(
            classroom.id
          );

          singleTeacherClassIds.push(
            classroom.id
          );
        }
      }
    }

    /*
     * A Form Master class must always be
     * included, even if it was not inside
     * classIds.
     */
    if (formMasterClass) {
      attendanceClassIds.add(
        formMasterClass.id
      );
    }

    /*
     * For secondary classes, remove every
     * secondary class except the Form Master
     * class.
     */
    for (const classroom of classes) {
      if (
        isSecondaryClass(
          classroom
        ) &&
        classroom.id !==
          formMasterClassId
      ) {
        attendanceClassIds.delete(
          classroom.id
        );
      }
    }

    const finalAttendanceClassIds =
      Array.from(
        attendanceClassIds
      );

    return NextResponse.json({
      canMarkAttendance:
        finalAttendanceClassIds.length >
        0,

      attendanceClassIds:
        finalAttendanceClassIds,

      formMasterClassId,

      isFormMaster:
        Boolean(formMasterClassId),

      singleTeacherClassIds:
        singleTeacherClassIds.filter(
          (classId) =>
            !isSecondaryClass(
              classes.find(
                (item) =>
                  item.id ===
                  classId
              ) || {
                id: classId,
              }
            )
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