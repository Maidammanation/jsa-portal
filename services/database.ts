// services/database.ts
// Thin Firestore data-access layer. Keep raw Firestore calls out of components/pages;
// add a typed function here instead so the rest of the app stays backend-agnostic.

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
} from "firebase/firestore";
import { db } from "./firebase";

// ---- Generic helpers -------------------------------------------------

export async function getById(colName: string, id: string) {
  const snap = await getDoc(doc(db, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAll(colName: string) {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function create(colName: string, data: Record<string, unknown>) {
  const ref = await addDoc(collection(db, colName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function update(colName: string, id: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function remove(colName: string, id: string) {
  await deleteDoc(doc(db, colName, id));
}

// ---- Domain-specific queries -----------------------------------------

/** Dashboard summary counts for the admin home page. */
export async function getAdminStats() {
  const [students, teachers, parents, classes, subjects] = await Promise.all([
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

/** Most recent activity log entries, newest first. */
export async function getRecentActivity(count = 10) {
  const q = query(collection(db, "activityLog"), orderBy("createdAt", "desc"), fsLimit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Writes one entry to the activity log (call this from any mutation you want audited). */
export async function logActivity(action: string, actor: string, details?: string) {
  await create("activityLog", { action, actor, details: details || "" });
}

/** Fetch all children linked to a parent account (for the parent dashboard). */
export async function getChildrenForParent(parentUid: string) {
  const q = query(collection(db, "students"), where("parentUid", "==", parentUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Students ----------------------------------------------------------

export async function getStudents() {
  return getAll("students");
}

export async function getStudentsByClass(classId: string) {const q = query(collection(db, "students"), where("classId", "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createStudent(data: Record<string, unknown>) {
  const id = await create("students", data);
  await logActivity("Student added", data.createdBy as string, `${data.firstName} ${data.lastName}`);
  return id;
}

export async function updateStudent(id: string, data: Record<string, unknown>) {
  await update("students", id, data);
}

export async function deleteStudent(id: string) {
  await remove("students", id);
}

/** Bulk-moves every student in `fromClassId` to `toClassId` (end-of-session promotion). */
export async function promoteStudents(fromClassId: string, toClassId: string, actor: string) {
  const students = await getStudentsByClass(fromClassId);
  await Promise.all(students.map((s) => update("students", s.id, { classId: toClassId })));
  await logActivity(
    "Students promoted",
    actor,
    `${students.length} student(s) moved from ${fromClassId} to ${toClassId}`
  );
  return students.length;
}

// ---- Classes & Subjects -------------------------------------------------

// Canonical Nigerian curriculum order, used to sort classes correctly since
// Firestore doesn't preserve insertion order. Any class name not in this list
// (e.g. a custom class an admin adds later) sorts alphabetically after these.
const CLASS_ORDER = [
  "Nursery 1",
  "Nursery 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
];

export async function getClasses() {
  const classes = (await getAll("classes")) as { id: string; name?: string }[];
  return classes.sort((a, b) => {
    const aIndex = CLASS_ORDER.indexOf(a.name || "");
    const bIndex = CLASS_ORDER.indexOf(b.name || "");
    if (aIndex === -1 && bIndex === -1) return (a.name || "").localeCompare(b.name || "");
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export async function getSubjects() {
  return getAll("subjects");
}

// ---- Attendance ----------------------------------------------------------

/** Fetches the attendance session for a given class + date, if one already exists. */
export async function getAttendanceSession(classId: string, date: string) {
  const q = query(
    collection(db, "attendance"),
    where("classId", "==", classId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Creates or overwrites the attendance session for a class on a given date. */
export async function submitAttendance(
  classId: string,
  date: string,
  records: { studentId: string; status: string }[],
  takenBy: string
) {
  const existing = await getAttendanceSession(classId, date);
  if (existing) {
    await update("attendance", existing.id, { records, takenBy });
  } else {await create("attendance", { classId, date, records, takenBy });
  }
  await logActivity("Attendance submitted", takenBy, `${records.length} student(s) — ${date}`);
}

// ---- Results ----------------------------------------------------------

/** Fetches all result entries for a class/subject/term/session (used by the entry grid). */
export async function getResultsFor(classId: string, subjectId: string, term: string, session: string) {
  const q = query(
    collection(db, "results"),
    where("classId", "==", classId),
    where("subjectId", "==", subjectId),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetches every result entry for a single student (used by the report card page). */
export async function getResultsForStudent(studentId: string, term: string, session: string) {
  const q = query(
    collection(db, "results"),
    where("studentId", "==", studentId),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Upserts one student's result for a subject (keyed on studentId+subjectId+term+session). */
export async function saveResult(entry: Record<string, unknown>, actor: string) {
  const q = query(
    collection(db, "results"),
    where("studentId", "==", entry.studentId),
    where("subjectId", "==", entry.subjectId),
    where("term", "==", entry.term),
    where("session", "==", entry.session)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await update("results", snap.docs[0].id, entry);
  } else {
    await create("results", entry);
  }
  await logActivity("Result uploaded", actor, `Subject ${entry.subjectId} — student ${entry.studentId}`);
}

// ---- Fees ----------------------------------------------------------

/** Fetches the fee amount set for every class for a given term/session. */
export async function getFeeStructure(term: string, session: string) {
  const q = query(
    collection(db, "feeStructure"),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as {
    id: string;
    classId: string;
    term: string;
    session: string;
    amount: number;
  }[];
}

/** Sets (or updates) the fee amount for one class for a term/session. */
export async function setClassFee(
  classId: string,
  term: string,
  session: string,
  amount: number,
  actor: string
) {
  const q = query(
    collection(db, "feeStructure"),
    where("classId", "==", classId),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await update("feeStructure", snap.docs[0].id, { amount });
  } else {
    await create("feeStructure", { classId, term, session, amount });
  }
  await logActivity("Fee amount updated", actor, `Class ${classId} — ₦${amount} for ${term} ${session}`);}

/** Fetches every payment a student has made for a term/session. */
export async function getPaymentsForStudent(studentId: string, term: string, session: string) {
  const q = query(
    collection(db, "feePayments"),
    where("studentId", "==", studentId),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as {
    id: string;
    amount: number;
    datePaid: string;
  }[];
}

/** Fetches every payment recorded for a term/session, across all students. */
export async function getAllPayments(term: string, session: string) {
  const q = query(
    collection(db, "feePayments"),
    where("term", "==", term),
    where("session", "==", session)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as {
    id: string;
    studentId: string;
    amount: number;
    datePaid: string;
  }[];
}

/** Records a single fee payment for a student. */
export async function recordPayment(
  studentId: string,
  classId: string,
  term: string,
  session: string,
  amount: number,
  datePaid: string,
  actor: string
) {
  await create("feePayments", { studentId, classId, term, session, amount, datePaid, recordedBy: actor });
  await logActivity("Fees recorded", actor, `₦${amount} for student ${studentId}`);
}

// ---- Announcements ----------------------------------------------------------

/** Most recent announcements, newest first. */
export async function getAnnouncements(count = 20) {
  const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), fsLimit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as {
    id: string;
    title: string;
    body: string;
    postedBy: string;
  }[];
}

export async function createAnnouncement(title: string, body: string, actor: string) {
  await create("announcements", { title, body, postedBy: actor });
  await logActivity("Announcement posted", actor, title);
}

export async function deleteAnnouncement(id: string) {
  await remove("announcements", id);
}

// ---- School Settings (current term/session) --------------------------------

/** Reads the current session/term. Falls back to null if not set yet (first run). */
export async function getSchoolSettings() {
  const snap = await getById("schoolSettings", "current");
  return snap as { id: string; session: string; term: string } | null;
}

/** Updates the current session/term — used across attendance, results, and fees. */
export async function updateSchoolSettings(session: string, term: string, actor: string) {
  await updateDoc(doc(db, "schoolSettings", "current"), { session, term }).catch(async () => {
    // Document doesn't exist yet — create it the first time this is used.
    const { setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "schoolSettings", "current"), { session, term });
  });
  await logActivity("School term/session updated", actor, `${session} — ${term}`);
}