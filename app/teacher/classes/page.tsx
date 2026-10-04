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
   * Load teacher and classes.
   */
  useEffect(() => {
    if (!profile?.uid) {
      return;
    }

    let mounted = true;

    setLoading(true);
    setError("");

    Promise.all([
      getTeacherByAuthUid(
        profile.uid
      ),
      getClasses(),
    ])
      .then(
        ([
          teacherRecord,
          classList,
        ]) => {
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
        }
      )
      .catch((err) => {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your classes."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  /*
   * Build the complete list of classes
   * available to this teacher.
   *
   * Supports:
   * - classIds
   * - formClassId
   * - formMasterClassId
   */
  const myClassIds =
    useMemo(() => {
      const ids = new Set<string>();

      for (
        const id of
          teacher?.classIds || []
      ) {
        if (
          typeof id === "string" &&
          id.trim()
        ) {
          ids.add(
            id.trim()
          );
        }
      }

      const formClassId =
        typeof teacher?.formClassId ===
        "string"
          ? teacher.formClassId.trim()
          : "";

      const formMasterClassId =
        typeof teacher?.formMasterClassId ===
        "string"
          ? teacher.formMasterClassId.trim()
          : "";

      if (formClassId) {
        ids.add(
          formClassId
        );
      }

      if (formMasterClassId) {
        ids.add(
          formMasterClassId
        );
      }

      return Array.from(ids);
    }, [teacher]);

  /*
   * Match teacher class IDs against
   * the actual classes collection.
   */
  const myClasses =
    useMemo(
      () =>
        classes.filter(
          (cls) =>
            myClassIds.includes(
              cls.id
            )
        ),
      [
        classes,
        myClassIds,
      ]
    );

  /*
   * Selected class.
   */
  const selectedClass =
    myClasses.find(
      (cls) =>
        cls.id === classId
    ) || null;

  /*
   * Check whether selected class
   * is the teacher's Form Master class.
   */
  const isFormMaster =
    Boolean(
      classId &&
        (
          teacher?.formClassId ===
            classId ||
          teacher?.formMasterClassId ===
            classId
        )
    );

  /*
   * Load students for selected class.
   *
   * Uses the robust helper that checks:
   * - class document ID
   * - legacy class ID
   * - class name
   */
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }

    if (
      !myClassIds.includes(
        classId
      )
    ) {
      setStudents([]);
      return;
    }

    let cancelled = false;

    setLoadingStudents(true);
    setError("");

    getTeacherStudentsByClass(
      classId
    )
      .then((studentList) => {
        if (cancelled) {
          return;
        }

        const list =
          (
            studentList as unknown[]
          ).map((item) => {
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
               * AccountStatus in the current
               * project accepts "active".
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
          });

        setStudents(list);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setStudents([]);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load students."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStudents(
            false
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    classId,
    myClassIds,
  ]);

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

  /*
   * Table columns.
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

  return (
    <div className="max-w-3xl space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Classes
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          View students in your
          assigned classes.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* No classes */}
      {myClasses.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">

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
              onChange={(e) =>
                setClassId(
                  e.target.value
                )
              }
              options={[
                {
                  label:
                    "Select a class",
                  value: "",
                },

                ...myClasses.map(
                  (cls) => {
                    const formMaster =
                      teacher?.formClassId ===
                        cls.id ||
                      teacher?.formMasterClassId ===
                        cls.id;

                    return {
                      label:
                        `${cls.name}${
                          formMaster
                            ? " — Form Master"
                            : ""
                        }`,

                      value:
                        cls.id,
                    };
                  }
                ),
              ]}
            />
          </div>

          {/* Selected class information */}
          {classId && (
            <div className="bg-brand/5 border border-brand/10 rounded-card px-4 py-3">

              <p className="text-sm text-brand-dark">
                {isFormMaster
                  ? "You are the Form Master for this class."
                  : "You are assigned to this class."}
              </p>

              {selectedClass && (
                <p className="text-xs text-gray-500 mt-1">
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
              <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">

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