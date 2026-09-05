"use client";

import { useEffect, useMemo, useState } from "react";
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

const emptyScore = (): ScoreRow => ({
  ca1: "",
  ca2: "",
  exam: "",
});

export default function AdminResultsPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, SubjectScores>>({});

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load classes and subjects
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [classList, subjectList] = await Promise.all([
          getClasses(),
          getSubjects(),
        ]);

        if (!mounted) return;

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load classes and subjects."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Load students and existing results whenever class/subjects change
  useEffect(() => {
    if (!classId || selectedSubjectIds.length === 0) {
      setStudents([]);
      setScores({});
      setLoadingStudents(false);
      return;
    }

    let mounted = true;

    const loadResults = async () => {
      try {
        setLoadingStudents(true);
        setError("");
        setMessage("");

        const studentList = (await getStudentsByClass(
          classId
        )) as Student[];

        if (!mounted) return;

        setStudents(studentList);

        const resultResponses = await Promise.all(
          selectedSubjectIds.map((subjectId) =>
            getResultsFor(classId, subjectId, term, session)
          )
        );

        if (!mounted) return;

        const nextScores: Record<string, SubjectScores> = {};

        selectedSubjectIds.forEach((subjectId, index) => {
          const results = (resultResponses[index] || []) as ResultEntry[];

          const subjectScores: SubjectScores = {};

          studentList.forEach((student) => {
            const previous = results.find(
              (result) => result.studentId === student.id
            );

            subjectScores[student.id] = {
              ca1:
                previous?.ca1 !== undefined &&
                previous?.ca1 !== null
                  ? String(previous.ca1)
                  : "",
              ca2:
                previous?.ca2 !== undefined &&
                previous?.ca2 !== null
                  ? String(previous.ca2)
                  : "",
              exam:
                previous?.exam !== undefined &&
                previous?.exam !== null
                  ? String(previous.exam)
                  : "",
            };
          });

          nextScores[subjectId] = subjectScores;
        });

        setScores(nextScores);

        if (
          !activeSubjectId ||
          !selectedSubjectIds.includes(activeSubjectId)
        ) {
          setActiveSubjectId(selectedSubjectIds[0] || "");
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load students or existing results."
        );
      } finally {
        if (mounted) {
          setLoadingStudents(false);
        }
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [classId, selectedSubjectIds, term, session]);

  const selectedSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        selectedSubjectIds.includes(subject.id)
      ),
    [subjects, selectedSubjectIds]
  );

  const activeSubject = selectedSubjects.find(
    (subject) => subject.id === activeSubjectId
  );

  const activeScores =
    scores[activeSubjectId] || {};

  const setScore = (
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) => {
    let numericValue = value;

    if (value !== "") {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        return;
      }

      const maximum = field === "exam" ? 60 : 20;

      if (numberValue > maximum) {
        numericValue = String(maximum);
      }

      if (numberValue < 0) {
        numericValue = "0";
      }
    }

    setScores((previous) => ({
      ...previous,
      [activeSubjectId]: {
        ...(previous[activeSubjectId] || {}),
        [studentId]: {
          ...(previous[activeSubjectId]?.[studentId] ||
            emptyScore()),
          [field]: numericValue,
        },
      },
    }));
  };

  const toggleSubject = (subjectId: string) => {
    setMessage("");
    setError("");

    setSelectedSubjectIds((previous) => {
      if (previous.includes(subjectId)) {
        const next = previous.filter((id) => id !== subjectId);

        if (activeSubjectId === subjectId) {
          setActiveSubjectId(next[0] || "");
        }

        return next;
      }

      const next = [...previous, subjectId];

      if (!activeSubjectId) {
        setActiveSubjectId(subjectId);
      }

      return next;
    });
  };

  const handleClassChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setClassId(event.target.value);
    setSelectedSubjectIds([]);
    setActiveSubjectId("");
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  };

  const handleSaveAll = async () => {
    if (!classId) {
      setError("Please select a class.");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    if (students.length === 0) {
      setError("There are no students in the selected class.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const actor =
        profile?.name ||
        profile?.email ||
        "admin";

      const operations = [];

      for (const subjectId of selectedSubjectIds) {
        const subjectScores = scores[subjectId] || {};

        for (const student of students) {
          const row =
            subjectScores[student.id] || emptyScore();

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

          const total = computeTotal(ca1, ca2, exam);
          const grade = computeGrade(total);
          const remark = computeRemark(grade);

          operations.push(
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
                remark,
              },
              actor
            )
          );
        }
      }

      await Promise.all(operations);

      setMessage(
        "Results saved successfully."
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

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-500">
          Loading results page...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Results Management
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {session} &middot; {term}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            label="Class"
            value={classId}
            onChange={handleClassChange}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subjects
            </label>

            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No subjects found.
                </p>
              ) : (
                subjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-center gap-3 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(
                        subject.id
                      )}
                      onChange={() =>
                        toggleSubject(subject.id)
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <span>{subject.name}</span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Select one or more subjects.
            </p>
          </div>
        </div>
      </div>

      {selectedSubjects.length > 0 && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() =>
                    setActiveSubjectId(subject.id)
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeSubjectId === subject.id
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">
                Loading students and existing results...
              </p>
            </div>
          ) : !classId ? (
            <div className="p-6">
              <p className="text-sm text-gray-400">
                Select a class to begin.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-400">
                No students found in this class.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  {activeSubject?.name || "Subject"}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  CA1: 20 &nbsp; | &nbsp; CA2: 20 &nbsp; | &nbsp;
                  Exam: 60
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                      <th className="px-4 py-3 font-medium">
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

                      <th className="px-4 py-3 font-medium">
                        Remark
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const row =
                        activeScores[student.id] ||
                        emptyScore();

                      const ca1 =
                        Math.min(
                          20,
                          Math.max(
                            0,
                            Number(row.ca1) || 0
                          )
                        );

                      const ca2 =
                        Math.min(
                          20,
                          Math.max(
                            0,
                            Number(row.ca2) || 0
                          )
                        );

                      const exam =
                        Math.min(
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

                      const grade = computeGrade(total);

                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                            {student.firstName}{" "}
                            {student.lastName}
                          </td>

                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={row.ca1}
                              onChange={(event) =>
                                setScore(
                                  student.id,
                                  "ca1",
                                  event.target.value
                                )
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </td>

                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={row.ca2}
                              onChange={(event) =>
                                setScore(
                                  student.id,
                                  "ca2",
                                  event.target.value
                                )
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </td>

                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={row.exam}
                              onChange={(event) =>
                                setScore(
                                  student.id,
                                  "exam",
                                  event.target.value
                                )
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </td>

                          <td className="px-4 py-2 font-medium text-gray-700">
                            {total}
                          </td>

                          <td className="px-4 py-2 font-medium text-gray-700">
                            {grade}
                          </td>

                          <td className="px-4 py-2 text-gray-600">
                            {computeRemark(grade)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={handleSaveAll}
                  disabled={saving}
                >
                  {saving
                    ? "Saving Results..."
                    : "Save Results"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {selectedSubjectIds.length === 0 && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Select a class and at least one subject to
            enter results.
          </p>
        </div>
      )}
    </div>
  );
}