"use client";

import { useEffect, useState } from "react";
import {
  getStudentByAuthUid,
  getResultsForStudent,
  getSubjects,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ResultEntry, Subject } from "@/lib/types";

interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  className?: string;
  classId: string;
}

function isArabicSubject(subject?: Subject) {
  return (
    subject?.section === "arabic" ||
    subject?.scoringType === "arabic-40-60"
  );
}

function ResultsTable({
  results,
  subjects,
}: {
  results: ResultEntry[];
  subjects: Subject[];
}) {
  const subjectFor = (id: string) =>
    subjects.find((subject) => subject.id === id);

  const mainResults = results.filter(
    (result) => !isArabicSubject(subjectFor(result.subjectId))
  );

  const arabicResults = results.filter(
    (result) => isArabicSubject(subjectFor(result.subjectId))
  );

  const emptyMessage = (
    <tr>
      <td
        colSpan={7}
        className="px-4 py-6 text-center text-gray-400"
      >
        No results have been recorded for this term.
      </td>
    </tr>
  );

  return (
    <div className="space-y-5">
      {mainResults.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Main Subjects
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              CA1 /20 + CA2 /20 + Exam /60
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">CA1 /20</th>
                <th className="px-4 py-3 font-medium">CA2 /20</th>
                <th className="px-4 py-3 font-medium">Exam /60</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Remark</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {mainResults.map((result) => (
                <tr
                  key={
                    result.id ||
                    `${result.studentId}-${result.subjectId}`
                  }
                >
                  <td className="px-4 py-2 text-gray-700">
                    {subjectFor(result.subjectId)?.name ||
                      result.subjectId}
                  </td>
                  <td className="px-4 py-2">
                    {result.ca1 ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {result.ca2 ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {result.exam ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {result.total ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {result.grade ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {result.remark ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {arabicResults.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Arabic Subjects
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              CA /40 + Exam /60
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">CA /40</th>
                <th className="px-4 py-3 font-medium">Exam /60</th>
                <th className="px-4 py-3 font-medium">Total /100</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Remark</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {arabicResults.map((result) => (
                <tr
                  key={
                    result.id ||
                    `${result.studentId}-${result.subjectId}`
                  }
                >
                  <td className="px-4 py-2 text-gray-700">
                    {subjectFor(result.subjectId)?.name ||
                      result.subjectId}
                  </td>
                  <td className="px-4 py-2">
                    {result.ca1 ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {result.exam ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {result.total ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {result.grade ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {result.remark ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <tbody>{emptyMessage}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const { session, term, resultStatus } = useSchoolSettings();

  const [student, setStudent] =
    useState<StudentRecord | null>(null);

  const [results, setResults] =
    useState<ResultEntry[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    const loadResults = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getStudentByAuthUid(profile.uid);

        if (!mounted) return;

        const studentRecord = data as StudentRecord | null;
        setStudent(studentRecord);

        if (!studentRecord) return;

        if (resultStatus !== "published") {
          setResults([]);

          const subjectList = await getSubjects();

          if (!mounted) return;

          setSubjects(subjectList as Subject[]);
          return;
        }

        const [resultList, subjectList] = await Promise.all([
          getResultsForStudent(
            studentRecord.id,
            term,
            session
          ),
          getSubjects(),
        ]);

        if (!mounted) return;

        setResults(resultList as ResultEntry[]);
        setSubjects(subjectList as Subject[]);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your results."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [profile?.uid, term, session, resultStatus]);

  const totalScore = results.reduce(
    (sum, result) => sum + (result.total || 0),
    0
  );

  const average = results.length
    ? Math.round((totalScore / results.length) * 10) / 10
    : 0;

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-400">
          Loading results...
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-sm text-red-700">
            No student record is linked to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Results
        </h1>

        <p className="text-sm text-gray-500">
          {student.className || student.classId}
          {" "}&middot; {session} &middot; {term}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {resultStatus === "open" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-sm font-semibold text-blue-800">
            Results are being prepared
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Your results have not been published yet.
            Please check again later.
          </p>
        </div>
      )}

      {resultStatus === "locked" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Results are being finalized
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Your results have been locked for checking and
            have not been published yet.
          </p>
        </div>
      )}

      {resultStatus === "published" && (
        <>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Results Published
            </p>
            <p className="mt-1 text-xs text-green-700">
              Your official results for {term} are now available.
            </p>
          </div>

          <ResultsTable
            results={results}
            subjects={subjects}
          />

          {results.length > 0 && (
            <div className="flex flex-wrap gap-8 rounded-card border border-gray-100 bg-white p-4 text-sm shadow-sm">
              <p>
                <span className="text-gray-500">
                  Total Score:
                </span>{" "}
                {totalScore}
              </p>

              <p>
                <span className="text-gray-500">
                  Average:
                </span>{" "}
                {average}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}