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

export default function StudentResultsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
  } = useSchoolSettings();

  const [student, setStudent] =
    useState<StudentRecord | null>(null);

  const [results, setResults] =
    useState<ResultEntry[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Load student record and results.
   *
   * Results are only requested when they
   * have been published.
   */
  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    const loadResults = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getStudentByAuthUid(
            profile.uid
          );

        if (!mounted) return;

        const s =
          data as StudentRecord | null;

        setStudent(s);

        if (!s) {
          setLoading(false);
          return;
        }

        /*
         * Do not attempt to read student
         * results until the administrator
         * publishes them.
         */
        if (resultStatus !== "published") {
          setResults([]);

          const subjectList =
            await getSubjects();

          if (!mounted) return;

          setSubjects(
            subjectList as Subject[]
          );

          setLoading(false);
          return;
        }

        const [
          resultList,
          subjectList,
        ] = await Promise.all([
          getResultsForStudent(
            s.id,
            term,
            session
          ),
          getSubjects(),
        ]);

        if (!mounted) return;

        setResults(
          resultList as ResultEntry[]
        );

        setSubjects(
          subjectList as Subject[]
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your results."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [
    profile?.uid,
    term,
    session,
    resultStatus,
  ]);

  const subjectName = (
    id: string
  ) =>
    subjects.find(
      (s) => s.id === id
    )?.name || id;

  const totalScore =
    results.reduce(
      (sum, r) =>
        sum + (r.total || 0),
      0
    );

  const average =
    results.length
      ? Math.round(
          (totalScore /
            results.length) *
            10
        ) / 10
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
            No student record is linked
            to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Results
        </h1>

        <p className="text-sm text-gray-500">
          {student.className ||
            student.classId}{" "}
          &middot; {session} &middot; {term}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Result status */}
      {resultStatus === "open" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-sm font-semibold text-blue-800">
            Results are being prepared
          </p>

          <p className="mt-1 text-xs text-blue-700">
            Your results have not been
            published yet. Please check
            again later.
          </p>
        </div>
      )}

      {resultStatus === "locked" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Results are being finalized
          </p>

          <p className="mt-1 text-xs text-amber-700">
            Your results have been locked
            for checking and have not been
            published yet.
          </p>
        </div>
      )}

      {/* Published results */}
      {resultStatus === "published" && (
        <>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Results Published
            </p>

            <p className="mt-1 text-xs text-green-700">
              Your official results for{" "}
              {term} are now available.
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">

                  <th className="px-4 py-3 font-medium">
                    Subject
                  </th>

                  <th className="px-4 py-3 font-medium">
                    CA1
                  </th>

                  <th className="px-4 py-3 font-medium">
                    CA2
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Exam
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Total
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Grade
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Remark
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No results have been
                      recorded for this term.
                    </td>
                  </tr>
                ) : (
                  results.map((r) => (
                    <tr key={r.id || `${r.studentId}-${r.subjectId}`}>

                      <td className="px-4 py-2 text-gray-700">
                        {subjectName(
                          r.subjectId
                        )}
                      </td>

                      <td className="px-4 py-2">
                        {r.ca1 ?? "—"}
                      </td>

                      <td className="px-4 py-2">
                        {r.ca2 ?? "—"}
                      </td>

                      <td className="px-4 py-2">
                        {r.exam ?? "—"}
                      </td>

                      <td className="px-4 py-2 font-medium">
                        {r.total ?? "—"}
                      </td>

                      <td className="px-4 py-2 font-medium">
                        {r.grade ?? "—"}
                      </td>

                      <td className="px-4 py-2 text-gray-500">
                        {r.remark ?? "—"}
                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>

          {results.length > 0 && (
            <div className="flex flex-wrap gap-8 text-sm bg-white rounded-card border border-gray-100 shadow-sm p-4">

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