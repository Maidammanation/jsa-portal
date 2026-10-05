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

type ClassData = {
  id: string;
  name?: string;
  level?: string;
};

type TeacherData = {
  authUid?: string;
  classIds?: unknown;
  subjectIds?: unknown;
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string | null;
  canUploadAllResults?: boolean;
};

type SubjectData = {
  id: string;
  name?: string;
  levels?: unknown;
  section?: string;
  scoringType?: string;
};

type NormalizedResultEntry = {
  studentId: string;
  subjectId: string;
  classId: string;
  term: string;
  session: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
};

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalize(
  value: unknown
): string {
  return cleanString(value).toLowerCase();
}

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

/*
 * Resolve a class using either:
 *
 * 1. Firestore document ID
 * 2. Class name
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

/*
 * Determine the school's class level.
 *
 * Supported:
 * - pre-nursery
 * - nursery
 * - primary
 * - jss
 * - ss
 */
function getClassLevel(
  classroom: ClassData
): string {
  const value = (
    normalize(classroom.level) +
    " " +
    normalize(classroom.name)
  ).trim();

  if (
    value.includes("pre nursery") ||
    value.includes("pre-nursery") ||
    value.includes("prenursery")
  ) {
    return "pre-nursery";
  }

  if (value.includes("nursery")) {
    return "nursery";
  }

  if (value.includes("primary")) {
    return "primary";
  }

  if (
    value.includes("jss") ||
    value.includes("junior")
  ) {
    return "jss";
  }

  if (
    value.startsWith("ss") ||
    value.includes(" senior") ||
    value === "senior"
  ) {
    return "ss";
  }

  return "";
}

/*
 * Arabic:
 *
 * CA 40 + Exam 60
 */
function isArabicSubject(
  subject: SubjectData
): boolean {
  return (
    subject.section === "arabic" ||
    subject.scoringType === "arabic-40-60"
  );
}

function computeGrade(
  total: number
): string {
  if (total >= 75) return "A";
  if (total >= 65) return "B";
  if (total >= 55) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";

  return "F";
}

