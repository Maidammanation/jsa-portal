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
  deleteResult,
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
  SchoolLevel,
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

function getClassLevel(
  classRoom?: ClassRoom
): SchoolLevel | "" {
  const value = `${classRoom?.level || ""} ${
    classRoom?.name || ""
  }`.toLowerCase();

  if (
  value.includes("pre nursery") ||
  value.includes("pre-nursery") ||
  value.includes("prenursery")
) {
  return "pre-nursery";
}

if (value.includes("nursery")) {
  return "nursery";
}

  if (value.includes("primary")) {
    return "primary";
  }

  if (
    value.includes("jss") ||
    value.includes("junior secondary")
  ) {
    return "jss";
  }

  if (
    value.startsWith("ss") ||
    value.includes("senior secondary")
  ) {
    return "ss";
  }

  return "";
}

export default function AdminResultsPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] =
    useState<string[]>([]);
  const [activeSubjectId, setActiveSubjectId] =
    useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] =
    useState<Record<string, SubjectScores>>({});

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingResultKey, setDeletingResultKey] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [classList, subjectList] =
          await Promise.all([
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
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) => item.id === classId
      ),
    [classes, classId]
  );

  const classLevel = useMemo(
    () => getClassLevel(selectedClass),
    [selectedClass]
  );

  /*
   * IMPORTANT:
   * Only show subjects belonging to the
   * selected class level.
   */
  const availableSubjects = useMemo(() => {
    if (!classLevel) {
      return [];
    }

    return subjects.filter((subject) =>
      subject.levels?.includes(classLevel)
    );
  }, [subjects, classLevel]);

  const selectedSubjects = useMemo(
    () =>
      availableSubjects.filter((subject) =>
        selectedSubjectIds.includes(subject.id)
      ),
    [availableSubjects, selectedSubjectIds]
  );

  useEffect(() => {
    if (!classId || selectedSubjectIds.length === 0) {
      setStudents([]);
      setScores({});
      setLoadingStudents(false);
      return;
    }

    /*
     * Remove any subject that does not belong
     * to the currently selected class.
     */
    const invalidSelectedSubjects =
      selectedSubjectIds.filter(
        (id) =>
          !availableSubjects.some(
            (subject) => subject.id === id
          )
      );

    if (invalidSelectedSubjects.length > 0) {
      setSelectedSubjectIds((current) =>
        current.filter(
          (id) =>
            availableSubjects.some(
              (subject) => subject.id === id
            )
        )
      );

      if (
        activeSubjectId &&
        invalidSelectedSubjects.includes(
          activeSubjectId
        )
      ) {
        setActiveSubjectId("");
      }

      return;
    }

    let mounted = true;

    async function loadResults() {
      try {
        setLoadingStudents(true);
        setError("");
        setMessage("");

        const studentList =
          (await getStudentsByClass(
            classId
          )) as Student[];

        if (!mounted) return;

        setStudents(studentList);

        const resultResponses =
          await Promise.all(
            selectedSubjectIds.map(
              (subjectId) =>
                getResultsFor(
                  classId,
                  subjectId,
                  term,
                  session
                )
            )
          );

        if (!mounted) return;

        const nextScores: Record<
          string,
          SubjectScores
        > = {};

        selectedSubjectIds.forEach(
          (subjectId, index) => {
            const results =
              (resultResponses[index] ||
                []) as ResultEntry[];

            const subjectScores: SubjectScores =
              {};

            studentList.forEach((student) => {
              const previous =
                results.find(
                  (result) =>
                    result.studentId ===
                    student.id
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

            nextScores[subjectId] =
              subjectScores;
          });

        setScores(nextScores);

        if (
          !activeSubjectId ||
          !selectedSubjectIds.includes(
            activeSubjectId
          )
        ) {
          setActiveSubjectId(
            selectedSubjectIds[0] || ""
          );
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
    }

    loadResults();

    return () => {
      mounted = false;
    };
  }, [
    classId,
    selectedSubjectIds,
    term,
    session,
    availableSubjects,
    activeSubjectId,
  ]);

  const activeSubject =
    selectedSubjects.find(
      (subject) =>
        subject.id === activeSubjectId
    );

  const activeScores =
    scores[activeSubjectId] || {};

  const isArabic =
    activeSubject?.section === "arabic" ||
    activeSubject?.scoringType ===
      "arabic-40-60";

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

      let maximum = 20;

      if (
        isArabic &&
        field === "ca1"
      ) {
        maximum = 40;
      } else if (
        field === "exam"
      ) {
        maximum = 60;
      }

      if (
        isArabic &&
        field === "ca2"
      ) {
        return;
      }

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
        ...(previous[activeSubjectId] ||
          {}),

        [studentId]: {
          ...(previous[
            activeSubjectId
          ]?.[studentId] ||
            emptyScore()),

          [field]: numericValue,
        },
      },
    }));
  };

  const toggleSubject = (
    subjectId: string
  ) => {
    setMessage("");
    setError("");

    setSelectedSubjectIds((previous) => {
      if (previous.includes(subjectId)) {
        const next = previous.filter(
          (id) => id !== subjectId
        );

        if (
          activeSubjectId === subjectId
        ) {
          setActiveSubjectId(
            next[0] || ""
          );
        }

        return next;
      }

      const next = [
        ...previous,
        subjectId,
      ];

      if (!activeSubjectId) {
        setActiveSubjectId(
          subjectId
        );
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

  /*
   * Edit:
   * Existing scores appear in the inputs.
   * Change them and click Save Results.
   * saveResult() updates the existing Firestore
   * result instead of creating another one.
   */

  const handleSaveAll = async () => {
    if (!classId) {
      setError(
        "Please select a class."
      );
      return;
    }

    if (
      selectedSubjectIds.length === 0
    ) {
      setError(
        "Please select at least one subject."
      );
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
        "admin";

      const operations = [];

      for (
        const subjectId of selectedSubjectIds
      ) {
        const subject =
          subjects.find(
            (item) =>
              item.id === subjectId
          );

        const arabic =
          subject?.section ===
            "arabic" ||
          subject?.scoringType ===
            "arabic-40-60";

        const subjectScores =
          scores[subjectId] || {};

        for (
          const student of students
        ) {
          const row =
            subjectScores[
              student.id
            ] || emptyScore();

          /*
           * If all fields are empty,
           * don't create a fake 0 result.
           */
          if (
            row.ca1 === "" &&
            row.ca2 === "" &&
            row.exam === ""
          ) {
            continue;
          }

          let ca1 = 0;
          let ca2 = 0;
          let exam = 0;

          if (arabic) {
            ca1 = Math.min(
              40,
              Math.max(
                0,
                Number(row.ca1) || 0
              )
            );

            exam = Math.min(
              60,
              Math.max(
                0,
                Number(row.exam) || 0
              )
            );

            ca2 = 0;
          } else {
            ca1 = Math.min(
              20,
              Math.max(
                0,
                Number(row.ca1) || 0
              )
            );

            ca2 = Math.min(
              20,
              Math.max(
                0,
                Number(row.ca2) || 0
              )
            );

            exam = Math.min(
              60,
              Math.max(
                0,
                Number(row.exam) || 0
              )
            );
          }

          const total =
            computeTotal(
              ca1,
              ca2,
              exam
            );

          const grade =
            computeGrade(total);

          const remark =
            computeRemark(grade);

          operations.push(
            saveResult(
              {
                studentId:
                  student.id,
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

      await Promise.all(
        operations
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

  const handleDeleteResult = async (
    studentId: string
  ) => {
    if (
      !activeSubjectId
    ) {
      return;
    }

    const student =
      students.find(
        (item) =>
          item.id === studentId
      );

    const subject =
      subjects.find(
        (item) =>
          item.id ===
          activeSubjectId
      );

    const confirmed =
      window.confirm(
        `Delete the result for ${
          student
            ? `${student.firstName} ${student.lastName}`
            : "this student"
        } in ${
          subject?.name ||
          "this subject"
        }?\n\nThis cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    const key =
      `${studentId}-${activeSubjectId}`;

    setDeletingResultKey(key);
    setError("");
    setMessage("");

    try {
      await deleteResult(
        studentId,
        activeSubjectId,
        term,
        session
      );

      setScores((previous) => ({
        ...previous,

        [activeSubjectId]: {
          ...(previous[
            activeSubjectId
          ] || {}),

          [studentId]:
            emptyScore(),
        },
      }));

      setMessage(
        "Result deleted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete result."
      );
    } finally {
      setDeletingResultKey("");
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

        <p className="mt-1 text-sm text-gray-500">
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

      <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectInput
            label="Class"
            value={classId}
            onChange={handleClassChange}
            options={[
              {
                label:
                  "Select a class",
                value: "",
              },
              ...classes.map(
                (classRoom) => ({
                  label:
                    classRoom.name,
                  value:
                    classRoom.id,
                })
              ),
            ]}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subjects
              {selectedClass &&
                classLevel && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({classLevel.toUpperCase()})
                  </span>
                )}
            </label>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3">
              {!classId ? (
                <p className="text-sm text-gray-400">
                  Select a class first.
                </p>
              ) : availableSubjects.length ===
                0 ? (
                <div>
                  <p className="text-sm text-red-500">
                    No subjects are configured
                    for this class level.
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Go to Classes & Subjects and
                    click “Apply JSA Curriculum
                    Defaults”.
                  </p>
                </div>
              ) : (
                availableSubjects.map(
                  (subject) => {
                    const arabic =
                      subject.section ===
                        "arabic" ||
                      subject.scoringType ===
                        "arabic-40-60";

                    return (
                      <label
                        key={subject.id}
                        className="flex cursor-pointer items-center gap-3 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(
                            subject.id
                          )}
                          onChange={() =>
                            toggleSubject(
                              subject.id
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300"
                        />

                        <span>
                          {subject.name}
                        </span>

                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                          {arabic
                            ? "Arabic · 40/60"
                            : "Main · 20/20/60"}
                        </span>
                      </label>
                    );
                  }
                )
              )}
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Select one or more subjects.
            </p>
          </div>
        </div>
      </div>

      {selectedSubjects.length > 0 && (
        <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map(
                (subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() =>
                      setActiveSubjectId(
                        subject.id
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeSubjectId ===
                      subject.id
                        ? "bg-brand text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {subject.name}
                  </button>
                )
              )}
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-6">
              <p className="text-sm text-gray-500">
                Loading students and existing
                results...
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
              <div className="border-b border-gray-100 px-4 py-4">
                <h2 className="font-semibold text-gray-800">
                  {activeSubject?.name ||
                    "Subject"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {isArabic
                    ? "Arabic: CA 40 + Exam 60"
                    : "Main: CA1 20 + CA2 20 + Exam 60"}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">
                        Student
                      </th>

                      <th className="px-4 py-3">
                        {isArabic
                          ? "C.A. (40)"
                          : "CA1 (20)"}
                      </th>

                      {!isArabic && (
                        <th className="px-4 py-3">
                          CA2 (20)
                        </th>
                      )}

                      <th className="px-4 py-3">
                        Exam (60)
                      </th>

                      <th className="px-4 py-3">
                        Total
                      </th>

                      <th className="px-4 py-3">
                        Grade
                      </th>

                      <th className="px-4 py-3">
                        Remark
                      </th>

                      <th className="px-4 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {students.map(
                      (student) => {
                        const row =
                          activeScores[
                            student.id
                          ] ||
                          emptyScore();

                        const ca1 =
                          Math.min(
                            isArabic
                              ? 40
                              : 20,
                            Math.max(
                              0,
                              Number(
                                row.ca1
                              ) || 0
                            )
                          );

                        const ca2 =
                          isArabic
                            ? 0
                            : Math.min(
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
                            <td className="whitespace-nowrap px-4 py-2 text-gray-700">
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
                                max={
                                  isArabic
                                    ? 40
                                    : 20
                                }
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

                            {!isArabic && (
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
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                              </td>
                            )}

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
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-4 py-2 font-medium">
                              {total}
                            </td>

                            <td className="px-4 py-2 font-medium">
                              {grade}
                            </td>

                            <td className="px-4 py-2 text-gray-600">
                              {computeRemark(
                                grade
                              )}
                            </td>

                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteResult(
                                    student.id
                                  )
                                }
                                disabled={
                                  deletingResultKey ===
                                  `${student.id}-${activeSubjectId}`
                                }
                                className="text-sm text-status-disabled hover:underline disabled:opacity-50"
                              >
                                {deletingResultKey ===
                                `${student.id}-${activeSubjectId}`
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-t border-gray-100 px-4 py-4">
                <Button
                  onClick={
                    handleSaveAll
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Results"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}