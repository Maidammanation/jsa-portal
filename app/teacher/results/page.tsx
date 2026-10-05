"use client";

import { useEffect, useMemo, useState } from "react";

import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";

import {
  getTeacherByAuthUid,
  getClasses,
  getSubjects,
  getResultsFor,
  saveResult,
} from "@/services/database";

import {
  getTeacherStudentsByClass,
} from "@/services/teacherClassStudents";

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

interface TeacherStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  classId: string;
  className?: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  parentUid?: string;
  parentName?: string;
  photoUrl?: string;
  attendsArabic?: boolean;
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

function isArabicSubject(
  subject?: Subject
): boolean {
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
    useState<TeacherStudent[]>([]);

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

  useEffect(() => {
    const authUid: string =
      profile?.uid ?? "";

    if (!authUid) {
      setLoading(false);
      return;
    }

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
          getTeacherByAuthUid(authUid),
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

  const formMasterClassId =
    teacher?.formClassId ||
    teacher?.formMasterClassId ||
    "";

  const formMasterClassName =
    teacher?.formMasterClassName?.trim() ||
    "";

  const isFormMaster =
    Boolean(formMasterClassId) ||
    Boolean(formMasterClassName) ||
    Boolean(
      teacher?.canUploadAllResults
    );

  const assignedClasses = useMemo(() => {
    const ids = new Set(
      teacher?.classIds || []
    );

    if (formMasterClassId) {
      ids.add(formMasterClassId);
    }

    return classes.filter(
      (classRoom) =>
        ids.has(classRoom.id)
    );
  }, [
    classes,
    teacher,
    formMasterClassId,
  ]);

  const formMasterClass = useMemo(() => {
    if (formMasterClassId) {
      const byId =
        classes.find(
          (classRoom) =>
            classRoom.id ===
            formMasterClassId
        );

      if (byId) {
        return byId;
      }

      const normalizedStored =
        formMasterClassId
          .trim()
          .toLowerCase();

      const byName =
        classes.find(
          (classRoom) =>
            classRoom.name
              ?.trim()
              .toLowerCase() ===
            normalizedStored
        );

      if (byName) {
        return byName;
      }
    }

    if (formMasterClassName) {
      const normalizedName =
        formMasterClassName
          .trim()
          .toLowerCase();

      return classes.find(
        (classRoom) =>
          classRoom.name
            ?.trim()
            .toLowerCase() ===
          normalizedName
      );
    }

    return undefined;
  }, [
    classes,
    formMasterClassId,
    formMasterClassName,
  ]);

  const resolvedFormMasterClassId =
    formMasterClass?.id ||
    "";

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

    if (isFormMaster) {
      if (formMasterClass) {
        map.set(
          formMasterClass.id,
          formMasterClass
        );
      }
    }

    return Array.from(
      map.values()
    );
  }, [
    assignedClasses,
    isFormMaster,
    formMasterClass,
  ]);

  const mySubjects = useMemo(() => {
    return subjects.filter(
      (subject) =>
        teacher?.subjectIds?.includes(
          subject.id
        )
    );
  }, [subjects, teacher]);

  const selectedClassIsFormMasterClass =
    Boolean(
      isFormMaster &&
      resolvedFormMasterClassId &&
      classId ===
        resolvedFormMasterClassId
    );

  const selectedClass = useMemo(() => {
    return classes.find(
      (classRoom) =>
        classRoom.id === classId
    );
  }, [classes, classId]);

  const selectedClassLevel = useMemo(() => {
    if (!selectedClass) {
      return "";
    }

    return getClassLevel(
      selectedClass.level,
      selectedClass.name
    );
  }, [selectedClass]);

  function getSubjectsForClass(
    selectedClassId: string
  ) {
    const classroom =
      classes.find(
        (classRoom) =>
          classRoom.id ===
          selectedClassId
      );

    if (!classroom) {
      return [];
    }

    const level =
      getClassLevel(
        classroom.level,
        classroom.name
      );

    if (!level) {
      return subjects.filter(
        (subject) =>
          subject.name
            .trim()
            .toLowerCase() !==
          "music"
      );
    }

    return subjects.filter(
      (subject) => {
        if (
          subject.name
            .trim()
            .toLowerCase() ===
          "music"
        ) {
          return false;
        }

        if (
          Array.isArray(
            subject.levels
          ) &&
          subject.levels.length > 0
        ) {
          return subject.levels.includes(
            level
          );
        }

        return true;
      }
    );
  }

  const availableSubjects =
    useMemo(() => {
      if (!classId) {
        return [];
      }

      if (
        selectedClassIsFormMasterClass
      ) {
        return getSubjectsForClass(
          classId
        );
      }

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
            !Array.isArray(
              subject.levels
            ) ||
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

  const hasResultAccess =
    myClasses.length > 0 &&
    (
      mySubjects.length > 0 ||
      isFormMaster
    );

  useEffect(() => {
    if (!classId) {
      setSubjectId("");
      setStudents([]);
      setScores({});
      return;
    }

    if (!subjectId) {
      return;
    }

    const stillAvailable =
      availableSubjects.some(
        (subject) =>
          subject.id ===
          subjectId
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

  function handleSubjectChange(
    value: string
  ) {
    setSubjectId(value);
    setStudents([]);
    setScores({});
    setMessage("");
    setError("");
  }

  useEffect(() => {
    if (!classId || !subjectId) {
      setStudents([]);
      setScores({});
      return;
    }

    const classAllowed =
      myClasses.some(
        (classRoom) =>
          classRoom.id ===
          classId
      );

    const subjectAllowed =
      availableSubjects.some(
        (subject) =>
          subject.id ===
          subjectId
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
          getTeacherStudentsByClass(
            classId
          ),

          getResultsFor(
            classId,
            subjectId,
            term,
            session
          ),
        ]);

        if (!mounted) {
          return;
        }

        /*
         * Keep the result-entry page independent
         * from the Student account-status type.
         *
         * The result page only needs student
         * identity/class information. We do not
         * need to manufacture a fake "active"
         * status for old Firestore records.
         */
        const list: TeacherStudent[] =
          studentList.map(
            (student) => ({
              id: String(
                student.id ?? ""
              ),

              admissionNo: String(
                student.admissionNo ??
                  ""
              ),

              firstName: String(
                student.firstName ??
                  ""
              ),

              lastName: String(
                student.lastName ??
                  ""
              ),

              classId: String(
                student.classId ??
                  classId
              ),

              className:
                student.className !=
                null
                  ? String(
                      student.className
                    )
                  : undefined,

              gender:
                student.gender ===
                "female"
                  ? "female"
                  : "male",

              dateOfBirth:
                student.dateOfBirth !=
                null
                  ? String(
                      student.dateOfBirth
                    )
                  : undefined,

              parentUid:
                student.parentUid !=
                null
                  ? String(
                      student.parentUid
                    )
                  : undefined,

              parentName:
                student.parentName !=
                null
                  ? String(
                      student.parentName
                    )
                  : undefined,

              photoUrl:
                student.photoUrl !=
                null
                  ? String(
                      student.photoUrl
                    )
                  : undefined,

              attendsArabic:
                student.attendsArabic ===
                true,
            })
          );

        setStudents(list);

        const results =
          existingResults as ResultEntry[];

        const initial: SubjectScores =
          {};

        list.forEach(
          (student) => {
            const previous =
              results.find(
                (result) =>
                  result.studentId ===
                  student.id
              );

            initial[
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

        setScores(initial);
      } catch (err) {
        if (!mounted) {
          return;
        }

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

  function setScore(
    studentId: string,
    field: keyof ScoreRow,
    value: string
  ) {
    if (resultsLocked) {
      return;
    }

    const selectedSubject =
      subjects.find(
        (subject) =>
          subject.id ===
          subjectId
      );

    const arabic =
      isArabicSubject(
        selectedSubject
      );

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

    setScores(
      (previous) => ({
        ...previous,

        [studentId]: {
          ...(previous[
            studentId
          ] ||
            emptyScore()),

          [field]:
            nextValue,
        },
      })
    );
  }

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
          classRoom.id ===
          classId
      );

    const subjectAllowed =
      availableSubjects.some(
        (subject) =>
          subject.id ===
          subjectId
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

      const selectedSubject =
        subjects.find(
          (subject) =>
            subject.id ===
            subjectId
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

  const selectedSubject =
    subjects.find(
      (subject) =>
        subject.id ===
        subjectId
    );

  const selectedSubjectIsArabic =
    isArabicSubject(
      selectedSubject
    );

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-500">
          Loading results page...
        </p>
      </div>
    );
  }

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

  return (
    <div className="max-w-6xl space-y-5">

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

          {loadingResults ? (
            <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Loading students and existing
                results...
              </p>
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-sm">

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