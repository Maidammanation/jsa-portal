"use client";

import { useEffect, useMemo, useState } from "react";

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
  SchoolLevel,
  Student,
  Subject,
} from "@/lib/types";

interface TeacherRecord {
  id: string;
  classIds?: string[];
  subjectIds?: string[];
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string;
  canUploadAllResults?: boolean;
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

/**
 * Arabic uses:
 * CA = 40
 * Exam = 60
 * Total = 100
 *
 * Normal subjects use:
 * CA1 = 20
 * CA2 = 20
 * Exam = 60
 * Total = 100
 */
function isArabicSubject(subject?: Subject): boolean {
  return (
    subject?.section === "arabic" ||
    subject?.scoringType === "arabic-40-60"
  );
}

function getClassLevel(
  level?: string,
  name?: string
): SchoolLevel | "" {
  const value =
    `${level || ""} ${name || ""}`.toLowerCase();

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
    value.includes("junior")
  ) {
    return "jss";
  }

  if (
    value.includes("ss ") ||
    value.startsWith("ss")
  ) {
    return "ss";
  }

  if (value.includes("senior")) {
    return "ss";
  }

  return "";
}

export default function TeacherResultsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
  } = useSchoolSettings();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [classId, setClassId] =
    useState("");

  const [subjectId, setSubjectId] =
    useState("");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [scores, setScores] =
    useState<SubjectScores>({});

  const [loading, setLoading] =
    useState(true);

  const [loadingResults, setLoadingResults] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const resultsLocked =
    resultStatus === "locked" ||
    resultStatus === "published";

  /*
   * LOAD TEACHER DATA
   */
  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    async function loadTeacherData() {
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
            : "Could not load teacher data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTeacherData();

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  /*
   * FORM MASTER
   */
  const formMasterClassId =
    teacher?.formClassId ||
    teacher?.formMasterClassId ||
    "";

  const isFormMaster =
    Boolean(formMasterClassId) ||
    Boolean(
      teacher?.canUploadAllResults
    );

  /*
   * ASSIGNED CLASSES
   */
  const assignedClasses = useMemo(() => {
    return classes.filter((classRoom) =>
      teacher?.classIds?.includes(
        classRoom.id
      )
    );
  }, [classes, teacher]);

  /*
   * FORM MASTER CLASS
   */
  const formMasterClass = useMemo(() => {
    return classes.find(
      (classRoom) =>
        classRoom.id ===
        formMasterClassId
    );
  }, [classes, formMasterClassId]);

  /*
   * MY CLASSES
   */
  const myClasses = useMemo(() => {
    const map =
      new Map<string, ClassRoom>();

    assignedClasses.forEach(
      (classRoom) => {
        map.set(
          classRoom.id,
          classRoom
        );
      }
    );

    if (
      isFormMaster &&
      formMasterClass
    ) {
      map.set(
        formMasterClass.id,
        formMasterClass
      );
    }

    return Array.from(
      map.values()
    );
  }, [
    assignedClasses,
    isFormMaster,
    formMasterClass,
  ]);

  /*
   * SUBJECTS ASSIGNED TO TEACHER
   */
  const mySubjects = useMemo(() => {
    return subjects.filter((subject) =>
      teacher?.subjectIds?.includes(
        subject.id
      )
    );
  }, [subjects, teacher]);

  /*
   * IS SELECTED CLASS THE FORM MASTER CLASS?
   */
  const selectedClassIsFormMasterClass =
    Boolean(
      isFormMaster &&
      formMasterClassId &&
      classId === formMasterClassId
    );

  /*
   * SELECTED CLASS
   */
  const selectedClass = useMemo(() => {
    return classes.find(
      (classRoom) =>
        classRoom.id === classId
    );
  }, [classes, classId]);

  /*
   * SELECTED CLASS LEVEL
   */
  const selectedClassLevel = useMemo(() => {
    if (!selectedClass) return "";

    return getClassLevel(
      selectedClass.level,
      selectedClass.name
    );
  }, [selectedClass]);

  /*
   * GET SUBJECTS AVAILABLE FOR A CLASS
   */
  function getSubjectsForClass(
    selectedClassId: string
  ) {
    const classroom =
      classes.find(
        (classRoom) =>
          classRoom.id ===
          selectedClassId
      );

    if (!classroom) return [];

    const level =
      getClassLevel(
        classroom.level,
        classroom.name
      );

    if (!level) return [];

    return subjects.filter(
      (subject) => {
        /*
         * Music remains excluded.
         */
        if (
          subject.name
            .trim()
            .toLowerCase() ===
          "music"
        ) {
          return false;
        }

        return Boolean(
          subject.levels?.includes(
            level
          )
        );
      }
    );
  }

  /*
   * SUBJECTS AVAILABLE TO CURRENT TEACHER
   */
  const availableSubjects =
    useMemo(() => {
      if (!classId) return [];

      /*
       * Form Master can access all
       * subjects configured for the class.
       */
      if (
        selectedClassIsFormMasterClass
      ) {
        return getSubjectsForClass(
          classId
        );
      }

      /*
       * Normal teacher only gets
       * assigned subjects.
       */
      return mySubjects.filter(
        (subject) => {
          if (
            subject.name
              .trim()
              .toLowerCase() ===
            "music"
          ) {
            return false;
          }

          if (!selectedClassLevel) {
            return true;
          }

          if (
            !subject.levels ||
            subject.levels.length === 0
          ) {
            return true;
          }

          return subject.levels.includes(
            selectedClassLevel
          );
        }
      );
    }, [
      classId,
      selectedClassIsFormMasterClass,
      selectedClassLevel,
      mySubjects,
      subjects,
      classes,
    ]);

  /*
   * DOES TEACHER HAVE RESULT ACCESS?
   */
  const hasResultAccess =
    myClasses.length > 0 &&
    (
      mySubjects.length > 0 ||
      isFormMaster
    );

  /*
   * MAKE SURE SELECTED SUBJECT
   * IS STILL AVAILABLE
   */
  useEffect(() => {
    if (!classId) {
      setSubjectId("");
      setStudents([]);
      setScores({});
      return;
    }

    if (!subjectId) return;

    const stillAvailable =
      availableSubjects.some(
        (subject) =>
          subject.id === subjectId
      );

    if (!stillAvailable) {
      setSubjectId("");
      setScores({});
      setStudents([]);
    }
  }, [
    classId,
    subjectId,
    availableSubjects,
  ]);

  /*
   * CLASS CHANGE
   */
  function handleClassChange(
    value: string
  ) {
    setClassId(value);
    setSubjectId("");
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  }

  /*
   * SUBJECT CHANGE
   */
  function handleSubjectChange(
    value: string
  ) {
    setSubjectId(value);
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  }

  /*
   * LOAD STUDENTS + EXISTING RESULTS
   */
  useEffect(() => {
    if (!classId || !subjectId) {
      setStudents([]);
      setScores({});
      return;
    }

    const classAllowed =
      myClasses.some(
        (classRoom) =>
          classRoom.id === classId
      );

    const subjectAllowed =
      availableSubjects.some(
        (subject) =>
          subject.id === subjectId
      );

    if (
      !classAllowed ||
      !subjectAllowed
    ) {
      setStudents([]);
      setScores({});

      setError(
        "You are not permitted to upload results for this class and subject."
      );

      return;
    }

    let mounted = true;

    async function loadResults() {
      try {
        setLoadingResults(true);
        setError("");
        setMessage("");

        const [
          studentList,
          existingResults,
        ] = await Promise.all([
          getStudentsByClass(
            classId
          ),

          getResultsFor(
            classId,
            subjectId,
            term,
            session
          ),
        ]);

        if (!mounted) return;

        const list =
          studentList as Student[];

        setStudents(list);

        const results =
          existingResults as ResultEntry[];

        const initial: SubjectScores =
          {};

        list.forEach((student) => {
          const previous =
            results.find(
              (result) =>
                result.studentId ===
                student.id
            );

          initial[student.id] = {
            ca1:
              previous?.ca1 !==
                undefined &&
              previous?.ca1 !== null
                ? String(
                    previous.ca1
                  )
                : "",

            /*
             * Arabic results store
             * ca2 as 0.
             *
             * We still load it safely
             * for compatibility.
             */
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
    }

    loadResults();

    return () => {
      mounted = false;
    };
  }, [
    classId,
    subjectId,
    term,
    session,
    myClasses,
    availableSubjects,
  ]);

  /*
   * SCORE INPUT HANDLER
   *
   * Normal:
   * CA1 0-20
   * CA2 0-20
   * Exam 0-60
   *
   * Arabic:
   * CA 0-40
   * Exam 0-60
   * CA2 disabled
   */
  function setScore(
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) {
    if (resultsLocked) return;

    const selectedSubject =
      subjects.find(
        (subject) =>
          subject.id === subjectId
      );

    const arabic =
      isArabicSubject(
        selectedSubject
      );

    /*
     * Arabic has no CA2.
     */
    if (
      arabic &&
      field === "ca2"
    ) {
      return;
    }

    let nextValue = value;

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

      let maximum = 20;

      if (field === "exam") {
        maximum = 60;
      } else if (
        arabic &&
        field === "ca1"
      ) {
        maximum = 40;
      }

      if (
        numberValue >
        maximum
      ) {
        nextValue =
          String(maximum);
      }

      if (numberValue < 0) {
        nextValue = "0";
      }
    }

    setScores((previous) => ({
      ...previous,

      [studentId]: {
        ...(previous[
          studentId
        ] ||
          emptyScore()),

        [field]:
          nextValue,
      },
    }));
  }

  /*
   * SAVE ALL RESULTS
   */
  async function handleSaveAll() {
    if (resultsLocked) {
      setError(
        resultStatus ===
          "published"
          ? "Results have been published. Editing is disabled."
          : "Results are locked. Editing is disabled."
      );

      return;
    }

    if (!classId) {
      setError(
        "Please select a class."
      );

      return;
    }

    if (!subjectId) {
      setError(
        "Please select a subject."
      );

      return;
    }

    const classAllowed =
      myClasses.some(
        (classRoom) =>
          classRoom.id === classId
      );

    const subjectAllowed =
      availableSubjects.some(
        (subject) =>
          subject.id === subjectId
      );

    if (
      !classAllowed ||
      !subjectAllowed
    ) {
      setError(
        "You are not permitted to upload results for this class and subject."
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
        "teacher";

      /*
       * Determine scoring system once.
       */
      const selectedSubject =
        subjects.find(
          (subject) =>
            subject.id === subjectId
        );

      const arabic =
        isArabicSubject(
          selectedSubject
        );

      await Promise.all(
        students.map(
          (student) => {
            const row =
              scores[
                student.id
              ] ||
              emptyScore();

            /*
             * Arabic:
             * CA = 40
             * Exam = 60
             * CA2 is always 0
             */
            const ca1 = arabic
              ? Math.min(
                  40,
                  Math.max(
                    0,
                    Number(
                      row.ca1
                    ) || 0
                  )
                )
              : Math.min(
                  20,
                  Math.max(
                    0,
                    Number(
                      row.ca1
                    ) || 0
                  )
                );

            const ca2 = arabic
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

            /*
             * Arabic:
             * CA 40 + Exam 60
             *
             * Normal:
             * CA1 20 + CA2 20 + Exam 60
             */
            const total = arabic
              ? ca1 + exam
              : computeTotal(
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

            return saveResult(
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
            );
          }
        )
      );

      setMessage(
        isFormMaster &&
        selectedClassIsFormMasterClass
          ? "Results saved successfully by Form Master."
          : "Results saved successfully."
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
  }

  /*
   * SELECTED SUBJECT
   */
  const selectedSubject =
    subjects.find(
      (subject) =>
        subject.id === subjectId
    );

  const selectedSubjectIsArabic =
    isArabicSubject(
      selectedSubject
    );

  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-500">
          Loading results page...
        </p>
      </div>
    );
  }

  /*
   * TEACHER NOT FOUND
   */
  if (!teacher) {
    return (
      <div className="max-w-4xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Upload Results
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {session} · {term}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Teacher record could not be found.
          Please contact your administrator.
        </div>
      </div>
    );
  }

  /*
   * PAGE
   */
  return (
    <div className="max-w-6xl space-y-5">

      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Upload Results
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {session} · {term}
        </p>

        {isFormMaster && (
          <div className="mt-3 inline-flex items-center rounded-full border border-brand/10 bg-brand/5 px-3 py-1.5">
            <span className="text-xs font-medium text-brand">
              Form Master
              {formMasterClass
                ? ` · ${formMasterClass.name}`
                : ""}
            </span>
          </div>
        )}
      </div>

      {/* RESULT STATUS */}
      <div
        className={
          resultStatus === "published"
            ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3"
            : resultStatus === "locked"
            ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            : "rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
        }
      >
        <p
          className={
            resultStatus === "published"
              ? "text-sm font-extrabold text-green-800"
              : resultStatus === "locked"
              ? "text-sm font-extrabold text-amber-800"
              : "text-sm font-extrabold text-blue-800"
          }
        >
          {resultStatus === "published"
            ? "Results PUBLISHED — editing is disabled."
            : resultStatus === "locked"
            ? "Results LOCKED — editing is disabled."
            : "Results OPEN — you can enter and edit results."}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {resultStatus === "open"
            ? "Enter scores carefully, then save when you are ready."
            : "Please contact the administrator if a correction is required."}
        </p>
      </div>

      {/* FORM MASTER */}
      {isFormMaster && (
        <div className="rounded-lg border border-brand/10 bg-brand/5 px-4 py-3">
          <p className="text-sm font-medium text-gray-700">
            Form Master Result Access
          </p>

          <p className="mt-1 text-xs text-gray-500">
            You can upload results for all
            subjects configured for your Form
            Master class when a subject teacher
            is unavailable.
          </p>
        </div>
      )}

      {/* ERRORS */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {!hasResultAccess ? (
        <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            You have no classes or subjects
            assigned yet. Contact your
            administrator.
          </p>
        </div>
      ) : (
        <>
          {/* SELECTION */}
          <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <SelectInput
                label="Class"
                value={classId}
                onChange={(event) =>
                  handleClassChange(
                    event.target.value
                  )
                }
                options={[
                  {
                    label:
                      "Select a class",
                    value: "",
                  },

                  ...myClasses.map(
                    (classRoom) => ({
                      label:
                        classRoom.name,
                      value:
                        classRoom.id,
                    })
                  ),
                ]}
              />

              <SelectInput
                label="Subject"
                value={subjectId}
                onChange={(event) =>
                  handleSubjectChange(
                    event.target.value
                  )
                }
                options={[
                  {
                    label:
                      classId
                        ? "Select a subject"
                        : "Select a class first",
                    value: "",
                  },

                  ...availableSubjects.map(
                    (subject) => ({
                      label:
                        subject.name,
                      value:
                        subject.id,
                    })
                  ),
                ]}
              />
            </div>

            {selectedClassIsFormMasterClass && (
              <div className="mt-4 rounded-lg border border-brand/10 bg-brand/5 px-4 py-3">
                <p className="text-xs font-medium text-brand">
                  Form Master Mode
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  All subjects configured for{" "}
                  <span className="font-medium">
                    {formMasterClass?.name}
                  </span>{" "}
                  are available for result
                  entry.
                </p>
              </div>
            )}

            {!selectedClassIsFormMasterClass &&
              classId && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    You can upload results only
                    for subjects assigned to you
                    and applicable to the selected
                    class.
                  </p>
                </div>
              )}
          </div>

          {/* LOADING */}
          {loadingResults ? (
            <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Loading students and existing
                results...
              </p>
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-sm">

              {/* TABLE HEADER */}
              <div className="border-b border-gray-100 px-4 py-4">
                <h2 className="font-semibold text-gray-800">
                  {selectedSubject?.name ||
                    "Selected Subject"}
                </h2>

                {selectedSubjectIsArabic ? (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Arabic Scoring: CA 40 | Exam 60 | Total 100
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    CA1: 20 | CA2: 20 | Exam: 60 | Total: 100
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">
                        Student
                      </th>

                      <th className="px-4 py-3">
                        {selectedSubjectIsArabic
                          ? "CA (40)"
                          : "CA1 (20)"}
                      </th>

                      {!selectedSubjectIsArabic && (
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

                        /*
                         * Arabic:
                         * CA max 40
                         *
                         * Normal:
                         * CA1 max 20
                         */
                        const ca1 =
                          selectedSubjectIsArabic
                            ? Math.min(
                                40,
                                Math.max(
                                  0,
                                  Number(
                                    row.ca1
                                  ) || 0
                                )
                              )
                            : Math.min(
                                20,
                                Math.max(
                                  0,
                                  Number(
                                    row.ca1
                                  ) || 0
                                )
                              );

                        /*
                         * Arabic does not use CA2.
                         */
                        const ca2 =
                          selectedSubjectIsArabic
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

                        /*
                         * Calculate the total according
                         * to the subject scoring system.
                         */
                        const total =
                          selectedSubjectIsArabic
                            ? ca1 + exam
                            : computeTotal(
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
                            {/* STUDENT */}
                            <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                              {
                                student.firstName
                              }{" "}
                              {
                                student.lastName
                              }
                            </td>

                            {/* CA1 / ARABIC CA */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={
                                  selectedSubjectIsArabic
                                    ? 40
                                    : 20
                                }
                                value={
                                  row.ca1
                                }
                                disabled={
                                  resultsLocked
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
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </td>

                            {/* CA2 — NORMAL SUBJECTS ONLY */}
                            {!selectedSubjectIsArabic && (
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={
                                    row.ca2
                                  }
                                  disabled={
                                    resultsLocked
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
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                />
                              </td>
                            )}

                            {/* EXAM */}
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={
                                  row.exam
                                }
                                disabled={
                                  resultsLocked
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
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                              />
                            </td>

                            {/* TOTAL */}
                            <td className="px-4 py-2 font-medium text-gray-700">
                              {total}
                            </td>

                            {/* GRADE */}
                            <td className="px-4 py-2 font-medium text-gray-700">
                              {grade}
                            </td>

                            {/* REMARK */}
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

              {/* SAVE */}
              <div className="flex justify-end border-t border-gray-100 px-4 py-4">
                <Button
                  onClick={
                    handleSaveAll
                  }
                  disabled={
                    saving ||
                    resultsLocked
                  }
                >
                  {resultStatus ===
                  "published"
                    ? "Results Published"
                    : resultStatus ===
                      "locked"
                    ? "Results Locked"
                    : saving
                    ? "Saving Results..."
                    : "Save Results"}
                </Button>
              </div>
            </div>
          ) : classId &&
            subjectId ? (
            <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-400">
                No students found in this
                class.
              </p>
            </div>
          ) : (
            <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
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