import type { AccountStatus } from "@/settings/config";

export type SchoolLevel =
  | "pre-nursery"
  | "nursery"
  | "primary"
  | "jss"
  | "ss";

export type SubjectSection =
  | "main"
  | "arabic";

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
  parentUid?: string;
  parentName?: string;
  status: AccountStatus;
  photoUrl?: string;

  // Optional Arabic section
  attendsArabic?: boolean;
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

  // School levels where this subject is taught
  levels?: SchoolLevel[];

  // Main or Arabic
  section?: SubjectSection;

  // Main: CA1 20 + CA2 20 + Exam 60
  // Arabic: CA 40 + Exam 60
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

  // Main subjects
  ca1?: number;
  ca2?: number;
  exam?: number;

  total?: number;
  grade?: string;
  remark?: string;
}