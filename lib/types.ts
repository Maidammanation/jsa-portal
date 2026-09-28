// lib/types.ts
// Shared domain types for the JSA Portal.

import type { AccountStatus } from "@/settings/config";

export type SchoolLevel =
  | "nursery"
  | "primary"
  | "jss"
  | "ss";

/**
 * Subject section used by the school curriculum.
 *
 * main:
 * Normal academic subjects using:
 * CA1 20 + CA2 20 + Exam 60 = 100
 *
 * arabic:
 * Arabic/Islamic section using:
 * CA 40 + Exam 60 = 100
 */
export type SubjectSection =
  | "main"
  | "arabic";

/**
 * Scoring structure for a subject.
 */
export type ScoringType =
  | "main-20-20-60"
  | "arabic-40-60";

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  classId: string;
  className?: string;
  gender: "male" | "female";
  dateOfBirth?: string;

  /**
   * Whether this student participates in
   * the Arabic section.
   */
  attendsArabic?: boolean;

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
   */
  levels?: SchoolLevel[];

  /**
   * Subject section.
   *
   * main   = normal academic subjects
   * arabic = Arabic/Islamic section
   *
   * Missing value is treated as "main"
   * for backward compatibility.
   */
  section?: SubjectSection;

  /**
   * Scoring structure used by the result system.
   *
   * main-20-20-60:
   * CA1 20 + CA2 20 + Exam 60
   *
   * arabic-40-60:
   * CA 40 + Exam 60
   *
   * Missing value is treated as "main-20-20-60"
   * for backward compatibility.
   */
  scoringType?: ScoringType;
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

  /**
   * Normal subjects:
   * ca1 max 20
   * ca2 max 20
   *
   * Arabic subjects:
   * ca1 can store the Arabic CA max 40
   * ca2 remains 0/unused
   */
  ca1?: number;
  ca2?: number;

  /**
   * Exam:
   * Normal subjects max 60
   * Arabic subjects max 60
   */
  exam?: number;

  total?: number;
  grade?: string;
  remark?: string;
}