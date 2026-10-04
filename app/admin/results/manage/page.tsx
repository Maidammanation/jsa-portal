"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getAll,
  getClasses,
  getSubjects,
  saveResult,
  deleteResultById,
} from "@/services/database";

import {
  computeGrade,
  computeRemark,
} from "@/lib/grading";

import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

type ResultRecord = {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  term: string;
  session: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
};

type StudentRecord = {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  admissionNumber?: string;
  classId?: string;
};

type ClassRecord = {
  id: string;
  name?: string;
  level?: string;
};

type SubjectRecord = {
  id: string;
  name?: string;
  section?: string;
  scoringType?: string;
  levels?: string[];
};

type EditValues = {
  ca1: string;
  ca2: string;
  exam: string;
};

function studentName(student?: StudentRecord) {
  if (!student) return "Unknown Student";

  return [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed Student";
}

function isArabicSubject(subject?: SubjectRecord) {
  return (
    subject?.section === "arabic" ||
    subject?.scoringType === "arabic-40-60"
  );
}

function getTotal(
  ca1: number,
  ca2: number,
  exam: number
) {
  return ca1 + ca2 + exam;
}

export default function ResultsManagementPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
  } = useSchoolSettings();

  const [results, setResults] =
    useState<ResultRecord[]>([]);

  const [students, setStudents] =
    useState<StudentRecord[]>([]);

  const [classes, setClasses] =
    useState<ClassRecord[]>([]);

  const [subjects, setSubjects] =
    useState<SubjectRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [classFilter, setClassFilter] =
    useState("");

  const [subjectFilter, setSubjectFilter] =
    useState("");

  const [editingId, setEditingId] =
    useState("");

  const [editValues, setEditValues] =
    useState<EditValues>({
      ca1: "",
      ca2: "",
      exam: "",
    });

  const [savingId, setSavingId] =
    useState("");

  const [deletingId, setDeletingId] =
    useState("");

  const [deletingStudentId, setDeletingStudentId] =
    useState("");

  const [deletingClassId, setDeletingClassId] =
    useState("");

  async function loadData() {
    try {
      setError("");

      const [
        resultData,
        studentData,
        classData,
        subjectData,
      ] = await Promise.all([
        getAll("results"),
        getAll("students"),
        getClasses(),
        getSubjects(),
      ]);

      const currentResults =
        (resultData as ResultRecord[]).filter(
          (result) =>
            result.term === term &&
            result.session === session
        );

      setResults(currentResults);
      setStudents(
        studentData as StudentRecord[]
      );
      setClasses(
        classData as ClassRecord[]
      );
      setSubjects(
        subjectData as SubjectRecord[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load results."
      );
    }
  }

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        setLoading(true);

        const [
          resultData,
          studentData,
          classData,
          subjectData,
        ] = await Promise.all([
          getAll("results"),
          getAll("students"),
          getClasses(),
          getSubjects(),
        ]);

        if (!mounted) return;

        const currentResults =
          (resultData as ResultRecord[]).filter(
            (result) =>
              result.term === term &&
              result.session === session
          );

        setResults(currentResults);

        setStudents(
          studentData as StudentRecord[]
        );

        setClasses(
          classData as ClassRecord[]
        );

        setSubjects(
          subjectData as SubjectRecord[]
        );
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load results."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      mounted = false;
    };
  }, [term, session]);

  const studentMap = useMemo(() => {
    const map: Record<string, StudentRecord> = {};

    students.forEach((student) => {
      map[student.id] = student;
    });

    return map;
  }, [students]);

  const classMap = useMemo(() => {
    const map: Record<string, ClassRecord> = {};

    classes.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map: Record<string, SubjectRecord> = {};

    subjects.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [subjects]);

  const filteredResults = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return results
      .filter((result) => {
        if (
          classFilter &&
          result.classId !== classFilter
        ) {
          return false;
        }

        if (
          subjectFilter &&
          result.subjectId !== subjectFilter
        ) {
          return false;
        }

        if (!searchValue) return true;

        const student =
          studentMap[result.studentId];

        const name =
          studentName(student).toLowerCase();

        const admission =
          (
            student?.admissionNumber || ""
          ).toLowerCase();

        return (
          name.includes(searchValue) ||
          admission.includes(searchValue)
        );
      })
      .sort((a, b) =>
        studentName(
          studentMap[a.studentId]
        ).localeCompare(
          studentName(
            studentMap[b.studentId]
          )
        )
      );
  }, [
    results,
    search,
    classFilter,
    subjectFilter,
    studentMap,
  ]);

  const uniqueStudents = useMemo(
    () =>
      new Set(
        filteredResults.map(
          (item) => item.studentId
        )
      ).size,
    [filteredResults]
  );

  const uniqueSubjects = useMemo(
    () =>
      new Set(
        filteredResults.map(
          (item) => item.subjectId
        )
      ).size,
    [filteredResults]
  );

  function startEdit(result: ResultRecord) {
    setEditingId(result.id);

    setEditValues({
      ca1:
        result.ca1 !== undefined
          ? String(result.ca1)
          : "",

      ca2:
        result.ca2 !== undefined
          ? String(result.ca2)
          : "",

      exam:
        result.exam !== undefined
          ? String(result.exam)
          : "",
    });

    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId("");

    setEditValues({
      ca1: "",
      ca2: "",
      exam: "",
    });
  }

  async function saveEditedResult(
    result: ResultRecord
  ) {
    const subject =
      subjectMap[result.subjectId];

    const arabic =
      isArabicSubject(subject);

    let ca1 =
      Number(editValues.ca1) || 0;

    let ca2 =
      Number(editValues.ca2) || 0;

    let exam =
      Number(editValues.exam) || 0;

    if (arabic) {
      ca1 = Math.min(
        40,
        Math.max(0, ca1)
      );

      ca2 = 0;
    } else {
      ca1 = Math.min(
        20,
        Math.max(0, ca1)
      );

      ca2 = Math.min(
        20,
        Math.max(0, ca2)
      );
    }

    exam = Math.min(
      60,
      Math.max(0, exam)
    );

    const total =
      getTotal(ca1, ca2, exam);

    const grade =
      computeGrade(total);

    const remark =
      computeRemark(grade);

    try {
      setSavingId(result.id);
      setError("");
      setMessage("");

      const actor =
        profile?.name ||
        profile?.email ||
        "admin";

      await saveResult(
        {
          studentId:
            result.studentId,

          subjectId:
            result.subjectId,

          classId:
            result.classId,

          term:
            result.term,

          session:
            result.session,

          ca1,
          ca2,
          exam,
          total,
          grade,
          remark,
        },
        actor
      );

      setResults((current) =>
        current.map((item) =>
          item.id === result.id
            ? {
                ...item,
                ca1,
                ca2,
                exam,
                total,
                grade,
                remark,
              }
            : item
        )
      );

      setMessage(
        "Result updated successfully."
      );

      cancelEdit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update result."
      );
    } finally {
      setSavingId("");
    }
  }

  async function deleteOneResult(
    result: ResultRecord
  ) {
    const student =
      studentMap[result.studentId];

    const subject =
      subjectMap[result.subjectId];

    const confirmed =
      window.confirm(
        `DELETE RESULT\n\nStudent: ${studentName(
          student
        )}\nSubject: ${
          subject?.name || "Unknown"
        }\n\nThis result will be permanently deleted.\n\nContinue?`
      );

    if (!confirmed) return;

    try {
      setDeletingId(result.id);
      setError("");
      setMessage("");

      await deleteResultById(result.id);

      setResults((current) =>
        current.filter(
          (item) =>
            item.id !== result.id
        )
      );

      setMessage(
        "Subject result deleted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete result."
      );
    } finally {
      setDeletingId("");
    }
  }

  async function deleteStudentResults(
    studentId: string
  ) {
    const student =
      studentMap[studentId];

    const studentResults =
      results.filter(
        (result) =>
          result.studentId === studentId
      );

    if (!studentResults.length) {
      setError(
        "This student has no results for the current term/session."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `DELETE ALL RESULTS?\n\nStudent: ${studentName(
          student
        )}\nSession: ${session}\nTerm: ${term}\n\nThis will permanently delete ${studentResults.length} result record(s).\n\nContinue?`
      );

    if (!confirmed) return;

    try {
      setDeletingStudentId(studentId);
      setError("");
      setMessage("");

      await Promise.all(
        studentResults.map((result) =>
          deleteResultById(result.id)
        )
      );

      setResults((current) =>
        current.filter(
          (result) =>
            result.studentId !== studentId
        )
      );

      setMessage(
        `All results for ${studentName(
          student
        )} have been deleted.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete student results."
      );
    } finally {
      setDeletingStudentId("");
    }
  }

  async function deleteClassResults(
    classId: string
  ) {
    const classroom =
      classMap[classId];

    const classResults =
      results.filter(
        (result) =>
          result.classId === classId
      );

    if (!classResults.length) {
      setError(
        "There are no results for this class."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `⚠️ DELETE WHOLE CLASS RESULTS?\n\nClass: ${
          classroom?.name || "Selected class"
        }\nSession: ${session}\nTerm: ${term}\n\nResult records: ${classResults.length}\n\nTHIS CANNOT BE UNDONE.\n\nContinue?`
      );

    if (!confirmed) return;

    try {
      setDeletingClassId(classId);
      setError("");
      setMessage("");

      await Promise.all(
        classResults.map((result) =>
          deleteResultById(result.id)
        )
      );

      setResults((current) =>
        current.filter(
          (result) =>
            result.classId !== classId
        )
      );

      setMessage(
        `All results for ${
          classroom?.name || "the class"
        } have been deleted.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete class results."
      );
    } finally {
      setDeletingClassId("");
    }
  }

  async function refreshResults() {
    try {
      setRefreshing(true);
      setError("");
      setMessage("");

      await loadData();

      setMessage(
        "Results refreshed successfully."
      );
    } catch {
      setError(
        "Could not refresh results."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading Results Management...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">

      {/* HEADER */}
      <section className="rounded-3xl bg-gray-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-300">
              Academic Control Centre
            </span>

            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Results Management
            </h1>

            <p className="mt-2 text-sm text-gray-300">
              View, edit and safely manage uploaded
              student results.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-[10px] font-bold uppercase text-gray-400">
              Academic Period
            </p>

            <p className="mt-1 text-lg font-extrabold">
              {session}
            </p>

            <p className="text-sm text-gray-300">
              {term}
            </p>
          </div>
        </div>
      </section>

      {/* STATUS */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Result Control Status
            </p>

            <p className="mt-1 text-sm font-bold text-gray-800">
              {resultStatus === "published"
                ? "Results are PUBLISHED"
                : resultStatus === "locked"
                ? "Results are LOCKED"
                : "Results are OPEN"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Admin and Super Admin can manage
              results in every status.
            </p>
          </div>

          <span
            className={
              resultStatus === "published"
                ? "rounded-full bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-700"
                : resultStatus === "locked"
                ? "rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-700"
                : "rounded-full bg-blue-100 px-3 py-1.5 text-xs font-extrabold text-blue-700"
            }
          >
            {resultStatus.toUpperCase()}
          </span>
        </div>
      </section>

      {/* ALERTS */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          ✓ {message}
        </div>
      )}

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">
            Result Records
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {filteredResults.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">
            Students
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {uniqueStudents}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">
            Subjects
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {uniqueSubjects}
          </p>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search student/admission no."
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500"
          />

          <select
            value={classFilter}
            onChange={(e) =>
              setClassFilter(e.target.value)
            }
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
          >
            <option value="">
              All Classes
            </option>

            {classes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={(e) =>
              setSubjectFilter(e.target.value)
            }
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
          >
            <option value="">
              All Subjects
            </option>

            {subjects.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={refreshResults}
            disabled={refreshing}
            className="rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Results"}
          </button>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              id="delete-class"
              className="rounded-xl border border-red-200 px-4 py-3 text-sm"
            >
              <option value="">
                Select class to delete
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                const element =
                  document.getElementById(
                    "delete-class"
                  ) as HTMLSelectElement | null;

                if (element?.value) {
                  deleteClassResults(
                    element.value
                  );
                } else {
                  setError(
                    "Select a class first."
                  );
                }
              }}
              disabled={!!deletingClassId}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {deletingClassId
                ? "Deleting..."
                : "Delete Class Results"}
            </button>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-lg font-extrabold text-gray-900">
            Result List
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Showing {filteredResults.length} result
            record(s)
          </p>
        </div>

        {filteredResults.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-bold text-gray-700">
              No results found
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Try another search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">
                    Student
                  </th>

                  <th className="px-4 py-3">
                    Class
                  </th>

                  <th className="px-4 py-3">
                    Subject
                  </th>

                  <th className="px-3 py-3 text-center">
                    CA1
                  </th>

                  <th className="px-3 py-3 text-center">
                    CA2
                  </th>

                  <th className="px-3 py-3 text-center">
                    Exam
                  </th>

                  <th className="px-3 py-3 text-center">
                    Total
                  </th>

                  <th className="px-3 py-3 text-center">
                    Grade
                  </th>

                  <th className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredResults.map(
                  (result) => {
                    const student =
                      studentMap[
                        result.studentId
                      ];

                    const classroom =
                      classMap[
                        result.classId
                      ];

                    const subject =
                      subjectMap[
                        result.subjectId
                      ];

                    const editing =
                      editingId === result.id;

                    const arabic =
                      isArabicSubject(
                        subject
                      );

                    const previewTotal =
                      getTotal(
                        Number(
                          editValues.ca1
                        ) || 0,

                        arabic
                          ? 0
                          : Number(
                              editValues.ca2
                            ) || 0,

                        Number(
                          editValues.exam
                        ) || 0
                      );

                    return (
                      <tr
                        key={result.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-gray-800">
                            {studentName(
                              student
                            )}
                          </p>

                          <p className="text-[10px] text-gray-400">
                            {student?.admissionNumber ||
                              "No admission number"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {classroom?.name ||
                            "Unknown"}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                          {subject?.name ||
                            "Unknown"}

                          {arabic && (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                              Arabic 40/60
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center">
                          {editing ? (
                            <input
                              type="number"
                              min="0"
                              max={
                                arabic
                                  ? 40
                                  : 20
                              }
                              value={
                                editValues.ca1
                              }
                              onChange={(e) =>
                                setEditValues(
                                  (v) => ({
                                    ...v,
                                    ca1:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-16 rounded-lg border px-2 py-1.5 text-center"
                            />
                          ) : (
                            result.ca1 ?? 0
                          )}
                        </td>

                        <td className="px-3 py-4 text-center">
                          {editing && !arabic ? (
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={
                                editValues.ca2
                              }
                              onChange={(e) =>
                                setEditValues(
                                  (v) => ({
                                    ...v,
                                    ca2:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-16 rounded-lg border px-2 py-1.5 text-center"
                            />
                          ) : (
                            arabic
                              ? "—"
                              : result.ca2 ?? 0
                          )}
                        </td>

                        <td className="px-3 py-4 text-center">
                          {editing ? (
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={
                                editValues.exam
                              }
                              onChange={(e) =>
                                setEditValues(
                                  (v) => ({
                                    ...v,
                                    exam:
                                      e.target.value,
                                  })
                                )
                              }
                              className="w-16 rounded-lg border px-2 py-1.5 text-center"
                            />
                          ) : (
                            result.exam ?? 0
                          )}
                        </td>

                        <td className="px-3 py-4 text-center font-extrabold">
                          {editing
                            ? previewTotal
                            : result.total ?? 0}
                        </td>

                        <td className="px-3 py-4 text-center font-extrabold">
                          {editing
                            ? computeGrade(
                                previewTotal
                              )
                            : result.grade ||
                              "—"}
                        </td>

                        <td className="px-4 py-4">
                          {editing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  saveEditedResult(
                                    result
                                  )
                                }
                                disabled={
                                  savingId ===
                                  result.id
                                }
                                className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {savingId ===
                                result.id
                                  ? "Saving..."
                                  : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelEdit
                                }
                                className="rounded-lg border px-3 py-2 text-xs font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    result
                                  )
                                }
                                className="rounded-lg border px-3 py-2 text-xs font-bold"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteOneResult(
                                    result
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  result.id
                                }
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                              >
                                {deletingId ===
                                result.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteStudentResults(
                                    result.studentId
                                  )
                                }
                                disabled={
                                  deletingStudentId ===
                                  result.studentId
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {deletingStudentId ===
                                result.studentId
                                  ? "Deleting..."
                                  : "Delete Student"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}