function computeRemark(
  grade: string
): string {
  switch (grade) {
    case "A":
      return "Excellent";

    case "B":
      return "Very Good";

    case "C":
      return "Good";

    case "D":
      return "Fair";

    case "E":
      return "Pass";

    default:
      return "Fail";
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =========================================================
     * 1. VERIFY SECURE FIREBASE SESSION
     * =========================================================
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
        {
          status: 401,
        }
      );
    }

    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    const db = adminDb();

    /*
     * =========================================================
     * 2. VERIFY AUTHORITATIVE USER PROFILE
     * =========================================================
     */

    const userDoc =
      await db
        .doc(
          `users/${decoded.uid}`
        )
        .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          error:
            "User profile was not found.",
        },
        {
          status: 404,
        }
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
            "Only teachers can submit results.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      userData.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Your teacher account is not active.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 3. READ REQUEST
     * =========================================================
     */

    const body =
      await request.json();

    const classId =
      cleanString(
        body.classId
      );

    const subjectId =
      cleanString(
        body.subjectId
      );

    const term =
      cleanString(
        body.term
      );

    const session =
      cleanString(
        body.session
      );

    const entries =
      body.entries;

    if (
      !classId ||
      !subjectId ||
      !term ||
      !session ||
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Class, subject, term, session and result entries are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================================
     * 4. RESULT CONTROL CENTRE
     * =========================================================
     *
     * OPEN:
     *     teachers can submit/edit.
     *
     * LOCKED:
     *     teachers cannot edit.
     *
     * PUBLISHED:
     *     teachers cannot edit.
     *
     * If the setting does not exist yet,
     * preserve the existing open behaviour.
     */

    const settingsDoc =
      await db
        .doc(
          "schoolSettings/current"
        )
        .get();

    const resultStatus =
      settingsDoc.data()
        ?.resultStatus;

    if (
      resultStatus &&
      resultStatus !== "open"
    ) {
      return NextResponse.json(
        {
          error:
            "Results are locked or published. Editing is disabled.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 5. LOAD CLASS, SUBJECT AND TEACHER
     * =========================================================
     */

    const [
      classDoc,
      subjectDoc,
      teacherQuery,
    ] = await Promise.all([
      db
        .doc(
          `classes/${classId}`
        )
        .get(),

      db
        .doc(
          `subjects/${subjectId}`
        )
        .get(),

      db
        .collection("teachers")
        .where(
          "authUid",
          "==",
          decoded.uid
        )
        .limit(1)
        .get(),
    ]);

    if (!classDoc.exists) {
      return NextResponse.json(
        {
          error:
            "The selected class could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!subjectDoc.exists) {
      return NextResponse.json(
        {
          error:
            "The selected subject could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    if (teacherQuery.empty) {
      return NextResponse.json(
        {
          error:
            "Your teacher record could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const classroom: ClassData = {
      id: classDoc.id,
      ...(classDoc.data() as Omit<
        ClassData,
        "id"
      >),
    };

    const subject: SubjectData = {
      id: subjectDoc.id,
      ...(subjectDoc.data() as Omit<
        SubjectData,
        "id"
      >),
    };

    const teacher =
      teacherQuery.docs[0]
        .data() as TeacherData;

    /*
     * =========================================================
     * 6. LOAD ALL CLASSES
     * =========================================================
     *
     * We need this because old teacher records
     * may store class names instead of IDs.
     */

    const allClasses =
      await db
        .collection("classes")
        .get();

    const classes: ClassData[] =
      allClasses.docs.map(
        (doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<
            ClassData,
            "id"
          >),
        })
      );

    /*
     * =========================================================
     * 7. RESOLVE TEACHER CLASS ASSIGNMENTS
     * =========================================================
     */

    const assignedClassIds =
      new Set<string>();

    for (
      const identifier of
        asStringArray(
          teacher.classIds
        )
    ) {
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

    /*
     * =========================================================
     * 8. RESOLVE FORM MASTER CLASS
     * =========================================================
     */

    const formMasterIdentifier =
      cleanString(
        teacher.formClassId
      ) ||
      cleanString(
        teacher.formMasterClassId
      ) ||
      cleanString(
        teacher.formMasterClassName
      );

    const formMasterClass =
      resolveClass(
        formMasterIdentifier,
        classes
      );

    const isFormMasterForSelectedClass =
      Boolean(
        formMasterClass &&
        formMasterClass.id ===
          classroom.id
      );

    /*
     * =========================================================
     * 9. CAN UPLOAD ALL RESULTS
     * =========================================================
     *
     * canUploadAllResults does NOT give a teacher
     * unrestricted access to every class.
     *
     * It gives elevated subject access for a class
     * the teacher is legitimately assigned to.
     *
     * This keeps the server aligned with the
     * frontend's Form Master/all-results logic.
     */

    const hasAllResultAccess =
      teacher.canUploadAllResults ===
      true;

    const isElevatedResultUploader =
      isFormMasterForSelectedClass ||
      (
        hasAllResultAccess &&
        assignedClassIds.has(
          classroom.id
        )
      );

    /*
     * =========================================================
     * 10. VERIFY CLASS ACCESS
     * =========================================================
     */

    if (
      !assignedClassIds.has(
        classroom.id
      ) &&
      !isFormMasterForSelectedClass
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this class.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 11. VERIFY SUBJECT ACCESS
     * =========================================================
     */

    const subjectIds =
      new Set(
        asStringArray(
          teacher.subjectIds
        )
      );

    /*
     * Normal teacher:
     * subject must be explicitly assigned.
     *
     * Form Master / elevated uploader:
     * subject assignment is not required.
     */
    if (
      !isElevatedResultUploader &&
      !subjectIds.has(
        subject.id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this subject.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 12. VERIFY SUBJECT LEVEL
     * =========================================================
     */

    const level =
      getClassLevel(
        classroom
      );

    const subjectLevels =
      Array.isArray(
        subject.levels
      )
        ? subject.levels.filter(
            (
              item
            ): item is string =>
              typeof item ===
              "string" &&
              item.trim() !== ""
          )
        : [];

    const subjectAppliesToClass =
      subjectLevels.length === 0 ||
      subjectLevels.some(
        (subjectLevel) =>
          normalize(
            subjectLevel
          ) ===
          normalize(level)
      );

    if (
      !subjectAppliesToClass
    ) {
      return NextResponse.json(
        {
          error:
            "This subject is not configured for the selected class.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 13. MUSIC IS EXCLUDED
     * =========================================================
     */

    if (
      normalize(
        subject.name
      ) === "music"
    ) {
      return NextResponse.json(
        {
          error:
            "Music is not available for result entry.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =========================================================
     * 14. VALIDATE EVERY RESULT ENTRY
     * =========================================================
     */

    const seenStudentIds =
      new Set<string>();

    const normalizedEntries:
      NormalizedResultEntry[] =
      [];

    for (
      const raw of entries
    ) {
      if (
        !raw ||
        typeof raw !== "object"
      ) {
        return NextResponse.json(
          {
            error:
              "One or more result entries are invalid.",
          },
          {
            status: 400,
          }
        );
      }

      const item =
        raw as Record<
          string,
          unknown
        >;

      const studentId =
        cleanString(
          item.studentId
        );

      /*
       * Every student must appear exactly once.
       */
      if (!studentId) {
        return NextResponse.json(
          {
            error:
              "A result entry is missing its student.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        seenStudentIds.has(
          studentId
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Each student must appear exactly once.",
          },
          {
            status: 400,
          }
        );
      }

      seenStudentIds.add(
        studentId
      );

      /*
       * =======================================================
       * VERIFY STUDENT
       * =======================================================
       */

      const studentDoc =
        await db
          .collection("students")
          .doc(studentId)
          .get();

      if (!studentDoc.exists) {
        return NextResponse.json(
          {
            error:
              "One or more students could not be found.",
          },
          {
            status: 403,
          }
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
          classroom.id ||
        studentClassId ===
          classroom.name ||
        studentClassName ===
          classroom.name;

      if (
        !belongsToClass
      ) {
        return NextResponse.json(
          {
            error:
              "One or more students do not belong to the selected class.",
          },
          {
            status: 403,
          }
        );
      }

      /*
       * =======================================================
       * SCORING
       * =======================================================
       *
       * Normal:
       * CA1 20 + CA2 20 + Exam 60
       *
       * Arabic:
       * CA 40 + Exam 60
       */

      const arabic =
        isArabicSubject(
          subject
        );

      const maxCa1 =
        arabic ? 40 : 20;

      const maxCa2 =
        arabic ? 0 : 20;

      const ca1 =
        Math.min(
          maxCa1,
          Math.max(
            0,
            Number(
              item.ca1
            ) || 0
          )
        );

      const ca2 =
        Math.min(
          maxCa2,
          Math.max(
            0,
            Number(
              item.ca2
            ) || 0
          )
        );

      const exam =
        Math.min(
          60,
          Math.max(
            0,
            Number(
              item.exam
            ) || 0
          )
        );

      /*
       * Server calculates the total.
       * Never trust total from the browser.
       */
      const total =
        ca1 +
        ca2 +
        exam;

      /*
       * Server calculates grade.
       * Never trust grade from the browser.
       */
      const grade =
        computeGrade(
          total
        );

      /*
       * Server calculates remark.
       * Never trust remark from the browser.
       */
      const remark =
        computeRemark(
          grade
        );

      normalizedEntries.push({
        studentId,
        subjectId:
          subject.id,
        classId:
          classroom.id,
        term,
        session,
        ca1,
        ca2,
        exam,
        total,
        grade,
        remark,
      });
    }

    /*
     * =========================================================
     * 15. UPSERT RESULTS
     * =========================================================
     */

    const batch =
      db.batch();

    for (
      const entry of
        normalizedEntries
    ) {
      /*
       * Existing result is identified by:
       *
       * student + subject + term + session
       *
       * This allows the same student to have
       * separate results for different subjects,
       * terms and sessions.
       */

      const existing =
        await db
          .collection("results")
          .where(
            "studentId",
            "==",
            entry.studentId
          )
          .where(
            "subjectId",
            "==",
            entry.subjectId
          )
          .where(
            "term",
            "==",
            entry.term
          )
          .where(
            "session",
            "==",
            entry.session
          )
          .limit(1)
          .get();

      const resultRef =
        existing.empty
          ? db
              .collection(
                "results"
              )
              .doc()
          : existing.docs[0]
              .ref;

      const resultData = {
        studentId:
          entry.studentId,

        subjectId:
          entry.subjectId,

        classId:
          entry.classId,

        term:
          entry.term,

        session:
          entry.session,

        ca1:
          entry.ca1,

        ca2:
          entry.ca2,

        exam:
          entry.exam,

        total:
          entry.total,

        grade:
          entry.grade,

        remark:
          entry.remark,

        updatedAt:
          new Date(),
      };

      if (existing.empty) {
        batch.set(
          resultRef,
          {
            ...resultData,
            createdAt:
              new Date(),
          }
        );
      } else {
        batch.set(
          resultRef,
          resultData,
          {
            merge: true,
          }
        );
      }
    }

    await batch.commit();

    /*
     * =========================================================
     * 16. ACTIVITY LOG
     * =========================================================
     */

    const actor =
      cleanString(
        userData.name
      ) ||
      cleanString(
        userData.email
      ) ||
      "teacher";

    const classLabel =
      classroom.name ||
      classroom.id;

    const subjectLabel =
      subject.name ||
      subject.id;

    const mode =
      isFormMasterForSelectedClass
        ? "Form Master"
        : hasAllResultAccess
        ? "Elevated Teacher"
        : "Subject Teacher";

    await db
      .collection(
        "activityLog"
      )
      .add({
        action:
          "Result uploaded",

        actor,

        details:
          `${classLabel} — ${subjectLabel} — ${normalizedEntries.length} student(s) — ${term} ${session} — ${mode}`,

        createdAt:
          new Date(),
      });

    /*
     * =========================================================
     * 17. SUCCESS
     * =========================================================
     */

    return NextResponse.json({
      ok: true,

      message:
        isFormMasterForSelectedClass
          ? "Results saved successfully by Form Master."
          : "Results saved successfully.",

      count:
        normalizedEntries.length,

      mode,
    });
  } catch (error) {
    console.error(
      "Could not submit teacher results:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save results.",
      },
      {
        status: 500,
      }
    );
  }
}