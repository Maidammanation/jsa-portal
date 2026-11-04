import type { ResultEntry } from "@/lib/types";

async function readTeacherResults(params: Record<string, string>): Promise<ResultEntry[]> {
  const search = new URLSearchParams(params);
  const response = await fetch(`/api/teacher/results?${search.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not load results.");
  }

  return Array.isArray(payload.results) ? payload.results as ResultEntry[] : [];
}

export function getTeacherResultsFor(
  classId: string,
  subjectId: string,
  term: string,
  session: string
): Promise<ResultEntry[]> {
  return readTeacherResults({ classId, subjectId, term, session });
}

export function getTeacherResultsForStudent(
  studentId: string,
  term: string,
  session: string
): Promise<ResultEntry[]> {
  return readTeacherResults({ studentId, term, session });
}
