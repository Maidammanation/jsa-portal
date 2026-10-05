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

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim() !== ""
    )
    .map((item) => item.trim());
}

function resolveClass(
  identifier: string,
  classes: ClassData[]
): ClassData | null {
  const value = normalize(identifier);

  if (!value) return null;

  return (
    classes.find(
      (item) => normalize(item.id) === value
    ) ||
    classes.find(
      (item) => normalize(item.name) === value
    ) ||
    null
  );
}

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

function isArabicSubject(
  subject: SubjectData
): boolean {
  return (
    subject.section === "arabic" ||
    subject.scoringType === "arabic-40-60"
  );
}

function computeGrade(total: number): string {
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
     * 1. Verify secure Firebase session.
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

    const db = adminDb();

    /*
     * 2. Verify authoritative user profile.
     */
    const userDoc = await db
      .doc(
        "users/" + decoded.uid
      )
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
      userData.role !== "teacher" ||
      userData.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active teachers can submit results.",
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

    const subjectId =
      cleanString(body.subjectId);

    const term =
      cleanString(body.term);

    const session =
      cleanString(body.session);

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
        { status: 400 }
      );
    }

    /*
     * 4. Enforce Result Control Centre.
     *
     * OPEN      = teachers can enter/edit
     * LOCKED    = no teacher editing
     * PUBLISHED = no teacher editing
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
        { status: 403 }
      );
    }

    /*
     * 5. Load class, subject and teacher.
     */
    const [
      classDoc,
      subjectDoc,
      teacherQuery,
    ] = await Promise.all([
      db
        .doc(
          "classes/" + classId
        )
        .get(),

      db
        .doc(
          "subjects/" + subjectId
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
        { status: 404 }
      );
    }

    if (!subjectDoc.exists) {
      return NextResponse.json(
        {
          error:
            "The selected subject could not be found.",
        },
        { status: 404 }
      );
    }

    if (teacherQuery.empty) {
      return NextResponse.json(
        {
          error:
            "Your teacher record could not be found.",
        },
        { status: 404 }
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
      teacherQuery.docs[0].data() as TeacherData;

    /*
     * 6. Resolve Form Master.
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

    const formMasterClass =
      resolveClass(
        formMasterIdentifier,
        classes
      );

    const isFormMaster =
      Boolean(
        formMasterClass &&
        formMasterClass.id ===
          classroom.id
      );

    /*
     * 7. Verify teacher class assignment.
     */
    const assignedClassIds =
      new Set<string>();

    for (
      const identifier of asStringArray(
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
     * Form Master is automatically
     * allowed for their own class.
     */
    if (
      !isFormMaster &&
      !assignedClassIds.has(
        classroom.id
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
     * 8. Verify subject assignment.
     */
    const subjectIds =
      new Set(
        asStringArray(
          teacher.subjectIds
        )
      );

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
              "string"
          )
        : [];

    const subjectAppliesToClass =
      subjectLevels.length === 0 ||
      subjectLevels.includes(
        level
      );

    /*
     * Form Master can upload all
     * results for their Form Master class.
     */
    if (
      !isFormMaster &&
      !subjectIds.has(
        subject.id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this subject.",
        },
        { status: 403 }
      );
    }

    if (
      !subjectAppliesToClass
    ) {
      return NextResponse.json(
        {
          error:
            "This subject is not configured for the selected class.",
        },
        { status: 403 }
      );
    }

    /*
     * Music remains excluded.
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
        { status: 403 }
      );
    }

    /*
     * 9. Validate and normalize
     * every student result.
     */
    const seen =
      new Set<string>();

    const normalizedEntries:
      Array<{
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
      }> = [];

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
          { status: 400 }
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

      if (
        !studentId ||
        seen.has(studentId)
      ) {
        return NextResponse.json(
          {
            error:
              "Each student must appear exactly once.",
          },
          { status: 400 }
        );
      }

      seen.add(studentId);

      /*
       * Verify student exists.
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

      /*
       * Student must actually belong
       * to the selected class.
       */
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
          { status: 403 }
        );
      }

      /*
       * 10. Enforce scoring limits.
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

      const total =
        ca1 +
        ca2 +
        exam;

      const grade =
        computeGrade(
          total
        );

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
     * 11. Upsert results.
     */
    const batch =
      db.batch();

    for (
      const entry of
        normalizedEntries
    ) {
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

      const ref =
        existing.empty
          ? db
              .collection(
                "results"
              )
              .doc()
          : existing.docs[0]
              .ref;

      batch.set(
        ref,
        {
          ...entry,
          updatedAt:
            new Date(),
          ...(existing.empty
            ? {
                createdAt:
                  new Date(),
              }
            : {}),
        },
        {
          merge: true,
        }
      );
    }

    await batch.commit();

    /*
     * 12. Activity log.
     */
    const actor =
      cleanString(
        userData.name
      ) ||
      cleanString(
        userData.email
      ) ||
      "teacher";

    await db
      .collection(
        "activityLog"
      )
      .add({
        action:
          "Result uploaded",
        actor,
        details:
          (classroom.name ||
            classroom.id) +
          " — " +
          (subject.name ||
            subject.id) +
          " — " +
          normalizedEntries.length +
          " student(s) — " +
          term +
          " " +
          session,
        createdAt:
          new Date(),
      });

    return NextResponse.json({
      ok: true,
      message:
        "Results saved successfully.",
      count:
        normalizedEntries.length,
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
      { status: 500 }
    );
  }
}