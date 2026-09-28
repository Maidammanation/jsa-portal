// services/database.ts
// Thin Firestore data-access layer. Keep raw Firestore calls out of components/pages;
// add a typed function here so the rest of the app stays backend-agnostic.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

// -----------------------------------------------------------------------------
// Generic helpers
// -----------------------------------------------------------------------------

export async function getById(
  colName: string,
  id: string
) {
  const snap = await getDoc(
    doc(db, colName, id)
  );

  return snap.exists()
    ? {
        id: snap.id,
        ...snap.data(),
      }
    : null;
}

export async function getAll(
  colName: string
) {
  const snap = await getDocs(
    collection(db, colName)
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function create(
  colName: string,
  data: Record<string, unknown>
) {
  const ref = await addDoc(
    collection(db, colName),
    {
      ...data,
      createdAt: serverTimestamp(),
    }
  );

  return ref.id;
}

export async function update(
  colName: string,
  id: string,
  data: Record<string, unknown>
) {
  await updateDoc(
    doc(db, colName, id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function remove(
  colName: string,
  id: string
) {
  await deleteDoc(
    doc(db, colName, id)
  );
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

export async function getAdminStats() {
  const [
    students,
    teachers,
    parents,
    classes,
    subjects,
  ] = await Promise.all([
    getAll("students"),
    getAll("teachers"),
    getAll("parents"),
    getAll("classes"),
    getAll("subjects"),
  ]);

  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalParents: parents.length,
    totalClasses: classes.length,
    totalSubjects: subjects.length,
  };
}

export async function getRecentActivity(
  count = 10
) {
  const q = query(
    collection(db, "activityLog"),
    orderBy("createdAt", "desc"),
    fsLimit(count)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function logActivity(
  action: string,
  actor: string,
  details?: string
) {
  await create("activityLog", {
    action,
    actor,
    details: details || "",
  });
}

// -----------------------------------------------------------------------------
// Parents / Children
// -----------------------------------------------------------------------------

export async function getChildrenForParent(
  parentUid: string
) {
  const q = query(
    collection(db, "students"),
    where("parentUid", "==", parentUid)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// -----------------------------------------------------------------------------
// Students
// -----------------------------------------------------------------------------

export async function getStudents() {
  return getAll("students");
}

export async function getStudentsByClass(
  classId: string
) {
  const q = query(
    collection(db, "students"),
    where("classId", "==", classId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function createStudent(
  data: Record<string, unknown>
) {
  const id = await create(
    "students",
    data
  );

  await logActivity(
    "Student added",
    (data.createdBy as string) ||
      "admin",
    `${data.firstName} ${data.lastName}`
  );

  return id;
}

export async function updateStudent(
  id: string,
  data: Record<string, unknown>
) {
  await update(
    "students",
    id,
    data
  );
}

export async function deleteStudent(
  id: string
) {
  await remove(
    "students",
    id
  );
}

export async function promoteStudents(
  fromClassId: string,
  toClassId: string,
  actor: string
) {
  const students =
    await getStudentsByClass(
      fromClassId
    );

  await Promise.all(
    students.map((student) =>
      update(
        "students",
        student.id,
        {
          classId: toClassId,
        }
      )
    )
  );

  await logActivity(
    "Students promoted",
    actor,
    `${students.length} student(s) moved from ${fromClassId} to ${toClassId}`
  );

  return students.length;
}

// -----------------------------------------------------------------------------
// Classes & Subjects
// -----------------------------------------------------------------------------

// Order:
// Pre Nursery
// Nursery 1
// Nursery 2
// Nursery 3
// Primary 1 - 6
// JSS 1 - 3
// SS 1 - 3

const LEVEL_RANK: Record<
  string,
  number
> = {
  "pre-nursery": -1,
  prenursery: -1,
  nursery: 0,
  primary: 1,
  jss: 2,
  ss: 3,
};

function normalizeClassLevel(
  name: string
): string {
  const value = name
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  if (
    value === "pre nursery" ||
    value === "pre-nursery" ||
    value.startsWith("pre nursery ") ||
    value.startsWith("pre-nursery ")
  ) {
    return "pre-nursery";
  }

  if (value.startsWith("nursery")) {
    return "nursery";
  }

  if (value.startsWith("primary")) {
    return "primary";
  }

  if (value.startsWith("jss")) {
    return "jss";
  }

  if (value.startsWith("ss")) {
    return "ss";
  }

  return "";
}

function parseClassName(
  name: string
): {
  rank: number;
  num: number;
} {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  // Pre Nursery has no number.
  if (
    normalized === "pre nursery" ||
    normalized === "pre-nursery"
  ) {
    return {
      rank: -1,
      num: 0,
    };
  }

  const match = normalized.match(
    /^(nursery|primary|jss|ss)\s*(\d+)?/
  );

  if (!match) {
    return {
      rank: 99,
      num: 0,
    };
  }

  const level = match[1];
  const num = match[2]
    ? parseInt(match[2], 10)
    : 0;

  return {
    rank:
      LEVEL_RANK[level] ?? 99,
    num,
  };
}

export async function getClasses() {
  const classes =
    (await getAll("classes")) as {
      id: string;
      name?: string;
    }[];

  return classes.sort(
    (a, b) => {
      const pa =
        parseClassName(
          a.name || ""
        );

      const pb =
        parseClassName(
          b.name || ""
        );

      if (pa.rank !== pb.rank) {
        return (
          pa.rank - pb.rank
        );
      }

      if (pa.num !== pb.num) {
        return (
          pa.num - pb.num
        );
      }

      return (
        a.name || ""
      ).localeCompare(
        b.name || ""
      );
    }
  );
}

export async function getSubjects() {
  return getAll("subjects");
}

// -----------------------------------------------------------------------------
// Attendance
// -----------------------------------------------------------------------------

export async function getAttendanceSession(
  classId: string,
  date: string
) {
  const q = query(
    collection(db, "attendance"),
    where(
      "classId",
      "==",
      classId
    ),
    where(
      "date",
      "==",
      date
    )
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const d = snap.docs[0];

  return {
    id: d.id,
    ...d.data(),
  };
}

export async function getAttendanceForStudent(
  classId: string,
  studentId: string
) {
  const q = query(
    collection(db, "attendance"),
    where(
      "classId",
      "==",
      classId
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs
    .map((d) => {
      const data =
        d.data() as {
          date: string;
          records?: {
            studentId: string;
            status: string;
          }[];
        };

      const mine =
        data.records?.find(
          (record) =>
            record.studentId ===
            studentId
        );

      return mine
        ? {
            date: data.date,
            status: mine.status,
          }
        : null;
    })
    .filter(
      (
        record
      ): record is {
        date: string;
        status: string;
      } => record !== null
    )
    .sort((a, b) =>
      b.date.localeCompare(
        a.date
      )
    );
}

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

/**
 * Fetch all results for:
 * class + subject + term + session
 */
export async function getResultsFor(
  classId: string,
  subjectId: string,
  term: string,
  session: string
) {
  const q = query(
    collection(db, "results"),
    where(
      "classId",
      "==",
      classId
    ),
    where(
      "subjectId",
      "==",
      subjectId
    ),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  );
}

/**
 * Fetch every result belonging to one student
 * for the current term/session.
 */
export async function getResultsForStudent(
  studentId: string,
  term: string,
  session: string
) {
  const q = query(
    collection(db, "results"),
    where(
      "studentId",
      "==",
      studentId
    ),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  );
}

/**
 * Save/update one student's result.
 *
 * A result is uniquely identified by:
 * studentId + subjectId + term + session
 *
 * Therefore uploading a corrected result updates
 * the existing result instead of creating a duplicate.
 */
export async function saveResult(
  entry: Record<string, unknown>,
  actor: string
) {
  const q = query(
    collection(db, "results"),
    where(
      "studentId",
      "==",
      entry.studentId
    ),
    where(
      "subjectId",
      "==",
      entry.subjectId
    ),
    where(
      "term",
      "==",
      entry.term
    ),
    where(
      "session",
      "==",
      entry.session
    )
  );

  const snap =
    await getDocs(q);

  let resultId = "";

  if (!snap.empty) {
    resultId =
      snap.docs[0].id;

    await update(
      "results",
      resultId,
      entry
    );
  } else {
    resultId = await create(
      "results",
      entry
    );
  }

  await logActivity(
    "Result uploaded",
    actor,
    `Subject ${entry.subjectId} — student ${entry.studentId}`
  );

  return resultId;
}

/**
 * Delete one student's result for a subject,
 * term and session.
 */
export async function deleteResult(
  studentId: string,
  subjectId: string,
  term: string,
  session: string
) {
  const q = query(
    collection(db, "results"),
    where(
      "studentId",
      "==",
      studentId
    ),
    where(
      "subjectId",
      "==",
      subjectId
    ),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  await Promise.all(
    snap.docs.map(
      (resultDoc) =>
        deleteDoc(
          doc(
            db,
            "results",
            resultDoc.id
          )
        )
    )
  );

  return snap.size;
}

/**
 * Delete a result directly by its Firestore document ID.
 */
export async function deleteResultById(
  resultId: string
) {
  await deleteDoc(
    doc(
      db,
      "results",
      resultId
    )
  );
}

// -----------------------------------------------------------------------------
// Fees
// -----------------------------------------------------------------------------

export async function getFeeStructure(
  term: string,
  session: string
) {
  const q = query(
    collection(db, "feeStructure"),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  ) as {
    id: string;
    classId: string;
    term: string;
    session: string;
    amount: number;
  }[];
}

export async function setClassFee(
  classId: string,
  term: string,
  session: string,
  amount: number,
  actor: string
) {
  const q = query(
    collection(db, "feeStructure"),
    where(
      "classId",
      "==",
      classId
    ),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  if (!snap.empty) {
    await update(
      "feeStructure",
      snap.docs[0].id,
      {
        amount,
      }
    );
  } else {
    await create(
      "feeStructure",
      {
        classId,
        term,
        session,
        amount,
      }
    );
  }

  await logActivity(
    "Fee amount updated",
    actor,
    `Class ${classId} — ₦${amount} for ${term} ${session}`
  );
}

export async function getPaymentsForStudent(
  studentId: string,
  term: string,
  session: string
) {
  const q = query(
    collection(db, "feePayments"),
    where(
      "studentId",
      "==",
      studentId
    ),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  ) as {
    id: string;
    amount: number;
    datePaid: string;
  }[];
}

export async function getAllPayments(
  term: string,
  session: string
) {
  const q = query(
    collection(db, "feePayments"),
    where(
      "term",
      "==",
      term
    ),
    where(
      "session",
      "==",
      session
    )
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  ) as {
    id: string;
    studentId: string;
    amount: number;
    datePaid: string;
  }[];
}

export async function recordPayment(
  studentId: string,
  classId: string,
  term: string,
  session: string,
  amount: number,
  datePaid: string,
  actor: string
) {
  await create(
    "feePayments",
    {
      studentId,
      classId,
      term,
      session,
      amount,
      datePaid,
      recordedBy: actor,
    }
  );

  await logActivity(
    "Fees recorded",
    actor,
    `₦${amount} for student ${studentId}`
  );
}

// -----------------------------------------------------------------------------
// Announcements
// -----------------------------------------------------------------------------

export async function getAnnouncements(
  count = 20
) {
  const q = query(
    collection(db, "announcements"),
    orderBy(
      "createdAt",
      "desc"
    ),
    fsLimit(count)
  );

  const snap =
    await getDocs(q);

  return snap.docs.map(
    (d) => ({
      id: d.id,
      ...d.data(),
    })
  ) as {
    id: string;
    title: string;
    body: string;
    postedBy: string;
  }[];
}

export async function createAnnouncement(
  title: string,
  body: string,
  actor: string
) {
  await create(
    "announcements",
    {
      title,
      body,
      postedBy: actor,
    }
  );

  await logActivity(
    "Announcement posted",
    actor,
    title
  );
}

export async function deleteAnnouncement(
  id: string
) {
  await remove(
    "announcements",
    id
  );
}

// -----------------------------------------------------------------------------
// School Settings
// -----------------------------------------------------------------------------

export async function getSchoolSettings() {
  const snap =
    await getById(
      "schoolSettings",
      "current"
    );

  return snap as {
    id: string;
    session: string;
    term: string;
  } | null;
}

export async function updateSchoolSettings(
  session: string,
  term: string,
  actor: string
) {
  const ref = doc(
    db,
    "schoolSettings",
    "current"
  );

  const snap =
    await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      session,
      term,
    });
  } else {
    await setDoc(ref, {
      session,
      term,
    });
  }

  await logActivity(
    "School term/session updated",
    actor,
    `${session} — ${term}`
  );
}

// -----------------------------------------------------------------------------
// Self lookup
// -----------------------------------------------------------------------------

export async function getTeacherByAuthUid(
  uid: string
) {
  const q = query(
    collection(db, "teachers"),
    where(
      "authUid",
      "==",
      uid
    )
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const d = snap.docs[0];

  return {
    id: d.id,
    ...d.data(),
  };
}

export async function getStudentByAuthUid(
  uid: string
) {
  const q = query(
    collection(db, "students"),
    where(
      "authUid",
      "==",
      uid
    )
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const d = snap.docs[0];

  return {
    id: d.id,
    ...d.data(),
  };
}

export async function getParentByAuthUid(
  uid: string
) {
  const q = query(
    collection(db, "parents"),
    where(
      "authUid",
      "==",
      uid
    )
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const d = snap.docs[0];

  return {
    id: d.id,
    ...d.data(),
  };
}

// -----------------------------------------------------------------------------
// Admission Numbers
// -----------------------------------------------------------------------------

/**
 * Converts class name into an admission-number code.
 *
 * Examples:
 * Pre Nursery -> PN
 * Nursery 1   -> N1
 * Nursery 2   -> N2
 * Primary 1   -> P1
 * JSS 1       -> JSS1
 * SS 1        -> SS1
 */
export function getClassCode(
  className: string
): string {
  const normalized =
    className
      .trim()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");

  if (
    normalized ===
      "pre nursery" ||
    normalized ===
      "pre-nursery"
  ) {
    return "PN";
  }

  const match =
    normalized.match(
      /^(nursery|primary|jss|ss)\s*(\d+)?/
    );

  if (!match) {
    return "GEN";
  }

  const level =
    match[1];

  const num =
    match[2] || "";

  const prefix =
    level === "nursery"
      ? "N"
      : level === "primary"
        ? "P"
        : level.toUpperCase();

  return `${prefix}${num}`;
}

/**
 * Generates the next admission number.
 *
 * Examples:
 * JSA/PN/0001
 * JSA/N1/0001
 * JSA/P1/0001
 * JSA/JSS1/0001
 * JSA/SS1/0001
 */
export async function generateAdmissionNumber(
  classId: string,
  className: string
): Promise<string> {
  const students =
    await getStudentsByClass(
      classId
    );

  const seq =
    students.length + 1;

  const code =
    getClassCode(
      className
    );

  const padded =
    String(seq).padStart(
      4,
      "0"
    );

  return `JSA/${code}/${padded}`;
}