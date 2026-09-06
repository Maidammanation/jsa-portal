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

/*

* Determine the school level of a class.
  */
  function getClassLevel(
  level?: string,
  name?: string
  ): SchoolLevel | "" {
  const value = "${level || ""} ${name || ""}".toLowerCase();

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
* formClassId is the current field.
* formMasterClassId remains supported for
* older teacher records.
  */
  const formMasterClassId =
  teacher?.formClassId ||
  teacher?.formMasterClassId ||
  "";

/*

* A teacher is a Form Master when they have
* a Form Master class or the permission flag.
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
* Normal teacher:
* Assigned classes only.
* 
* Form Master:
* Assigned classes + Form Master class.
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

* Subjects directly assigned to the teacher.
  */
  const mySubjects = useMemo(() => {
  return subjects.filter((subject) =>
  teacher?.subjectIds?.includes(subject.id)
  );
  }, [subjects, teacher]);

/*

* Determine whether the selected class is
* the teacher's Form Master class.
  */
  const selectedClassIsFormMasterClass =
  Boolean(
  isFormMaster &&
  formMasterClassId &&
  classId === formMasterClassId
  );

/*

* Get the selected class.
  */
  const selectedClass = useMemo(() => {
  return classes.find(
  (classRoom) =>
  classRoom.id === classId
  );
  }, [classes, classId]);

/*

* Get the level of the selected class.
  */
  const selectedClassLevel = useMemo(() => {
  if (!selectedClass) {
  return "";
  }

return getClassLevel(
  selectedClass.level,
  selectedClass.name
);

}, [selectedClass]);

/*

* Get all subjects configured for a class.
* 
* Subjects come directly from the
* Classes & Subjects configuration.
* 
* Music is deliberately excluded.
  */
  const getSubjectsForClass = (
  selectedClassId: string
  ) => {
  const classroom = classes.find(
  (classRoom) =>
  classRoom.id === selectedClassId
  );

if (!classroom) {
  return [];
}

const level = getClassLevel(
  classroom.level,
  classroom.name
);

if (!level) {
  return [];
}

return subjects.filter((subject) => {
  if (
    subject.name.trim().toLowerCase() ===
    "music"
  ) {
    return false;
  }

  return Boolean(
    subject.levels?.includes(level)
  );
});

};

/*

* Subjects available for the selected class.
* 
* Form Master:
* All configured subjects for the
* Form Master class.
* 
* Normal teacher:
* Only assigned subjects that are
* applicable to the selected class level.
  */
  const availableSubjects = useMemo(() => {
  if (!classId) {
  return [];
  }

/*
 * Form Master access is independent of
 * subjectIds.
 */
if (selectedClassIsFormMasterClass) {
  return getSubjectsForClass(classId);
}

/*
 * Normal teacher access.
 */
return mySubjects.filter((subject) => {
  if (
    subject.name.trim().toLowerCase() ===
    "music"
  ) {
    return false;
  }

  /*
   * Legacy subject records without levels
   * remain available to the teacher.
   */
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
});

}, [
classId,
selectedClassIsFormMasterClass,
selectedClassLevel,
mySubjects,
subjects,
classes,
]);

/*

* A Form Master may have no subjectIds.
* 
* Normal teachers need at least one
* assigned subject.
  */
  const hasResultAccess =
  myClasses.length > 0 &&
  (mySubjects.length > 0 ||
  isFormMaster);

/*

* Make sure selected subject is still valid
* whenever the class changes.
  */
  useEffect(() => {
  if (!classId) {
  setSubjectId("");
  setStudents([]);
  setScores({});
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

* Handle class change.
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
 * Final class permission check.
 */
const classAllowed =
  myClasses.some(
    (classRoom) =>
      classRoom.id === classId
  );

/*
 * Final subject permission check.
 */
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

* Set an individual score.
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
 * Final class permission check.
 */
const classAllowed =
  myClasses.some(
    (classRoom) =>
      classRoom.id === classId
  );

/*
 * Final subject permission check.
 */
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
     </h1> <p className="text-sm text-gray-500 mt-1">
   {session} &middot; {term}
 </p>
     </div>   <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

  {/* Form Master permission information */}
  {isFormMaster && (
    <div className="rounded-lg border border-brand/10 bg-brand/5 px-4 py-3">
      <p className="text-sm font-medium text-gray-700">
        Form Master Result Access
      </p>

      <p className="text-xs text-gray-500 mt-1">
        You can upload results for all
        subjects configured for your Form
        Master class when a subject teacher
        is unavailable.
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

  {!hasResultAccess ? (
    <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-500">
        You have no classes or subjects
        assigned yet. Contact your
        administrator.
      </p>
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
              All subjects configured for{" "}
              <span className="font-medium">
                {formMasterClass?.name}
              </span>{" "}
              are available for result
              entry.
            </p>
          </div>
        )}

        {/* Normal teacher helper */}
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
                Uploaded by Form Master for
                this subject.
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