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
  const { session, term } = useSchoolSettings();

  const [results, setResults] = useState<ResultRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [selectedStudent, setSelectedStudent] =
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

  /*
   * ============================================================
   * LOAD DATA
   * ============================================================
   */

  const loadData = async () => {
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

      const currentResults = (
        resultData as ResultRecord[]
      ).filter(
        (result) =>
          result.term === term &&
          result.session === session
      );

      setResults(currentResults);
      setStudents(studentData as StudentRecord[]);
      setClasses(classData as ClassRecord[]);
      setSubjects(subjectData as SubjectRecord[]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load results management."
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        setLoading(true);
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

        if (!mounted) return;

        const currentResults = (
          resultData as ResultRecord[]
        ).filter(
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

  /*
   * ============================================================
   * LOOKUPS
   * ============================================================
   */

  const studentMap = useMemo(() => {
    const map: Record<string, StudentRecord> = {};

    students.forEach((student) => {
      map[student.id] = student;
    });

    return map;
  }, [students]);

  const classMap = useMemo(() => {
    const map: Record<string, ClassRecord> = {};

    classes.forEach((classRoom) => {
      map[classRoom.id] = classRoom;
    });

    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map: Record<string, SubjectRecord> = {};

    subjects.forEach((subject) => {
      map[subject.id] = subject;
    });

    return map;
  }, [subjects]);

  /*
   * ============================================================
   * FILTER
   * ============================================================
   */

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

        if (!searchValue) {
          return true;
        }

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
      .sort((a, b) => {
        const studentA =
          studentName(
            studentMap[a.studentId]
          );

        const studentB =
          studentName(
            studentMap[b.studentId]
          );

        return studentA.localeCompare(
          studentB
        );
      });
  }, [
    results,
    search,
    classFilter,
    subjectFilter,
    studentMap,
  ]);

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const uniqueStudents = useMemo(() => {
    return new Set(
      filteredResults.map(
        (result) => result.studentId
      )
    ).size;
  }, [filteredResults]);

  const uniqueSubjects = useMemo(() => {
    return new Set(
      filteredResults.map(
        (result) => result.subjectId
      )
    ).size;
  }, [filteredResults]);

  /*
   * ============================================================
   * EDIT
   * ============================================================
   */

  const startEdit = (
    result: ResultRecord
  ) => {
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
  };

  const cancelEdit = () => {
    setEditingId("");

    setEditValues({
      ca1: "",
      ca2: "",
      exam: "",
    });
  };

  const saveEditedResult = async (
    result: ResultRecord
  ) => {
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
      getTotal(
        ca1,
        ca2,
        exam
      );

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
  };

  /*
   * ============================================================
   * DELETE ONE SUBJECT RESULT
   * ============================================================
   */

  const deleteOneResult = async (
    result: ResultRecord
  ) => {
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

      await deleteResultById(
        result.id
      );

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
  };

  /*
   * ============================================================
   * DELETE COMPLETE STUDENT RESULT
   * ============================================================
   */

  const deleteCompleteStudentResult =
    async (studentId: string) => {
      const student =
        studentMap[studentId];

      const studentResults =
        results.filter(
          (result) =>
            result.studentId ===
            studentId
        );

      if (studentResults.length === 0) {
        setError(
          "This student has no results for the current term/session."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `⚠️ DELETE COMPLETE STUDENT RESULT?\n\nStudent: ${studentName(
            student
          )}\nSession: ${session}\nTerm: ${term}\n\nThis will permanently delete ALL ${studentResults.length} subject result(s) belonging to this student for this term.\n\nThis cannot be undone.\n\nContinue?`
        );

      if (!confirmed) return;

      try {
        setDeletingStudentId(
          studentId
        );
        setError("");
        setMessage("");

        await Promise.all(
          studentResults.map(
            (result) =>
              deleteResultById(
                result.id
              )
          )
        );

        setResults((current) =>
          current.filter(
            (result) =>
              result.studentId !==
              studentId
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
            : "Could not delete the student's complete result."
        );
      } finally {
        setDeletingStudentId("");
      }
    };

  /*
   * ============================================================
   * DELETE WHOLE CLASS RESULTS
   * ============================================================
   */

  const deleteCompleteClassResults =
    async (classId: string) => {
      const classRoom =
        classMap[classId];

      const classResults =
        results.filter(
          (result) =>
            result.classId ===
            classId
        );

      if (classResults.length === 0) {
        setError(
          "There are no results for this class in the current term/session."
        );
        return;
      }

      const studentCount =
        new Set(
          classResults.map(
            (result) =>
              result.studentId
          )
        ).size;

      const confirmed =
        window.confirm(
          `⚠️⚠️ DELETE WHOLE CLASS RESULTS?\n\nClass: ${
            classRoom?.name ||
            "Selected class"
          }\nSession: ${session}\nTerm: ${term}\n\nStudents affected: ${studentCount}\nResult records: ${classResults.length}\n\nTHIS WILL PERMANENTLY DELETE EVERY RESULT FOR THIS CLASS FOR THIS TERM.\n\nTHIS CANNOT BE UNDONE.\n\nAre you absolutely sure?`
        );

      if (!confirmed) return;

      try {
        setDeletingClassId(
          classId
        );
        setError("");
        setMessage("");

        await Promise.all(
          classResults.map(
            (result) =>
              deleteResultById(
                result.id
              )
          )
        );

        setResults((current) =>
          current.filter(
            (result) =>
              result.classId !==
              classId
          )
        );

        setMessage(
          `All results for ${
            classRoom?.name ||
            "the selected class"
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
    };

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const refreshResults = async () => {
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
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="animate-pulse">
            <div className="h-7 w-64 rounded bg-gray-200" />

            <div className="mt-3 h-4 w-96 max-w-full rounded bg-gray-100" />

            <div className="mt-8 h-32 rounded-xl bg-gray-100" />

            <div className="mt-5 h-64 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      {/* HEADER */}
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-lg">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-300">
                  Academic Control Centre
                </div>

                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  Results Management
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                  View, edit and safely delete uploaded
                  student results for the current academic
                  period.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
          </div>
        </div>
      </section>

      {/* ALERTS */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <div className="flex gap-3">
            <span>⚠️</span>
            <div>
              <p className="font-bold">
                Action failed
              </p>
              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          <div className="flex gap-3">
            <span>✅</span>
            <div>
              <p className="font-bold">
                Success
              </p>
              <p className="mt-1">
                {message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Result Records
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {filteredResults.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Students
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {uniqueStudents}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Subjects
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {uniqueSubjects}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Current Period
          </p>

          <p className="mt-2 text-sm font-extrabold text-gray-900">
            {term}
          </p>

          <p className="text-xs text-gray-500">
            {session}
          </p>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Find Results
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-gray-900">
              Filters
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {/* SEARCH */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Search Student
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Name or admission number..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            {/* CLASS */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Class
              </label>

              <select
                value={classFilter}
                onChange={(event) =>
                  setClassFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="">
                  All Classes
                </option>

                {classes.map((classRoom) => (
                  <option
                    key={classRoom.id}
                    value={classRoom.id}
                  >
                    {classRoom.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBJECT */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Subject
              </label>

              <select
                value={subjectFilter}
                onChange={(event) =>
                  setSubjectFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="">
                  All Subjects
                </option>

                {subjects
                  .slice()
                  .sort((a, b) =>
                    (
                      a.name || ""
                    ).localeCompare(
                      b.name || ""
                    )
                  )
                  .map((subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* REFRESH */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={refreshResults}
                disabled={refreshing}
                className="w-full rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Refreshing..."
                  : "↻ Refresh Results"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BULK CLASS DELETE */}
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-red-500">
              Dangerous Action
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-red-900">
              Delete Complete Class Results
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-red-700">
              This permanently removes every uploaded
              result for all students in a selected class
              for {term} — {session}.
            </p>
          </div>

          <div className="flex w-full max-w-sm gap-2">
            <select
              value={selectedStudent}
              onChange={(event) =>
                setSelectedStudent(
                  event.target.value
                )
              }
              className="min-w-0 flex-1 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="">
                Select class...
              </option>

              {classes.map((classRoom) => (
                <option
                  key={classRoom.id}
                  value={classRoom.id}
                >
                  {classRoom.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={
                !selectedStudent ||
                !!deletingClassId
              }
              onClick={() =>
                deleteCompleteClassResults(
                  selectedStudent
                )
              }
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingClassId
                ? "Deleting..."
                : "Delete Class"}
            </button>
          </div>
        </div>
      </section>

      {/* RESULTS TABLE */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Uploaded Academic Records
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-gray-900">
              Result List
            </h2>
          </div>

          <div className="text-xs font-semibold text-gray-400">
            Showing {filteredResults.length} result record(s)
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
              📊
            </div>

            <h3 className="mt-4 text-sm font-bold text-gray-800">
              No results found
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Try another class, subject or student search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Student
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Class
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Subject
                  </th>

                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    CA1
                  </th>

                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    CA2
                  </th>

                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Exam
                  </th>

                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Total
                  </th>

                  <th className="px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Grade
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Action
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

                    const classRoom =
                      classMap[
                        result.classId
                      ];

                    const subject =
                      subjectMap[
                        result.subjectId
                      ];

                    const isEditing =
                      editingId ===
                      result.id;

                    const isArabic =
                      isArabicSubject(
                        subject
                      );

                    return (
                      <tr
                        key={result.id}
                        className="transition hover:bg-gray-50"
                      >
                        {/* STUDENT */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {studentName(
                                student
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-gray-400">
                              {student?.admissionNumber ||
                                "No admission number"}
                            </p>
                          </div>
                        </td>

                        {/* CLASS */}
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {classRoom?.name ||
                            "Unknown"}
                        </td>

                        {/* SUBJECT */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-700">
                            {subject?.name ||
                              "Unknown"}
                          </p>

                          {isArabic && (
                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                              Arabic 40/60
                            </span>
                          )}
                        </td>

                        {/* CA1 */}
                        <td className="px-3 py-4 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max={
                                isArabic
                                  ? 40
                                  : 20
                              }
                              value={
                                editValues.ca1
                              }
                              onChange={(
                                event
                              ) =>
                                setEditValues(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    ca1:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm outline-none focus:border-gray-500"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-700">
                              {result.ca1 ??
                                0}
                            </span>
                          )}
                        </td>

                        {/* CA2 */}
                        <td className="px-3 py-4 text-center">
                          {isEditing ? (
                            isArabic ? (
                              <span className="text-xs text-gray-300">
                                —
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={
                                  editValues.ca2
                                }
                                onChange={(
                                  event
                                ) =>
                                  setEditValues(
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      ca2:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm outline-none focus:border-gray-500"
                              />
                            )
                          ) : (
                            <span className="text-sm font-semibold text-gray-700">
                              {isArabic
                                ? "—"
                                : result.ca2 ??
                                  0}
                            </span>
                          )}
                        </td>

                        {/* EXAM */}
                        <td className="px-3 py-4 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={
                                editValues.exam
                              }
                              onChange={(
                                event
                              ) =>
                                setEditValues(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    exam:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm outline-none focus:border-gray-500"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-700">
                              {result.exam ??
                                0}
                            </span>
                          )}
                        </td>

                        {/* TOTAL */}
                        <td className="px-3 py-4 text-center">
                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-extrabold text-gray-800">
                            {isEditing
                              ? getTotal(
                                  Number(
                                    editValues.ca1
                                  ) || 0,
                                  isArabic
                                    ? 0
                                    : Number(
                                        editValues.ca2
                                      ) || 0,
                                  Number(
                                    editValues.exam
                                  ) || 0
                                )
                              : result.total ??
                                0}
                          </span>
                        </td>

                        {/* GRADE */}
                        <td className="px-3 py-4 text-center">
                          <span className="text-sm font-extrabold text-gray-800">
                            {isEditing
                              ? computeGrade(
                                  getTotal(
                                    Number(
                                      editValues.ca1
                                    ) || 0,
                                    isArabic
                                      ? 0
                                      : Number(
                                          editValues.ca2
                                        ) || 0,
                                    Number(
                                      editValues.exam
                                    ) || 0
                                  )
                                )
                              : result.grade ||
                                "—"}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  savingId ===
                                  result.id
                                }
                                onClick={() =>
                                  saveEditedResult(
                                    result
                                  )
                                }
                                className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50"
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
                                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
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
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  result.id
                                }
                                onClick={() =>
                                  deleteOneResult(
                                    result
                                  )
                                }
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                              >
                                {deletingId ===
                                result.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingStudentId ===
                                  result.studentId
                                }
                                onClick={() =>
                                  deleteCompleteStudentResult(
                                    result.studentId
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingStudentId ===
                                result.studentId
                                  ? "Deleting..."
                                  : "Delete Student Result"}
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

      {/* HELP */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold text-gray-900">
          Result Management Controls
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-extrabold text-gray-800">
              ✏️ Edit
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Correct CA or examination scores after
              a result has already been uploaded.
            </p>
          </div>

          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-sm font-extrabold text-red-800">
              🗑️ Delete Student
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              Removes every subject result belonging
              to one student for the current term.
            </p>
          </div>

          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-sm font-extrabold text-red-800">
              ⚠️ Delete Class
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              Removes all result records for an entire
              class for the current term/session.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}