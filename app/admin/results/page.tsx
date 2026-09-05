"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getSubjects,
  getStudentsByClass,
  getResultsFor,
  saveResult,
} from "@/services/database";
import {
  computeTotal,
  computeGrade,
  computeRemark,
} from "@/lib/grading";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type {
  ClassRoom,
  ResultEntry,
  Student,
  Subject,
} from "@/lib/types";

type ScoreRow = {
  ca1: string;
  ca2: string;
  exam: string;
};

type SubjectScores = Record<string, ScoreRow>;

export default function ResultsUploadPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);

  /*
   * scores:
   * {
   *   subjectId: {
   *     studentId: {
   *       ca1: "...",
   *       ca2: "...",
   *       exam: "..."
   *     }
   *   }
   * }
   */
  const [scores, setScores] = useState<
    Record<string, SubjectScores>
  >({});

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * Load classes and subjects.
   */
  useEffect(() => {
    let mounted = true;

    Promise.all([
      getClasses(),
      getSubjects(),
    ])
      .then(([classList, subjectList]) => {
        if (!mounted) return;

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
      })
      .catch((err) => {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load classes and subjects."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoadingOptions(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * When the class changes, clear subject selection
   * and previously loaded students/scores.
   */
  const handleClassChange = (value: string) => {
    setClassId(value);
    setSelectedSubjectIds([]);
    setActiveSubjectId("");
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  };

  /*
   * Add/remove a subject from the multi-subject selection.
   */
  const toggleSubject = (subjectId: string) => {
    setMessage("");
    setError("");

    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        const next = prev.filter((id) => id !== subjectId);

        if (activeSubjectId === subjectId) {
          setActiveSubjectId(next[0] || "");
        }

        return next;
      }

      const next = [...prev, subjectId];

      if (!activeSubjectId) {
        setActiveSubjectId(subjectId);
      }

      return next;
    });
  };

  const selectAllSubjects = () => {
    const allIds = subjects.map((subject) => subject.id);

    setSelectedSubjectIds(allIds);

    if (!activeSubjectId && allIds.length > 0) {
      setActiveSubjectId(allIds[0]);
    }

    setMessage("");
    setError("");
  };

  const clearAllSubjects = () => {
    setSelectedSubjectIds([]);
    setActiveSubjectId("");
    setScores({});
    setMessage("");
    setError("");
  };

  /*
   * Load students and existing results whenever:
   * - class changes
   * - selected subjects change
   * - term/session changes
   */
  useEffect(() => {
    if (!classId || selectedSubjectIds.length === 0) {
      setStudents([]);
      setScores({});
      return;
    }

    let cancelled = false;

    setLoadingStudents(true);
    setMessage("");
    setError("");

    Promise.all([
      getStudentsByClass(classId),
      ...selectedSubjectIds.map((subjectId) =>
        getResultsFor(
          classId,
          subjectId,
          term,
          session
        )
      ),
    ])
      .then((responses) => {
        if (cancelled) return;

        const studentList = responses[0] as Student[];

        setStudents(studentList);

        const nextScores: Record<string, SubjectScores> = {};

        selectedSubjectIds.forEach((subjectId, index) => {
          const existingResults =
            responses[index + 1] as ResultEntry[];

          const subjectScores: SubjectScores = {};

          studentList.forEach((student) => {
            const prior = existingResults.find(
              (result) => result.studentId === student.id
            );

            subjectScores[student.id] = {
              ca1:
                prior?.ca1 !== undefined &&
                prior?.ca1 !== null
                  ? String(prior.ca1)
                  : "",
              ca2:
                prior?.ca2 !== undefined &&
                prior?.ca2 !== null
                  ? String(prior.ca2)
                  : "",
              exam:
                prior?.exam !== undefined &&
                prior?.exam !== null
                  ? String(prior.exam)
                  : "",
            };
          });

          nextScores[subjectId] = subjectScores;
        });

        setScores(nextScores);

        /*
         * Make sure the active subject is still selected.
         */
        if (
          !activeSubjectId ||
          !selectedSubjectIds.includes(activeSubjectId)
        ) {
          setActiveSubjectId(selectedSubjectIds[0] || "");
        }
      })
      .catch((err) => {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load students or existing results."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    classId,
    selectedSubjectIds,
    term,
    session,
  ]);

  /*
   * Update one student's score for the active subject.
   */
  const setScore = (
    subjectId: string,
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || {}),
        [studentId]: {
          ...(prev[subjectId]?.[studentId] || {
            ca1: "",
            ca2: "",
            exam: "",
          }),
          [field]: value,
        },
      },
    });
  };

  /*
   * Save all selected subjects.
   *
   * Firestore still receives one result document per:
   * student + subject + term + session.
   */
  const handleSaveAll = async () => {
    if (!classId || selectedSubjectIds.length === 0) {
      setError("Please select a class and at least one subject.");
      return;
    }

    if (students.length === 0) {
      setError("There are no students in this class.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const actor =
        profile?.name ||
        profile?.email ||
        "admin";

      const saveOperations: Promise<void>[] = [];

      for (const subjectId of selectedSubjectIds) {
        for (const student of students) {
          const row =
            scores[subjectId]?.[student.id] || {
              ca1: "",
              ca2: "",
              exam: "",
            };

          const ca1 = Math.min(
            20,
            Math.max(0, Number(row.ca1) || 0)
          );

          const ca2 = Math.min(
            20,
            Math.max(0, Number(row.ca2) || 0)
          );

          const exam = Math.min(
            60,
            Math.max(0, Number(row.exam) || 0)
          );

          const total = computeTotal(
            ca1,
            ca2,
            exam
          );

          const grade = computeGrade(total);

          saveOperations.push(
            saveResult(
              {
                studentId: student.id,
                subjectId,
                classId,
                term,
                session,
                ca1,
                ca2,
                exam,
                total,
                grade,
                remark: computeRemark(grade),
              },
              actor
            )
          );
        }
      }

      await Promise.all(saveOperations);

      setMessage(
        `Results saved successfully for ${selectedSubjectIds.length} subject${
          selectedSubjectIds.length === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save results."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedSubjects = subjects.filter((subject) =>
    selectedSubjectIds.includes(subject.id)
  );

  const activeSubject = subjects.find(
    (subject) => subject.id === activeSubjectId
  );

  const className =
    classes.find((classRoom) => classRoom.id === classId)
      ?.name || "";

  const activeScores =
    scores[activeSubjectId] || {};

  return (
    <div className="max-w-6xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Upload Results
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {session} &middot; {term}
          </p>
        </div>

        <Link
          href="/admin/results/report-cards"
          className="text-sm text-brand hover:underline"
        >
          Generate Report Cards →
        </Link>
      </div>

      {/* Selection panel */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Class */}
        <div>
          <SelectInput
            label="Class"
            value={classId}
            onChange={(e) =>
              handleClassChange(e.target.value)
            }
            options={[
              {
                label: "Select a class",
                value: "",
              },
              ...classes.map((classRoom) => ({
                label: classRoom.name,
                value: classRoom.id,
              })),
            ]}
          />
        </div>

        {/* Subjects */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Select Subjects
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Select one or more subjects to enter results.
              </p>
            </div>

            {!loadingOptions && subjects.length > 0 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={selectAllSubjects}
                  className="text-xs text-brand hover:underline"
                  disabled={!classId}
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={clearAllSubjects}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loadingOptions ? (
            <p className="text-sm text-gray-400">
              Loading subjects...
            </p>
          ) : subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No subjects have been created yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Go to Classes &amp; Subjects and add your
                subjects first.
              </p>
            </div>
          ) : !classId ? (
            <p className="text-sm text-gray-400">
              Select a class first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {subjects.map((subject) => {
                const checked =
                  selectedSubjectIds.includes(subject.id);

                return (
                  <label
                    key={subject.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                      checked
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleSubject(subject.id)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />

                    <span
                      className={`text-sm ${
                        checked
                          ? "text-gray-800 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {subject.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {selectedSubjectIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              {selectedSubjectIds.length} subject
              {selectedSubjectIds.length === 1
                ? ""
                : "s"} selected.
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Loading */}
      {loadingStudents && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading students and existing results...
          </p>
        </div>
      )}

      {/* Results */}
      {!loadingStudents &&
        classId &&
        selectedSubjectIds.length > 0 &&
        students.length > 0 && (
          <div className="space-y-4">
            {/* Selected subject tabs */}
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {selectedSubjects.map((subject) => {
                  const active =
                    subject.id === activeSubjectId;

                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() =>
                        setActiveSubjectId(subject.id)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        active
                          ? "bg-brand text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active subject table */}
            {activeSubject && (
              <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-gray-800">
                        {activeSubject.name}
                      </h2>

                      <p className="text-xs text-gray-400 mt-1">
                        {className} &middot; {session} &middot;{" "}
                        {term}
                      </p>
                    </div>

                    <span className="text-xs text-gray-400">
                      {students.length} student
                      {students.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                        <th className="px-4 py-3 font-medium">
                          #
                        </th>

                        <th className="px-4 py-3 font-medium min-w-[220px]">
                          Student
                        </th>

                        <th className="px-4 py-3 font-medium w-24">
                          CA1 (20)
                        </th>

                        <th className="px-4 py-3 font-medium w-24">
                          CA2 (20)
                        </th>

                        <th className="px-4 py-3 font-medium w-24">
                          Exam (60)
                        </th>

                        <th className="px-4 py-3 font-medium w-20">
                          Total
                        </th>

                        <th className="px-4 py-3 font-medium w-20">
                          Grade
                        </th>

                        <th className="px-4 py-3 font-medium min-w-[120px]">
                          Remark
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {students.map((student, index) => {
                        const row =
                          activeScores[student.id] || {
                            ca1: "",
                            ca2: "",
                            exam: "",
                          };

                        const ca1 = Math.min(
                          20,
                          Math.max(
                            0,
                            Number(row.ca1) || 0
                          )
                        );

                        const ca2 = Math.min(
                          20,
                          Math.max(
                            0,
                            Number(row.ca2) || 0
                          )
                        );

                        const exam = Math.min(
                          60,
                          Math.max(
                            0,
                            Number(row.exam) || 0
                          )
                        );

                        const total = computeTotal(
                          ca1,
                          ca2,
                          exam
                        );

                        const grade =
                          computeGrade(total);

                        return (
                          <tr key={student.id}>
                            <td className="px-4 py-2 text-gray-400">
                              {index + 1}
                            </td>

                            <td className="px-4 py-2 text-gray-700 font-medium">
                              {student.firstName}{" "}
                              {student.lastName}
                            </td>

                            {/* CA1 */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={row.ca1}
                                onChange={(e) =>
                                  setScore(
                                    activeSubjectId,
                                    student.id,
                                    "ca1",
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                              />
                            </td>

                            {/* CA2 */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={row.ca2}
                                onChange={(e) =>
                                  setScore(
                                    activeSubjectId,
                                    student.id,
                                    "ca2",
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                              />
                            </td>

                            {/* Exam */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={row.exam}
                                onChange={(e) =>
                                  setScore(
                                    activeSubjectId,
                                    student.id,
                                    "exam",
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                              />
                            </td>

                            {/* Total */}
                            <td className="px-4 py-2 font-semibold text-gray-700">
                              {total}
                            </td>

                            {/* Grade */}
                            <td className="px-4 py-2 font-semibold text-gray-700">
                              {grade}
                            </td>

                            {/* Remark */}
                            <td className="px-4 py-2 text-gray-500">
                              {computeRemark(grade)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save */}
                <div className="px-4 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">
                    You have selected{" "}
                    <span className="font-medium text-gray-600">
                      {selectedSubjectIds.length}
                    </span>{" "}
                    subject
                    {selectedSubjectIds.length === 1
                      ? ""
                      : "s"}.
                    Saving will update all selected
                    subjects.
                  </p>

                  <Button
                    onClick={handleSaveAll}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving Results..."
                      : `Save ${
                          selectedSubjectIds.length
                        } Subject${
                          selectedSubjectIds.length === 1
                            ? ""
                            : "s"
                        }`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* No students */}
      {!loadingStudents &&
        classId &&
        selectedSubjectIds.length > 0 &&
        students.length === 0 && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-400">
              No students found in{" "}
              <span className="font-medium text-gray-600">
                {className}
              </span>
              .
            </p>
          </div>
        )}

      {/* Instructions before selection */}
      {!loadingStudents &&
        (!classId ||
          selectedSubjectIds.length === 0) && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700">
              How to enter results
            </h2>

            <ol className="mt-2 space-y-1 text-sm text-gray-500 list-decimal list-inside">
              <li>Select the class.</li>
              <li>Select one or more subjects.</li>
              <li>
                Enter CA1, CA2 and Exam scores.
              </li>
              <li>
                Switch between subjects using the subject
                tabs.
              </li>
              <li>
                Click Save to save all selected subjects.
              </li>
            </ol>
          </div>
        )}
    </div>
  );
}