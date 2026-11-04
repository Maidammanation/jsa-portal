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
