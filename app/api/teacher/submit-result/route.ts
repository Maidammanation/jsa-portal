import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { createHash } from "crypto";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebaseAdmin";

import {
  getClassLevel,
  subjectAppliesToClass,
} from "@/lib/curriculum";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "jsa_session";
const MAX_RESULT_ENTRIES = 450;

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

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalize(value: unknown): string {
  return cleanString(value).toLowerCase();
}

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

class ResultValidationError extends Error {}

function readScore(
  value: unknown,
  label: string,
  maximum: number
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" &&
          value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new ResultValidationError(
      `${label} must be a valid number.`
    );
  }

  if (parsed < 0 || parsed > maximum) {
    throw new ResultValidationError(
      `${label} must be between 0 and ${maximum}.`
    );
  }

  return parsed;
}

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
        normalize(classroom.id) === value
    ) ||
    classes.find(
      (classroom) =>
        normalize(classroom.name) === value
    ) ||
    null
  );
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
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";

  return "F";
}

function computeRemark(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Pass";
    case "E":
      return "Pass";
    default:
      return "Fail";
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify secure Firebase session.
    const sessionCookie = request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth().verifySessionCookie(
        sessionCookie,
        true
      );

    const db = adminDb();

    // 2. Verify authoritative user profile.
    const userDoc = await db
      .doc(`users/${decoded.uid}`)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile was not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};

    if (userData.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can submit results." },
        { status: 403 }
      );
    }

    if (userData.status !== "active") {
      return NextResponse.json(
        { error: "Your teacher account is not active." },
        { status: 403 }
      );
    }

    // 3. Read and validate request.
    const body = await request.json();

    const classId = cleanString(body.classId);
    const subjectId = cleanString(body.subjectId);
    const term = cleanString(body.term);
    const session = cleanString(body.session);
    const entries = body.entries;

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

    if (entries.length > MAX_RESULT_ENTRIES) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_RESULT_ENTRIES} students can be submitted at once. Please split the class into smaller uploads.`,
        },
        { status: 400 }
      );
    }

    // 4. Check Result Control Centre.
    const settingsDoc = await db
      .doc("schoolSettings/current")
      .get();

    const resultStatus =
      settingsDoc.data()?.resultStatus;

    if (resultStatus && resultStatus !== "open") {
      return NextResponse.json(
        {
          error:
            "Results are locked or published. Editing is disabled.",
        },
        { status: 403 }
      );
    }

    // 5. Load class, subject and teacher.
    const [
      classDoc,
      subjectDoc,
      teacherQuery,
    ] = await Promise.all([
      db.doc(`classes/${classId}`).get(),
      db.doc(`subjects/${subjectId}`).get(),
      db
        .collection("teachers")
        .where("authUid", "==", decoded.uid)
        .limit(1)
        .get(),
    ]);

    if (!classDoc.exists) {
      return NextResponse.json(
        { error: "The selected class could not be found." },
        { status: 404 }
      );
    }

    if (!subjectDoc.exists) {
      return NextResponse.json(
        { error: "The selected subject could not be found." },
        { status: 404 }
      );
    }

    if (teacherQuery.empty) {
      return NextResponse.json(
        { error: "Your teacher record could not be found." },
        { status: 404 }
      );
    }

    const classroom: ClassData = {
      id: classDoc.id,
      ...(classDoc.data() as Omit<ClassData, "id">),
    };

    const subject: SubjectData = {
      id: subjectDoc.id,
      ...(subjectDoc.data() as Omit<SubjectData, "id">),
    };

    const teacher =
      teacherQuery.docs[0].data() as TeacherData;

    if (teacher.status && teacher.status !== "active") {
      return NextResponse.json(
        { error: "Your teacher record is not active." },
        { status: 403 }
      );
    }

    // 6. Load all classes for legacy name-based assignments.
    const allClasses = await db
      .collection("classes")
      .get();

    const classes: ClassData[] = allClasses.docs.map(
      (doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ClassData, "id">),
      })
    );

    // 7. Resolve teacher class assignments.
    const assignedClassIds = new Set<string>();

    for (const identifier of asStringArray(teacher.classIds)) {
      const resolved = resolveClass(identifier, classes);

      if (resolved) {
        assignedClassIds.add(resolved.id);
      }
    }

    // 8. Resolve Form Master class.
    const formMasterIdentifier =
      cleanString(teacher.formClassId) ||
      cleanString(teacher.formMasterClassId) ||
      cleanString(teacher.formMasterClassName);

    const formMasterClass = resolveClass(
      formMasterIdentifier,
      classes
    );

    const isFormMasterForSelectedClass = Boolean(
      formMasterClass &&
      formMasterClass.id === classroom.id
    );

    // 9. Determine elevated result access.
    const hasAllResultAccess =
      teacher.canUploadAllResults === true;

    const isElevatedResultUploader =
      isFormMasterForSelectedClass ||
      (
        hasAllResultAccess &&
        assignedClassIds.has(classroom.id)
      );

    // 10. Verify class access.
    if (
      !assignedClassIds.has(classroom.id) &&
      !isFormMasterForSelectedClass
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this class." },
        { status: 403 }
      );
    }

    // 11. Verify subject access.
    const subjectIds = new Set(
      asStringArray(teacher.subjectIds)
    );

    if (
      !isElevatedResultUploader &&
      !subjectIds.has(subject.id)
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this subject." },
        { status: 403 }
      );
    }

    // 12. STRICT CLASS-LEVEL AND SUBJECT VALIDATION.
    const level = getClassLevel(classroom);

    if (!level) {
      return NextResponse.json(
        {
          error:
            "The selected class has no recognised school level. Please ask the administrator to correct its level.",
        },
        { status: 403 }
      );
    }

    if (
      !subjectAppliesToClass(
        subject.levels,
        level
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This subject is not explicitly configured for the selected class level.",
        },
        { status: 403 }
      );
    }

    // 13. Music is excluded.
    if (normalize(subject.name) === "music") {
      return NextResponse.json(
        {
          error:
            "Music is not available for result entry.",
        },
        { status: 403 }
      );
    }

    // 14. Validate every result entry.
    const seenStudentIds = new Set<string>();

    const normalizedEntries: NormalizedResultEntry[] = [];

    for (const raw of entries) {
      if (!raw || typeof raw !== "object") {
        return NextResponse.json(
          { error: "One or more result entries are invalid." },
          { status: 400 }
        );
      }

      const item = raw as Record<string, unknown>;
      const studentId = cleanString(item.studentId);

      if (!studentId) {
        return NextResponse.json(
          { error: "A result entry is missing its student." },
          { status: 400 }
        );
      }

      if (seenStudentIds.has(studentId)) {
        return NextResponse.json(
          {
            error:
              "Each student must appear exactly once.",
          },
          { status: 400 }
        );
      }

      seenStudentIds.add(studentId);

      const studentDoc = await db
        .collection("students")
        .doc(studentId)
        .get();

      if (!studentDoc.exists) {
        return NextResponse.json(
          { error: "One or more students could not be found." },
          { status: 403 }
        );
      }

      const student = studentDoc.data() || {};

      const studentClassId = cleanString(student.classId);
      const studentClassName = cleanString(student.className);

      const belongsToClass =
        studentClassId === classroom.id ||
        studentClassId === classroom.name ||
        studentClassName === classroom.name;

      if (!belongsToClass) {
        return NextResponse.json(
          {
            error:
              "One or more students do not belong to the selected class.",
          },
          { status: 403 }
        );
      }

      const arabic = isArabicSubject(subject);

      if (
        arabic &&
        student.attendsArabic !== true
      ) {
        return NextResponse.json(
          {
            error:
              "Arabic results can only be submitted for students registered for Arabic.",
          },
          { status: 400 }
        );
      }

      // Main: CA1 20 + CA2 20 + Exam 60.
      // Arabic: CA 40 + Exam 60.
      const ca1 = readScore(
        item.ca1,
        arabic ? "Arabic CA" : "CA1",
        arabic ? 40 : 20
      );

      const ca2 = arabic
        ? readScore(item.ca2 ?? 0, "Arabic CA2", 0)
        : readScore(item.ca2, "CA2", 20);

      const exam = readScore(
        item.exam,
        "Exam",
        60
      );

      const total = ca1 + ca2 + exam;
      const grade = computeGrade(total);
      const remark = computeRemark(grade);

      normalizedEntries.push({
        studentId,
        subjectId: subject.id,
        classId: classroom.id,
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

    // 15. Save results.
    const batch = db.batch();

    for (const entry of normalizedEntries) {
      const existing = await db
        .collection("results")
        .where("studentId", "==", entry.studentId)
        .where("subjectId", "==", entry.subjectId)
        .where("term", "==", entry.term)
        .where("session", "==", entry.session)
        .limit(1)
        .get();

      // Stable IDs prevent concurrent submissions from creating
      // duplicate records for the same student/subject/term/session.
      // Existing legacy records keep their current document IDs.
      const stableKey = createHash("sha256")
        .update(JSON.stringify([
          entry.studentId,
          entry.subjectId,
          entry.term,
          entry.session,
        ]))
        .digest("hex");

      const resultRef = existing.empty
        ? db.collection("results").doc(`teacher_${stableKey}`)
        : existing.docs[0].ref;

      const resultData = {
        studentId: entry.studentId,
        subjectId: entry.subjectId,
        classId: entry.classId,
        term: entry.term,
        session: entry.session,
        ca1: entry.ca1,
        ca2: entry.ca2,
        exam: entry.exam,
        total: entry.total,
        grade: entry.grade,
        remark: entry.remark,
        updatedAt: new Date(),
      };

      if (existing.empty) {
        batch.set(resultRef, {
          ...resultData,
          createdAt: new Date(),
        });
      } else {
        batch.set(
          resultRef,
          resultData,
          { merge: true }
        );
      }
    }

    await batch.commit();

    // 16. Activity log.
    const actor =
      cleanString(userData.name) ||
      cleanString(userData.email) ||
      "teacher";

    const classLabel =
      classroom.name || classroom.id;

    const subjectLabel =
      subject.name || subject.id;

    const mode = isFormMasterForSelectedClass
      ? "Form Master"
      : hasAllResultAccess
        ? "Elevated Teacher"
        : "Subject Teacher";

    await db.collection("activityLog").add({
      action: "Result uploaded",
      actor,
      details:
        `${classLabel} — ${subjectLabel} — ${normalizedEntries.length} student(s) — ${term} ${session} — ${mode}`,
      createdAt: new Date(),
    });

    // 17. Success response.
    return NextResponse.json({
      ok: true,
      message: isFormMasterForSelectedClass
        ? "Results saved successfully by Form Master."
        : "Results saved successfully.",
      count: normalizedEntries.length,
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
        status:
          error instanceof ResultValidationError
            ? 400
            : 500,
      }
    );
  }
}