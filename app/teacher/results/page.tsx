"use client";

import { useEffect, useState } from "react";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getTeacherByAuthUid,
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

interface TeacherRecord {
  id: string;
  classIds?: string[];
  subjectIds?: string[];
}

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

export default function TeacherResultsPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [scores, setScores] =
    useState<SubjectScores>({});

  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load teacher, classes and subjects
  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    const loadTeacherData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          teacherRecord,
          classList,
          subjectList,
        ] = await Promise.all([
          getTeacherByAuthUid(profile.uid),
          getClasses(),
          getSubjects(),
        ]);

        if (!mounted) return;

        setTeacher(
          teacherRecord as TeacherRecord | null
        );

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load teacher data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTeacherData();

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  const myClasses = classes.filter((classRoom) =>
    teacher?.classIds?.includes(classRoom.id)
  );

  const mySubjects = subjects.filter((subject) =>
    teacher?.subjectIds?.includes(subject.id)
  );

  // Load students and existing results
  useEffect(() => {
    if (!classId || !subjectId) {
      setStudents([]);
      setScores({});
      return;
    }

    let mounted = true;

    const loadResults = async () => {
      try {
        setLoadingResults(true);
        setError("");
        setMessage("");

        const [
          studentList,
          existingResults,
        ] = await Promise.all([
          getStudentsByClass(classId),
          getResultsFor(
            classId,
            subjectId,
            term,
            session
          ),
        ]);

        if (!mounted) return;

        const list = studentList as Student[];

        setStudents(list);

        const results =
          existingResults as ResultEntry[];

        const initial: SubjectScores = {};

        list.forEach((student) => {
          const previous = results.find(
            (result) =>
              result.studentId === student.id
          );

          initial[student.id] = {
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

        setScores(initial);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load students or results."
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
  }, [classId, subjectId, term, session]);

  const setScore = (
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) => {
    let nextValue = value;

    if (value !== "") {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        return;
      }

      const maximum =
        field === "exam" ? 60 : 20;

      if (numberValue > maximum) {
        nextValue = String(maximum);
      }

      if (numberValue < 0) {
        nextValue = "0";
      }
    }

    setScores((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] ||
          emptyScore()),
        [field]: nextValue,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!classId) {
      setError("Please select a class.");
      return;
    }

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (students.length === 0) {
      setError(
        "There are no students in the selected class."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const actor =
        profile?.name ||
        profile?.email ||
        "teacher";

      await Promise.all(
        students.map((student) => {
          const row =
            scores[student.id] ||
            emptyScore();

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

          const grade = computeGrade(total);

          const remark =
            computeRemark(grade);

          return saveResult(
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
          );
        })
      );

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
          Upload Results
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

      {myClasses.length === 0 ||
      mySubjects.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            You have no classes or subjects assigned
            yet. Contact your administrator.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                label="Class"
                value={classId}
                onChange={(event) => {
                  setClassId(
                    event.target.value
                  );
                  setMessage("");
                  setError("");
                }}
                options={[
                  {
                    label: "Select a class",
                    value: "",
                  },
                  ...myClasses.map(
                    (classRoom) => ({
                      label: classRoom.name,
                      value: classRoom.id,
                    })
                  ),
                ]}
              />

              <SelectInput
                label="Subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(
                    event.target.value
                  );
                  setMessage("");
                  setError("");
                }}
                options={[
                  {
                    label: "Select a subject",
                    value: "",
                  },
                  ...mySubjects.map(
                    (subject) => ({
                      label: subject.name,
                      value: subject.id,
                    })
                  ),
                ]}
              />
            </div>
          </div>

          {loadingResults ? (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
              <p className="text-sm text-gray-500">
                Loading students and existing
                results...
              </p>
            </div>
          ) : students.length > 0 ? (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">
                  {subjects.find(
                    (subject) =>
                      subject.id ===
                      subjectId
                  )?.name ||
                    "Selected Subject"}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  CA1: 20 &nbsp; | &nbsp; CA2: 20
                  &nbsp; | &nbsp; Exam: 60
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
                    {students.map(
                      (student) => {
                        const row =
                          scores[
                            student.id
                          ] ||
                          emptyScore();

                        const ca1 =
                          Math.min(
                            20,
                            Math.max(
                              0,
                              Number(
                                row.ca1
                              ) || 0
                            )
                          );

                        const ca2 =
                          Math.min(
                            20,
                            Math.max(
                              0,
                              Number(
                                row.ca2
                              ) || 0
                            )
                          );

                        const exam =
                          Math.min(
                            60,
                            Math.max(
                              0,
                              Number(
                                row.exam
                              ) || 0
                            )
                          );

                        const total =
                          computeTotal(
                            ca1,
                            ca2,
                            exam
                          );

                        const grade =
                          computeGrade(
                            total
                          );

                        return (
                          <tr
                            key={
                              student.id
                            }
                          >
                            <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                              {
                                student.firstName
                              }{" "}
                              {
                                student.lastName
                              }
                            </td>

                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={
                                  row.ca1
                                }
                                onChange={(
                                  event
                                ) =>
                                  setScore(
                                    student.id,
                                    "ca1",
                                    event
                                      .target
                                      .value
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
                                value={
                                  row.ca2
                                }
                                onChange={(
                                  event
                                ) =>
                                  setScore(
                                    student.id,
                                    "ca2",
                                    event
                                      .target
                                      .value
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
                                value={
                                  row.exam
                                }
                                onChange={(
                                  event
                                ) =>
                                  setScore(
                                    student.id,
                                    "exam",
                                    event
                                      .target
                                      .value
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
                              {computeRemark(
                                grade
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={
                    handleSaveAll
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving Results..."
                    : "Save Results"}
                </Button>
              </div>
            </div>
          ) : classId &&
            subjectId ? (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
              <p className="text-sm text-gray-400">
                No students found in this
                class.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
              <p className="text-sm text-gray-400">
                Select a class and subject to
                begin entering results.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}