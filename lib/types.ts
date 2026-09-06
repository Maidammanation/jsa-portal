// lib/types.ts
// Shared domain types for the admin features.

import type { AccountStatus } from "@/settings/config";

export type SchoolLevel =
  | "nursery"
  | "primary"
  | "jss"
  | "ss";

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  classId: string;
  className?: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  parentUid?: string;
  parentName?: string;
  status: AccountStatus;
  photoUrl?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  level: string;
  classTeacherUid?: string;
  classTeacherName?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;

  /**
   * School levels where this subject is offered.
   *
   * Example:
   * ["nursery", "primary", "jss"]
   *
   * This is optional for backward compatibility
   * with subjects already stored in Firestore.
   */
  levels?: SchoolLevel[];
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late";

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string;
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
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
}