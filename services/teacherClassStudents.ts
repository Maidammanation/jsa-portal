import type { Student } from "@/lib/types";

/**
 * Loads students through the authenticated server endpoint.
 * The server verifies the active teacher and assigned class
 * before returning the class roster.
 */
export async function getTeacherStudentsByClass(
  classId: string
): Promise<Student[]> {
  const normalizedClassId = classId.trim();

  if (!normalizedClassId) {
    return [];
  }

  const response = await fetch(
    `/api/teacher/students?classId=${encodeURIComponent(normalizedClassId)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Unable to load students for this class."
    );
  }

  return Array.isArray(data.students)
    ? data.students as Student[]
    : [];
}

/**
 * Loads the roster for attendance only.
 * The dedicated server endpoint enforces the Form Master / sole-teacher
 * attendance policy independently of the general teacher roster endpoint.
 */
export async function getTeacherAttendanceStudentsByClass(
  classId: string
): Promise<Student[]> {
  const normalizedClassId = classId.trim();

  if (!normalizedClassId) {
    return [];
  }

  const response = await fetch(
    `/api/teacher/attendance-students?classId=${encodeURIComponent(normalizedClassId)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Unable to load the attendance roster for this class."
    );
  }

  return Array.isArray(data.students)
    ? data.students as Student[]
    : [];
}
