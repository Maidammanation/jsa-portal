// lib/types.ts
// Shared domain types for the admin features (students, attendance, results).

import type { AccountStatus } from "@/settings/config";

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  classId: string;
  className?: string; // denormalized for display convenience
  gender: "male" | "female";
  dateOfBirth?: string;
  parentUid?: string;
  parentName?: string;
  status: AccountStatus;
  photoUrl?: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g. "JSS 1A"
  level: string; // e.g. "JSS 1"
  classTeacherUid?: string;
  classTeacherName?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string; // ISO date, e.g. "2026-07-09"
  records: AttendanceRecord[];
  takenBy: string;
}

export interface ResultEntry {
  id?: string;
  studentId: string;
  subjectId: string;
  classId: string;
  session: string;
  term: string;
  ca1?: number; // first CA score
  ca2?: number; // second CA score
  exam?: number; // exam score
  total?: number; // computed
  grade?: string; // computed
  remark?: string;
}
