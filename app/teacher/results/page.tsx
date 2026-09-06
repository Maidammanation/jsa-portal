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
  Student,
  Subject,
} from "@/lib/types";

interface TeacherRecord {
  id: string;

  /*
   * Classes the teacher normally teaches.
   */
  classIds?: string[];

  /*
   * Subjects the teacher normally teaches.
   */
  subjectIds?: string[];

  /*
   * Form Master assignment.
   */
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string;

  /*
   * New permission field.
   *
   * Form Masters receive this automatically when
   * they are assigned a Form Master class.
   */
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

/*
 * Determine the school level of a class.
 */
function getClassLevel(level?: string, name?: string) {
  const value = `${level || ""} ${name || ""}`.toLowerCase();

  if (value.includes("nursery")) return "nursery";

  if (value.includes("primary")) return "primary";

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

  if (value.includes("senior")) return "ss";

  return "";
}

/*
 * Subjects applicable to each school level.
 *
 * This does not change the existing subjects collection.
 * It only determines which subjects are available to a
 * Form Master when they need to upload all results for
 * their Form Master class.
 */
const LEVEL_SUBJECTS: Record<string, string[]> = {
  nursery: [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Social Studies",
    "Civic Education",
    "Physical and Health Education",
    "Computer Studies / ICT",
    "French",
    "Fine Arts",
    "Music",
    "Islamic Religious Studies",
    "Christian Religious Studies",
  ],

  primary: [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Agricultural Science",
    "Social Studies",
    "Civic Education",
    "Christian Religious Studies",
    "Islamic Religious Studies",
    "Physical and Health Education",
    "Computer Studies / ICT",
    "French",
    "Home Economics",
    "Fine Arts",
    "Music",
  ],

  jss: [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Agricultural Science",
    "Social Studies",
    "Civic Education",
    "Christian Religious Studies",
    "Islamic Religious Studies",
    "Physical and Health Education",
    "Computer Studies / ICT",
    "French",
    "Home Economics",
    "Business Studies",
    "Fine Arts",
    "Music",
    "Economics",
    "Geography",
    "Literature in English",
  ],

  ss: [
    "English Language",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Further Mathematics",
    "Economics",
    "Government",
    "Literature in English",
    "Geography",
    "Financial Accounting",
    "Commerce",
    "Agricultural Science",
    "Christian Religious Studies",
    "Islamic Religious Studies",
    "Civic Education",
    "Computer Studies / ICT",
    "French",
    "Physical and Health Education",
    "Fine Arts",
    "Music",
  ],
};

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

  /*
   * Load teacher, classes and subjects.
   */
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

  /*
   * Resolve Form Master class.
   *
   * The new field is formClassId.
   * formMasterClassId remains supported for
   * older records.
   */
  const formMasterClassId =
    teacher?.formClassId ||
    teacher?.formMasterClassId ||
    "";

  /*
   * A teacher is considered a Form Master when
   * a Form Master class is assigned.
   *
   * This also keeps existing Form Masters working
   * even if canUploadAllResults has not yet been
   * written to their Firestore record.
   */
  const isFormMaster =
    Boolean(formMasterClassId) ||
    Boolean(teacher?.canUploadAllResults);

  /*
   * Classes the teacher normally teaches.
   */
  const assignedClasses = useMemo(() => {
    return classes.filter((classRoom) =>
      teacher?.classIds?.includes(classRoom.id)
    );
  }, [classes, teacher]);

  /*
   * Form Master class.
   */
  const formMasterClass = useMemo(() => {
    return classes.find(
      (classRoom) =>
        classRoom.id === formMasterClassId
    );
  }, [classes, formMasterClassId]);

  /*
   * Classes available on the result page.
   *
   * Normal teachers:
   *   Only assigned classes.
   *
   * Form Masters:
   *   Assigned classes PLUS their Form Master
   *   class, if it is not already included.
   */
  const myClasses = useMemo(() => {
    const map = new Map<string, ClassRoom>();

    assignedClasses.forEach((classRoom) => {
      map.set(classRoom.id, classRoom);
    });

    if (
      isFormMaster &&
      formMasterClass
    ) {
      map.set(
        formMasterClass.id,
        formMasterClass
      );
    }

    return Array.from(map.values());
  }, [
    assignedClasses,
    isFormMaster,
    formMasterClass,
  ]);

  /*
   * Subjects the teacher normally teaches.
   */
  const mySubjects = useMemo(() => {
    return subjects.filter((subject) =>
      teacher?.subjectIds?.includes(subject.id)
    );
  }, [subjects, teacher]);

  /*
   * Determine whether the selected class is
   * the Form Master's class.
   */
  const selectedClassIsFormMasterClass =
    Boolean(
      isFormMaster &&
      formMasterClassId &&
      classId === formMasterClassId
    );

  /*
   * Get all subjects applicable to a class.
   *
   * This is used only when a Form Master is
   * uploading results for their Form Master class.
   */
  const getSubjectsForClass = (
    selectedClassId: string
  ) => {
    const selectedClass = classes.find(
      (classRoom) =>
        classRoom.id === selectedClassId
    );

    if (!selectedClass) {
      return [];
    }

    const level = getClassLevel(
      selectedClass.level,
      selectedClass.name
    );

    const allowedNames =
      new Set(
        (LEVEL_SUBJECTS[level] || []).map(
          (name) =>
            name.trim().toLowerCase()
        )
      );

    return subjects.filter((subject) =>
      allowedNames.has(
        subject.name
          .trim()
          .toLowerCase()
      )
    );
  };

