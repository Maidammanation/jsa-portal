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

type SubjectScores = Record<
  string,
  ScoreRow
>;

type SubjectSection =
  | "main"
  | "arabic";

type ResultStatus =
  | "open"
  | "locked"
  | "published";

const emptyScore = (): ScoreRow => ({
  ca1: "",
  ca2: "",
  exam: "",
});

function getClassLevel(
  classRoom?: ClassRoom
): SchoolLevel | "" {
  const value =
    `${classRoom?.level || ""} ${
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

function isArabicSubject(
  subject: Subject
) {
  return (
    subject.section === "arabic" ||
    subject.scoringType ===
      "arabic-40-60"
  );
}

function getStatusInfo(
  status: ResultStatus
) {
  if (status === "locked") {
    return {
      label: "LOCKED",
      title: "Results are locked",
      description:
        "Teachers cannot modify results. Administrators can still make corrections.",
      icon: "🔒",
      classes:
        "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (status === "published") {
    return {
      label: "PUBLISHED",
      title: "Results are published",
      description:
        "Students and parents can view their results. Administrators can still make corrections.",
      icon: "🟣",
      classes:
        "border-purple-200 bg-purple-50 text-purple-800",
    };
  }

  return {
    label: "OPEN",
    title: "Results are open",
    description:
      "Teachers can upload and correct results.",
    icon: "🟢",
    classes:
      "border-green-200 bg-green-50 text-green-800",
  };
}

export default function AdminResultsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
  } = useSchoolSettings();

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [classId, setClassId] =
    useState("");

  const [
    selectedSubjectIds,
    setSelectedSubjectIds,
  ] = useState<string[]>([]);

  const [
    activeSubjectId,
    setActiveSubjectId,
  ] = useState("");

  const [
    activeSection,
    setActiveSection,
  ] = useState<SubjectSection>("main");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [scores, setScores] =
    useState<
      Record<string, SubjectScores>
    >({});

  const [studentSearch, setStudentSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingResultKey,
    setDeletingResultKey,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ============================================================
  // LOAD CLASSES + SUBJECTS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          classList,
          subjectList,
        ] = await Promise.all([
          getClasses(),
          getSubjects(),
        ]);

        if (!mounted) return;

        setClasses(
          classList as ClassRoom[]
        );

        setSubjects(
          subjectList as Subject[]
        );
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

  // ============================================================
  // SELECTED CLASS
  // ============================================================

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) =>
          item.id === classId
      ),
    [classes, classId]
  );

  const classLevel = useMemo(
    () =>
      getClassLevel(
        selectedClass
      ),
    [selectedClass]
  );

  // ============================================================
  // AVAILABLE SUBJECTS
  // ============================================================

  const availableSubjects =
    useMemo(() => {
      if (!classLevel) {
        return [];
      }

      return subjects.filter(
        (subject) =>
          subject.levels?.includes(
            classLevel
          )
      );
    }, [subjects, classLevel]);

  const mainSubjects = useMemo(
    () =>
      availableSubjects.filter(
        (subject) =>
          !isArabicSubject(subject)
      ),
    [availableSubjects]
  );

  const arabicSubjects = useMemo(
    () =>
      availableSubjects.filter(
        (subject) =>
          isArabicSubject(subject)
      ),
    [availableSubjects]
  );

  const selectedSubjects = useMemo(
    () =>
      availableSubjects.filter(
        (subject) =>
          selectedSubjectIds.includes(
            subject.id
          )
      ),
    [
      availableSubjects,
      selectedSubjectIds,
    ]
  );

  const displayedSelectedSubjects =
    useMemo(
      () =>
        selectedSubjects.filter(
          (subject) =>
            activeSection ===
            "arabic"
              ? isArabicSubject(
                  subject
                )
              : !isArabicSubject(
                  subject
                )
        ),
      [
        selectedSubjects,
        activeSection,
      ]
    );

  // ============================================================
  // ARABIC STUDENTS
  // ============================================================

  const arabicStudents =
    useMemo(
      () =>
        students.filter(
          (student) =>
            student.attendsArabic ===
            true
        ),
      [students]
    );

  const displayedStudents =
    useMemo(() => {
      const base =
        activeSection ===
        "arabic"
          ? arabicStudents
          : students;

      const search =
        studentSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return base;
      }

      return base.filter(
        (student) => {
          const fullName =
            `${student.firstName} ${student.lastName}`
              .toLowerCase();

          const admission =
            (
              student.admissionNo ||
              ""
            ).toLowerCase();

          return (
            fullName.includes(search) ||
            admission.includes(search)
          );
        }
      );
    }, [
      activeSection,
      arabicStudents,
      students,
      studentSearch,
    ]);

  // ============================================================
  // LOAD STUDENTS + RESULTS
  // ============================================================

  useEffect(() => {
    if (
      !classId ||
      selectedSubjectIds.length === 0
    ) {
      setStudents([]);
      setScores({});
      setLoadingStudents(false);
      return;
    }

    const invalidSelectedSubjects =
      selectedSubjectIds.filter(
        (id) =>
          !availableSubjects.some(
            (subject) =>
              subject.id === id
          )
      );

    if (
      invalidSelectedSubjects.length >
      0
    ) {
      setSelectedSubjectIds(
        (current) =>
          current.filter((id) =>
            availableSubjects.some(
              (subject) =>
                subject.id === id
            )
          )
      );

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
          (
            subjectId,
            index
          ) => {
            const results =
              (resultResponses[
                index
              ] || []) as ResultEntry[];

            const subjectScores: SubjectScores =
              {};

            studentList.forEach(
              (student) => {
                const previous =
                  results.find(
                    (result) =>
                      result.studentId ===
                      student.id
                  );

                subjectScores[
                  student.id
                ] = {
                  ca1:
                    previous?.ca1 !==
                      undefined &&
                    previous?.ca1 !== null
                      ? String(
                          previous.ca1
                        )
                      : "",

                  ca2:
                    previous?.ca2 !==
                      undefined &&
                    previous?.ca2 !== null
                      ? String(
                          previous.ca2
                        )
                      : "",

                  exam:
                    previous?.exam !==
                      undefined &&
                    previous?.exam !== null
                      ? String(
                          previous.exam
                        )
                      : "",
                };
              }
            );

            nextScores[
              subjectId
            ] = subjectScores;
          }
        );

        setScores(nextScores);

        setActiveSubjectId(
          (current) => {
            if (
              current &&
              selectedSubjectIds.includes(
                current
              )
            ) {
              return current;
            }

            return (
              selectedSubjectIds[0] ||
              ""
            );
          }
        );
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
  ]);

  // ============================================================
  // ACTIVE SUBJECT
  // ============================================================

  const activeSubject =
    selectedSubjects.find(
      (subject) =>
        subject.id ===
        activeSubjectId
    );

  const activeScores =
    scores[activeSubjectId] ||
    {};

  const isArabic =
    activeSubject !== undefined &&
    isArabicSubject(
      activeSubject
    );

  // ============================================================
  // RESULT STATUS
  // ============================================================

  const currentResultStatus =
    getStatusInfo(
      resultStatus as ResultStatus
    );

  // ============================================================
  // SCORE SUMMARY
  // ============================================================

  const resultSummary =
    useMemo(() => {
      if (
        !activeSubject ||
        displayedStudents.length ===
          0
      ) {
        return {
          completed: 0,
          pending: 0,
          total: 0,
        };
      }

      let completed = 0;

      displayedStudents.forEach(
        (student) => {
          const row =
            activeScores[
              student.id
            ];

          if (!row) return;

          const hasScore =
            row.ca1 !== "" ||
            row.ca2 !== "" ||
            row.exam !== "";

          if (hasScore) {
            completed++;
          }
        }
      );

      return {
        completed,
        pending:
          displayedStudents.length -
          completed,
        total:
          displayedStudents.length,
      };
    }, [
      activeSubject,
      displayedStudents,
      activeScores,
    ]);

  // ============================================================
  // SECTION CHANGE
  // ============================================================

  const handleSectionChange = (
    section: SubjectSection
  ) => {
    setActiveSection(section);
    setStudentSearch("");
    setMessage("");
    setError("");

    const subjectsForSection =
      section === "arabic"
        ? arabicSubjects
        : mainSubjects;

    const selectedForSection =
      subjectsForSection.filter(
        (subject) =>
          selectedSubjectIds.includes(
            subject.id
          )
      );

    if (
      selectedForSection.length > 0
    ) {
      setActiveSubjectId(
        selectedForSection[0].id
      );
    } else {
      setActiveSubjectId("");
    }
  };

  // ============================================================
  // CLASS CHANGE
  // ============================================================

  const handleClassChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setClassId(
      event.target.value
    );

    setSelectedSubjectIds([]);
    setActiveSubjectId("");
    setActiveSection("main");

    setStudents([]);
    setScores([]);
    setStudentSearch("");

    setMessage("");
    setError("");
  };

  // ============================================================
  // SUBJECT TOGGLE
  // ============================================================

  const toggleSubject = (
    subjectId: string
  ) => {
    setMessage("");
    setError("");

    setSelectedSubjectIds(
      (previous) => {
        if (
          previous.includes(
            subjectId
          )
        ) {
          const next =
            previous.filter(
              (id) =>
                id !== subjectId
            );

          if (
            activeSubjectId ===
            subjectId
          ) {
            const remaining =
              next.filter((id) => {
                const subject =
                  availableSubjects.find(
                    (item) =>
                      item.id === id
                  );

                if (!subject) {
                  return false;
                }

                return activeSection ===
                  "arabic"
                  ? isArabicSubject(
                      subject
                    )
                  : !isArabicSubject(
                      subject
                    );
              });

            setActiveSubjectId(
              remaining[0] || ""
            );
          }

          return next;
        }

        setActiveSubjectId(
          subjectId
        );

        return [
          ...previous,
          subjectId,
        ];
      }
    );
  };

  // ============================================================
  // SCORE INPUT
  // ============================================================

  const setScore = (
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) => {
    if (
      isArabic &&
      field === "ca2"
    ) {
      return;
    }

    let numericValue = value;

    if (value !== "") {
      const numberValue =
        Number(value);

      if (
        Number.isNaN(
          numberValue
        )
      ) {
        return;
      }

      const maximum =
        isArabic &&
        field === "ca1"
          ? 40
          : field === "exam"
          ? 60
          : 20;

      if (
        numberValue > maximum
      ) {
        numericValue =
          String(maximum);
      }

      if (
        numberValue < 0
      ) {
        numericValue = "0";
      }
    }

    setScores(
      (previous) => ({
        ...previous,

        [activeSubjectId]: {
          ...(previous[
            activeSubjectId
          ] || {}),

          [studentId]: {
            ...(previous[
              activeSubjectId
            ]?.[studentId] ||
              emptyScore()),

            [field]:
              numericValue,
          },
        },
      })
    );
  };

  // ============================================================
  // SAVE RESULTS
  // ============================================================

  const handleSaveAll =
    async () => {
      if (!classId) {
        setError(
          "Please select a class."
        );
        return;
      }

      if (
        selectedSubjectIds.length ===
        0
      ) {
        setError(
          "Please select at least one subject."
        );
        return;
      }

      if (
        students.length === 0
      ) {
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

        const operations =
          [];

        for (
          const subjectId of selectedSubjectIds
        ) {
          const subject =
            subjects.find(
              (item) =>
                item.id ===
                subjectId
            );

          if (!subject) {
            continue;
          }

          const arabic =
            isArabicSubject(
              subject
            );

          const studentsForSubject =
            arabic
              ? arabicStudents
              : students;

          const subjectScores =
            scores[
              subjectId
            ] || {};

          for (
            const student of studentsForSubject
          ) {
            const row =
              subjectScores[
                student.id
              ] ||
              emptyScore();

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
                  Number(
                    row.ca1
                  ) || 0
                )
              );

              ca2 = 0;

              exam = Math.min(
                60,
                Math.max(
                  0,
                  Number(
                    row.exam
                  ) || 0
                )
              );
            } else {
              ca1 = Math.min(
                20,
                Math.max(
                  0,
                  Number(
                    row.ca1
                  ) || 0
                )
              );

              ca2 = Math.min(
                20,
                Math.max(
                  0,
                  Number(
                    row.ca2
                  ) || 0
                )
              );

              exam = Math.min(
                60,
                Math.max(
                  0,
                  Number(
                    row.exam
                  ) || 0
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
              computeGrade(
                total
              );

            const remark =
              computeRemark(
                grade
              );

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
          `Results saved successfully for ${operations.length} student result${
            operations.length ===
            1
              ? ""
              : "s"
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

  // ============================================================
  // DELETE RESULT
  // ============================================================

  const handleDeleteResult =
    async (
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
            item.id ===
            studentId
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

      setDeletingResultKey(
        key
      );

      setError("");
      setMessage("");

      try {
        await deleteResult(
          studentId,
          activeSubjectId,
          term,
          session
        );

        setScores(
          (previous) => ({
            ...previous,

            [activeSubjectId]: {
              ...(previous[
                activeSubjectId
              ] || {}),

              [studentId]:
                emptyScore(),
            },
          })
        );

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
        setDeletingResultKey(
          ""
        );
      }
    };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="max-w-6xl py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading Results Management...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="max-w-7xl space-y-5 pb-10">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl bg-brand p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              JSA ACADEMIC MANAGEMENT
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Results Management
            </h1>

            <p className="mt-1 text-sm text-white/75">
              Enter, review and manage student
              academic results.
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/60">
              Current Academic Period
            </p>

            <p className="mt-1 text-sm font-bold">
              {session}
            </p>

            <p className="text-xs text-white/70">
              {term}
            </p>
          </div>

        </div>
      </div>

      {/* ======================================================
          RESULT STATUS
      ====================================================== */}

      <div
        className={`rounded-xl border px-4 py-3 ${currentResultStatus.classes}`}
      >
        <div className="flex items-start gap-3">

          <span className="text-xl">
            {currentResultStatus.icon}
          </span>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <p className="text-sm font-bold">
                {currentResultStatus.title}
              </p>

              <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-bold tracking-wider">
                {currentResultStatus.label}
              </span>

            </div>

            <p className="mt-1 text-xs opacity-80">
              {currentResultStatus.description}
            </p>

          </div>

        </div>
      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* ======================================================
          CLASS SELECTION
      ====================================================== */}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            1. Select Class
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Choose the class whose results you want to
            manage.
          </p>
        </div>

        <SelectInput
          label="Class"
          value={classId}
          onChange={
            handleClassChange
          }
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

        {selectedClass && (
          <div className="mt-1 flex flex-wrap gap-2">

            <span className="rounded-full bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
              {selectedClass.name}
            </span>

            {classLevel && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                {classLevel.toUpperCase()}
              </span>
            )}

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
              {students.length} students
            </span>

          </div>
        )}

      </section>

      {/* ======================================================
          CURRICULUM SECTION
      ====================================================== */}

      {classId && (
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">

          <div className="border-b border-gray-100 p-5">

            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                2. Choose Curriculum Section
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  handleSectionChange(
                    "main"
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  activeSection ===
                  "main"
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <p className="font-bold">
                  Main School Subjects
                </p>

                <p
                  className={`mt-1 text-xs ${
                    activeSection ===
                    "main"
                      ? "text-white/75"
                      : "text-gray-400"
                  }`}
                >
                  CA1 20 + CA2 20 + Exam 60
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSectionChange(
                    "arabic"
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  activeSection ===
                  "arabic"
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <p className="font-bold">
                  Arabic Section
                </p>

                <p
                  className={`mt-1 text-xs ${
                    activeSection ===
                    "arabic"
                      ? "text-white/75"
                      : "text-gray-400"
                  }`}
                >
                  CA 40 + Exam 60
                </p>
              </button>

            </div>

          </div>

          {/* SUBJECTS */}

          <div className="p-5">

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  3. Select Subjects
                </h3>

                <p className="mt-1 text-xs text-gray-400">
                  Select one or more subjects.
                </p>
              </div>

              {activeSection ===
                "arabic" && (
                <span className="w-fit rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  Arabic students only
                </span>
              )}

            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">

              {activeSection ===
              "arabic" ? (
                arabicSubjects.length ===
                0 ? (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-600">
                      No Arabic subjects configured.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Configure Arabic subjects from
                      Classes & Subjects.
                    </p>
                  </div>
                ) : (
                  arabicSubjects.map(
                    (subject) => (
                      <label
                        key={
                          subject.id
                        }
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50"
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

                        <span className="flex-1 text-sm text-gray-700">
                          {subject.name}
                        </span>

                        <span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-bold text-purple-600">
                          40 / 60
                        </span>
                      </label>
                    )
                  )
                )
              ) : mainSubjects.length ===
                0 ? (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    No main subjects configured
                    for this class level.
                  </p>

                  <p className="mt-1 text-xs text-red-500">
                    Configure the curriculum from
                    Classes & Subjects.
                  </p>
                </div>
              ) : (
                mainSubjects.map(
                  (subject) => (
                    <label
                      key={
                        subject.id
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50"
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

                      <span className="flex-1 text-sm text-gray-700">
                        {subject.name}
                      </span>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-500">
                        20 / 20 / 60
                      </span>
                    </label>
                  )
                )
              )}

            </div>

          </div>

        </section>
      )}

      {/* ======================================================
          RESULTS
      ====================================================== */}

      {selectedSubjects.length >
        0 && (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          {/* SUBJECT NAVIGATION */}

          <div className="border-b border-gray-100 p-4">

            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  4. Enter Results
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Select a subject below.
                </p>
              </div>

              {selectedSubjectIds.length >
                0 && (
                <span className="text-xs text-gray-400">
                  {
                    selectedSubjectIds.length
                  }{" "}
                  subject
                  {selectedSubjectIds.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  selected
                </span>
              )}

            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">

              {displayedSelectedSubjects.map(
                (subject) => (
                  <button
                    key={
                      subject.id
                    }
                    type="button"
                    onClick={() =>
                      setActiveSubjectId(
                        subject.id
                      )
                    }
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      activeSubjectId ===
                      subject.id
                        ? "bg-brand text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {subject.name}
                  </button>
                )
              )}

            </div>

            {displayedSelectedSubjects.length ===
              0 && (
              <p className="mt-3 text-sm text-gray-400">
                No subjects selected in this
                section.
              </p>
            )}

          </div>

          {/* LOADING */}

          {loadingStudents ? (
            <div className="p-6">
              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Loading students and existing
                  results...
                </p>
              </div>
            </div>
          ) : activeSection ===
              "arabic" &&
            arabicStudents.length ===
              0 ? (
            <div className="p-5">

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">

                <p className="font-semibold text-yellow-800">
                  No Arabic students found.
                </p>

                <p className="mt-1 text-sm text-yellow-700">
                  No students in this class are
                  currently marked as attending Arabic.
                </p>

                <p className="mt-2 text-xs text-yellow-600">
                  Edit the relevant student profile and
                  enable the Arabic Section option.
                </p>

              </div>

            </div>
          ) : displayedStudents.length ===
            0 ? (
            <div className="p-5">
              <p className="text-sm text-gray-400">
                No students found in this class.
              </p>
            </div>
          ) : activeSubject ? (
            <>

              {/* SUBJECT HEADER */}

              <div className="border-b border-gray-100 p-4">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {activeSubject.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {isArabic
                        ? `Arabic Section • CA 40 + Exam 60`
                        : `Main Subject • CA1 20 + CA2 20 + Exam 60`}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">

                    <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-gray-800">
                        {
                          resultSummary.total
                        }
                      </p>

                      <p className="text-[9px] uppercase tracking-wider text-gray-400">
                        Students
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-green-700">
                        {
                          resultSummary.completed
                        }
                      </p>

                      <p className="text-[9px] uppercase tracking-wider text-green-500">
                        Entered
                      </p>
                    </div>

                    <div className="rounded-xl bg-yellow-50 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-yellow-700">
                        {
                          resultSummary.pending
                        }
                      </p>

                      <p className="text-[9px] uppercase tracking-wider text-yellow-500">
                        Pending
                      </p>
                    </div>

                  </div>

                </div>

                {/* SEARCH */}

                <div className="mt-4">

                  <input
                    type="search"
                    value={
                      studentSearch
                    }
                    onChange={(e) =>
                      setStudentSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search student name or admission number..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />

                  {studentSearch && (
                    <p className="mt-1 text-xs text-gray-400">
                      Showing{" "}
                      {
                        displayedStudents.length
                      }{" "}
                      matching student
                      {displayedStudents.length ===
                      1
                        ? ""
                        : "s"}.
                    </p>
                  )}

                </div>

              </div>

              {/* TABLE */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1050px] text-sm">

                  <thead>
                    <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-500">

                      <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3">
                        Student
                      </th>

                      <th className="px-4 py-3">
                        {isArabic
                          ? "CA (40)"
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

                    {displayedStudents.map(
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

                        const remark =
                          computeRemark(
                            grade
                          );

                        const deleteKey =
                          `${student.id}-${activeSubjectId}`;

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="hover:bg-gray-50/70"
                          >

                            <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3">

                              <div className="font-medium text-gray-800">
                                {
                                  student.firstName
                                }{" "}
                                {
                                  student.lastName
                                }
                              </div>

                              <div className="mt-0.5 text-[10px] text-gray-400">
                               