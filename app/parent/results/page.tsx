"use client";

import { useEffect, useState } from "react";
import { SelectInput } from "@/components/Forms";

import {
  getParentByAuthUid,
  getChildrenForParent,
  getResultsForStudent,
  getSubjects,
} from "@/services/database";

import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

import type {
  ResultEntry,
  Subject,
} from "@/lib/types";

interface ParentRecord {
  id: string;
}

interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
  className?: string;
  classId: string;
}

export default function ParentResultsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
  } = useSchoolSettings();

  const [children, setChildren] =
    useState<ChildRecord[]>([]);

  const [childId, setChildId] =
    useState("");

  const [results, setResults] =
    useState<ResultEntry[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingResults, setLoadingResults] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    const loadParentData = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getParentByAuthUid(
            profile.uid
          );

        if (!mounted) return;

        const p =
          data as ParentRecord | null;

        if (!p) {
          setLoading(false);
          return;
        }

        /*
         * IMPORTANT:
         * students.parentUid stores the
         * authenticated parent's UID.
         *
         * Do NOT use p.id here.
         */
        const [
          kids,
          subjectList,
        ] = await Promise.all([
          getChildrenForParent(
            profile.uid
          ),
          getSubjects(),
        ]);

        if (!mounted) return;

        const childList =
          kids as ChildRecord[];

        setChildren(childList);

        setSubjects(
          subjectList as Subject[]
        );

        if (
          childList.length === 1
        ) {
          setChildId(
            childList[0].id
          );
        } else {
          setChildId("");
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your children."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadParentData();

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!childId) {
      setResults([]);
      setLoadingResults(false);
      return;
    }

    /*
     * Parents can select children before
     * publication, but actual result data
     * is not requested until published.
     */
    if (resultStatus !== "published") {
      setResults([]);
      setLoadingResults(false);
      return;
    }

    let mounted = true;

    const loadResults = async () => {
      try {
        setLoadingResults(true);
        setError("");

        const data =
          await getResultsForStudent(
            childId,
            term,
            session
          );

        if (!mounted) return;

        setResults(
          data as ResultEntry[]
        );
      } catch (err) {
        if (!mounted) return;

        setResults([]);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load student results."
        );
      } finally {
        if (mounted) {
          setLoadingResults(false);
        }
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [
    childId,
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

  const child =
    children.find(
      (c) => c.id === childId
    );

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-400">
          Loading...
        </p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm text-amber-800">
            No children are linked to
            your account yet.
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
          Results
        </h1>

        <p className="text-sm text-gray-500">
          {session} &middot; {term}
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

      {/* Child selector */}
      {children.length > 1 && (
        <div className="max-w-xs">
          <SelectInput
            label="Child"
            value={childId}
            onChange={(e) =>
              setChildId(
                e.target.value
              )
            }
            options={[
              {
                label:
                  "Select a child",
                value: "",
              },

              ...children.map(
                (c) => ({
                  label: `${c.firstName} ${c.lastName}`,
                  value: c.id,
                })
              ),
            ]}
          />
        </div>
      )}

      {/* Result status */}
      {resultStatus === "open" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-sm font-semibold text-blue-800">
            Results are being prepared
          </p>

          <p className="mt-1 text-xs text-blue-700">
            Results for the current term
            have not been published yet.
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
            Results are currently locked
            for checking and have not been
            published yet.
          </p>
        </div>
      )}

      {/* Child selected */}
      {childId && (
        <>
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">
              {child?.firstName}{" "}
              {child?.lastName}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {child?.className ||
                child?.classId}
            </p>
          </div>

          {/* Published */}
          {resultStatus ===
            "published" && (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800">
                  Results Published
                </p>

                <p className="mt-1 text-xs text-green-700">
                  Official results for{" "}
                  {term} are now
                  available.
                </p>
              </div>

              {loadingResults ? (
                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
                  <p className="text-sm text-gray-500">
                    Loading results...
                  </p>
                </div>
              ) : (
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

                      {results.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-6 text-center text-gray-400"
                          >
                            No results have
                            been recorded
                            for this term.
                          </td>
                        </tr>
                      ) : (
                        results.map(
                          (r) => (
                            <tr
                              key={
                                r.id ||
                                `${r.studentId}-${r.subjectId}`
                              }
                            >

                              <td className="px-4 py-2 text-gray-700">
                                {subjectName(
                                  r.subjectId
                                )}
                              </td>

                              <td className="px-4 py-2">
                                {r.ca1 ??
                                  "—"}
                              </td>

                              <td className="px-4 py-2">
                                {r.ca2 ??
                                  "—"}
                              </td>

                              <td className="px-4 py-2">
                                {r.exam ??
                                  "—"}
                              </td>

                              <td className="px-4 py-2 font-medium">
                                {r.total ??
                                  "—"}
                              </td>

                              <td className="px-4 py-2 font-medium">
                                {r.grade ??
                                  "—"}
                              </td>

                              <td className="px-4 py-2 text-gray-500">
                                {r.remark ??
                                  "—"}
                              </td>

                            </tr>
                          )
                        )
                      )}

                    </tbody>
                  </table>
                </div>
              )}

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
        </>
      )}
    </div>
  );
}