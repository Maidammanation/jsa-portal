"use client";

import { useEffect, useMemo, useState } from "react";

import { SelectInput } from "@/components/Forms";
import {
  DataTable,
  type Column,
} from "@/components/Tables";

import {
  getTeacherByAuthUid,
  getClasses,
} from "@/services/database";

import {
  getTeacherStudentsByClass,
} from "@/services/teacherClassStudents";

import { useAuth } from "@/lib/useAuth";

import type {
  ClassRoom,
  Student,
} from "@/lib/types";

interface TeacherRecord {
  id: string;
  classIds?: string[];
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string;
}

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function matchesClass(
  value: unknown,
  classroom: ClassRoom
): boolean {
  const normalizedValue =
    normalize(value);

  if (!normalizedValue) {
    return false;
  }

  return (
    normalizedValue ===
      normalize(classroom.id) ||
    normalizedValue ===
      normalize(classroom.name)
  );
}

export default function TeacherClassesPage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [classId, setClassId] =
    useState("");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * Load teacher record and all classes.
   */
  useEffect(() => {
    if (!profile?.uid) {
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
        ] = await Promise.all([
          getTeacherByAuthUid(
            profile.uid
          ),
          getClasses(),
        ]);

        if (!mounted) {
          return;
        }

        setTeacher(
          teacherRecord as
            | TeacherRecord
            | null
        );

        setClasses(
          classList as ClassRoom[]
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your classes."
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
   * Resolve every possible teacher class assignment.
   *
   * Supported formats:
   * - classIds containing class document IDs
   * - classIds containing class names
   * - formClassId
   * - formMasterClassId
   * - formMasterClassName
   *
   * The result always contains the actual
   * Firestore class document IDs.
   */
  const assignedClasses = useMemo(() => {
    const identifiers = [
      ...(teacher?.classIds || []),

      teacher?.formClassId || "",

      teacher?.formMasterClassId || "",

      teacher?.formMasterClassName || "",
    ].filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    const result =
      new Map<string, ClassRoom>();

    classes.forEach(
      (classroom) => {
        const matches =
          identifiers.some(
            (identifier) =>
              matchesClass(
                identifier,
                classroom
              )
          );

        if (matches) {
          result.set(
            classroom.id,
            classroom
          );
        }
      }
    );

    return Array.from(
      result.values()
    );
  }, [
    classes,
    teacher,
  ]);

  /*
   * These are always the REAL class document IDs.
   */
  const myClassIds = useMemo(
    () =>
      assignedClasses.map(
        (classroom) =>
          classroom.id
      ),
    [assignedClasses]
  );

  /*
   * Selected class.
   */
  const selectedClass =
    assignedClasses.find(
      (classroom) =>
        classroom.id === classId
    ) || null;

  /*
   * Check whether selected class is
   * the teacher's Form Master class.
   */
  const isFormMaster =
    useMemo(() => {
      if (!selectedClass) {
        return false;
      }

      return [
        teacher?.formClassId,

        teacher?.formMasterClassId,

        teacher?.formMasterClassName,
      ].some(
        (value) =>
          matchesClass(
            value,
            selectedClass
          )
      );
    }, [
      selectedClass,
      teacher,
    ]);

  /*
   * Load students whenever the teacher
   * selects a class.
   */
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    /*
     * Security/UI check:
     * the selected class must belong to
     * the teacher's resolved assignments.
     */
    if (
      !myClassIds.includes(
        classId
      )
    ) {
      setStudents([]);
      setLoadingStudents(false);

      setError(
        "You are not assigned to the selected class."
      );

      return;
    }

    let cancelled = false;

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setError("");

        const studentList =
          await getTeacherStudentsByClass(
            classId
          );

        if (cancelled) {
          return;
        }

        /*
         * Convert the generic Firestore
         * records into the Student shape
         * expected by DataTable.
         */
        const list =
          (
            studentList as unknown[]
          ).map(
            (item) => {
              const raw =
                item as Record<
                  string,
                  unknown
                >;

              return {
                id: String(
                  raw.id || ""
                ),

                admissionNo:
                  String(
                    raw.admissionNo ||
                      ""
                  ),

                firstName:
                  String(
                    raw.firstName ||
                      ""
                  ),

                lastName:
                  String(
                    raw.lastName ||
                      ""
                  ),

                classId:
                  String(
                    raw.classId ||
                      classId
                  ),

                className:
                  raw.className
                    ? String(
                        raw.className
                      )
                    : undefined,

                gender:
                  raw.gender ===
                  "female"
                    ? "female"
                    : "male",

                dateOfBirth:
                  raw.dateOfBirth
                    ? String(
                        raw.dateOfBirth
                      )
                    : undefined,

                parentUid:
                  raw.parentUid
                    ? String(
                        raw.parentUid
                      )
                    : undefined,

                parentName:
                  raw.parentName
                    ? String(
                        raw.parentName
                      )
                    : undefined,

                /*
                 * Keep the UI compatible with
                 * the current Student type.
                 */
                status:
                  "active",

                photoUrl:
                  raw.photoUrl
                    ? String(
                        raw.photoUrl
                      )
                    : undefined,

                attendsArabic:
                  raw.attendsArabic ===
                  true,
              } as Student;
            }
          );

        setStudents(list);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setStudents([]);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load students."
        );
      } finally {
        if (!cancelled) {
          setLoadingStudents(
            false
          );
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [
    classId,
    myClassIds,
  ]);

  /*
   * Students table columns.
   */
  const columns: Column<Student>[] =
    [
      {
        header:
          "Admission No.",

        accessor:
          "admissionNo",
      },

      {
        header: "Name",

        accessor:
          "firstName",

        render: (student) =>
          `${student.firstName} ${student.lastName}`,
      },

      {
        header: "Gender",

        accessor:
          "gender",
      },
    ];

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <p className="text-sm text-gray-400">
        Loading...
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Classes
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View students in your assigned
          classes.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-status-disabled/10 px-3 py-2 text-sm text-status-disabled">
          {error}
        </p>
      )}

      {/* No assigned classes */}
      {assignedClasses.length ===
      0 ? (
        <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">

          <p className="text-sm text-status-disabled">
            No classes assigned yet.
            Contact your administrator.
          </p>

        </div>
      ) : (
        <>
          {/* Class selector */}
          <div className="max-w-xs">
            <SelectInput
              label="Class"
              value={classId}
              onChange={(event) => {
                setClassId(
                  event.target.value
                );

                setStudents([]);

                setError("");
              }}
              options={[
                {
                  label:
                    "Select a class",

                  value: "",
                },

                ...assignedClasses.map(
                  (classroom) => {
                    const formMaster =
                      [
                        teacher?.formClassId,

                        teacher?.formMasterClassId,

                        teacher?.formMasterClassName,
                      ].some(
                        (value) =>
                          matchesClass(
                            value,
                            classroom
                          )
                      );

                    return {
                      label:
                        `${classroom.name}${
                          formMaster
                            ? " — Form Master"
                            : ""
                        }`,

                      value:
                        classroom.id,
                    };
                  }
                ),
              ]}
            />
          </div>

          {/* Selected class information */}
          {classId && (
            <div className="rounded-card border border-brand/10 bg-brand/5 px-4 py-3">

              <p className="text-sm text-brand-dark">
                {isFormMaster
                  ? "You are the Form Master for this class."
                  : "You are assigned to this class."}
              </p>

              {selectedClass && (
                <p className="mt-1 text-xs text-gray-500">
                  Class:{" "}

                  <span className="font-medium">
                    {
                      selectedClass.name
                    }
                  </span>
                </p>
              )}

            </div>
          )}

          {/* Loading students */}
          {classId &&
            loadingStudents && (
              <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">

                <p className="text-sm text-gray-400">
                  Loading students...
                </p>

              </div>
            )}

          {/* Students */}
          {classId &&
            !loadingStudents && (
              <DataTable
                columns={columns}
                data={students}
                emptyMessage="No students found in this class."
              />
            )}
        </>
      )}
    </div>
  );
}