  /*
   * Subjects available for the currently
   * selected class.
   *
   * Normal teacher:
   *   Assigned subjects only.
   *
   * Form Master class:
   *   All subjects applicable to that class.
   *
   * Form Master teaching another assigned class:
   *   Their normal assigned subjects only.
   */
  const availableSubjects = useMemo(() => {
    if (!classId) {
      return [];
    }

    if (
      selectedClassIsFormMasterClass
    ) {
      return getSubjectsForClass(classId);
    }

    return mySubjects;
  }, [
    classId,
    selectedClassIsFormMasterClass,
    mySubjects,
    subjects,
    classes,
  ]);

  /*
   * Make sure the selected subject is still
   * valid when the class changes.
   */
  useEffect(() => {
    if (!classId) {
      setSubjectId("");
      return;
    }

    if (subjectId === "") {
      return;
    }

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
   * Clear subject/results when class changes.
   */
  const handleClassChange = (
    value: string
  ) => {
    setClassId(value);
    setSubjectId("");
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  };

  /*
   * Handle subject change.
   */
  const handleSubjectChange = (
    value: string
  ) => {
    setSubjectId(value);
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  };

  /*
   * Load students and existing results.
   */
  useEffect(() => {
    if (!classId || !subjectId) {
      setStudents([]);
      setScores({});
      return;
    }

    /*
     * Final permission protection.
     *
     * Normal teachers can only use assigned
     * classes and subjects.
     *
     * Form Masters can use all subjects for
     * their Form Master class.
     */
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
                ? String(previous.ca1)
                : "",

            ca2:
              previous?.ca2 !==
                undefined &&
              previous?.ca2 !== null
                ? String(previous.ca2)
                : "",

            exam:
              previous?.exam !==
                undefined &&
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
  }, [
    classId,
    subjectId,
    term,
    session,
    myClasses,
    availableSubjects,
  ]);

  /*
   * Set individual score.
   */
  const setScore = (
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) => {
    let nextValue = value;

    if (value !== "") {
      const numberValue =
        Number(value);

      if (
        Number.isNaN(numberValue)
      ) {
        return;
      }

      const maximum =
        field === "exam"
          ? 60
          : 20;

      if (
        numberValue > maximum
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
        ...(previous[studentId] ||
          emptyScore()),

        [field]: nextValue,
      },
    }));
  };

  /*
   * Save all results.
   */
  const handleSaveAll = async () => {
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

    /*
     * Final permission check before saving.
     */
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
        })
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
  };

  /*
   * Loading screen.
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
   * Teacher record missing.
   */
  if (!teacher) {
    return (
      <div className="max-w-4xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Upload Results
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {session} &middot; {term}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Teacher record could not be found.
          Please contact your administrator.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Upload Results
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {session} &middot; {term}
        </p>

        {isFormMaster && (
          <div className="mt-3 inline-flex items-center rounded-full bg-brand/5 border border-brand/10 px-3 py-1.5">
            <span className="text-xs font-medium text-brand">
              Form Master
              {formMasterClass
                ? ` · ${formMasterClass.name}`
                : ""}
            </span>
          </div>
        )}
      </div>

      {/* Permission information */}
      {isFormMaster && (
        <div className="rounded-lg border border-brand/10 bg-brand/5 px-4 py-3">
          <p className="text-sm font-medium text-gray-700">
            Form Master Result Access
          </p>

          <p className="text-xs text-gray-500 mt-1">
            You can upload results for all applicable
            subjects in your Form Master class when a
            subject teacher is unavailable.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {myClasses.length === 0 ||
      mySubjects.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          {isFormMaster &&
          formMasterClass ? (
            <div>
              <p className="text-sm text-gray-600">
                You are assigned as Form Master of{" "}
                <span className="font-medium">
                  {formMasterClass.name}
                </span>
                .
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Select your Form Master class above to
                access all applicable subjects.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You have no classes or subjects assigned
              yet. Contact your administrator.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Class and Subject Selection */}
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Form Master helper */}
            {selectedClassIsFormMasterClass && (
              <div className="mt-4 rounded-lg border border-brand/10 bg-brand/5 px-4 py-3">
                <p className="text-xs font-medium text-brand">
                  Form Master Mode
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  All subjects applicable to{" "}
                  <span className="font-medium">
                    {formMasterClass?.name}
                  </span>{" "}
                  are available for result entry.
                </p>
              </div>
            )}

            {/* Normal teacher helper */}
            {!selectedClassIsFormMasterClass &&
              classId && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    You can upload results only for
                    subjects assigned to you.
                  </p>
                </div>
              )}
          </div>

          {/* Loading Results */}
          {loadingResults ? (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
              <p className="text-sm text-gray-500">
                Loading students and existing
                results...
              </p>
            </div>
          ) : students.length > 0 ? (
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              {/* Table Header */}
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

                {selectedClassIsFormMasterClass && (
                  <p className="text-xs text-brand mt-2">
                    Uploaded by Form Master for this
                    subject.
                  </p>
                )}
              </div>

              {/* Results Table */}
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

              {/* Save */}
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