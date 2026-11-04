
"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

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
  const normalizedValue = normalize(value);

  if (!normalizedValue) return false;

  return (
    normalizedValue === normalize(classroom.id) ||
    normalizedValue === normalize(classroom.name)
  );
}

export default function TeacherStudentsPage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [classId, setClassId] = useState("");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [error, setError] = useState("");

  // Load teacher information and available classes.
  useEffect(() => {
    const uid = profile?.uid ?? "";

    if (!uid) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [teacherData, classData] =
          await Promise.all([
            getTeacherByAuthUid(uid),
            getClasses(),
          ]);

        if (!active) return;

        setTeacher(
          teacherData as TeacherRecord | null
        );

        setClasses(classData as ClassRoom[]);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your classes."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [profile?.uid]);

  // Resolve assigned classes using IDs or class names.
  const assignedClasses = useMemo(() => {
    const identifiers = [
      ...(teacher?.classIds || []),
      teacher?.formClassId || "",
      teacher?.formMasterClassId || "",
      teacher?.formMasterClassName || "",
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    const matched = new Map<string, ClassRoom>();

    classes.forEach((classroom) => {
      const belongsToTeacher =
        identifiers.some((identifier) =>
          matchesClass(identifier, classroom)
        );

      if (belongsToTeacher) {
        matched.set(classroom.id, classroom);
      }
    });

    return Array.from(matched.values());
  }, [teacher, classes]);

  const assignedClassIds = useMemo(
    () => assignedClasses.map((item) => item.id),
    [assignedClasses]
  );

  const selectedClass = assignedClasses.find(
    (item) => item.id === classId
  ) || null;

  const isFormMaster = selectedClass
    ? [
        teacher?.formClassId,
        teacher?.formMasterClassId,
        teacher?.formMasterClassName,
      ].some((value) =>
        matchesClass(value, selectedClass)
      )
    : false;

  // Load students only from an assigned class.
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    if (!assignedClassIds.includes(classId)) {
      setStudents([]);
      setError(
        "You are not assigned to this class."
      );
      setLoadingStudents(false);
      return;
    }

    let active = true;

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setError("");

        const data =
          await getTeacherStudentsByClass(classId);

        if (!active) return;

        const list = (data as unknown[]).map(
          (item) => {
            const raw =
              item as Record<string, unknown>;

            return {
              id: String(raw.id || ""),
              admissionNo: String(
                raw.admissionNo || ""
              ),
              firstName: String(
                raw.firstName || ""
              ),
              lastName: String(
                raw.lastName || ""
              ),
              classId: String(
                raw.classId || classId
              ),
              className: raw.className
                ? String(raw.className)
                : undefined,
              gender:
                raw.gender === "female"
                  ? "female"
                  : "male",
              dateOfBirth: raw.dateOfBirth
                ? String(raw.dateOfBirth)
                : undefined,
              parentUid: raw.parentUid
                ? String(raw.parentUid)
                : undefined,
              parentName: raw.parentName
                ? String(raw.parentName)
                : undefined,
              status: "active",
              photoUrl: raw.photoUrl
                ? String(raw.photoUrl)
                : undefined,
              attendsArabic:
                raw.attendsArabic === true,
            } as Student;
          }
        );

        setStudents(list);
      } catch (err) {
        if (!active) return;

        setStudents([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load students."
        );
      } finally {
        if (active) setLoadingStudents(false);
      }
    }

    void loadStudents();

    return () => {
      active = false;
    };
  }, [classId, assignedClassIds]);

  const columns: Column<Student>[] = [
    {
      header: "Admission No.",
      accessor: "admissionNo",
    },
    {
      header: "Student Name",
      accessor: "firstName",
      render: (student) =>
        `${student.firstName} ${student.lastName}`,
    },
    {
      header: "Gender",
      accessor: "gender",
    },
  ];

  if (loading) {
    return (
      <div className="p-5 text-sm text-gray-500">
        Loading your student records...
      </div>
    );
  }

  return (
    <main className="max-w-5xl space-y-5">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            My Students
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View students in your assigned classes.
          </p>
        </div>

        <Link
          href="/teacher"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {assignedClasses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-800">
            No class assigned
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Your account does not currently have an
            assigned class. Please contact the school
            administrator to check your class assignment.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <SelectInput
              label="Select Class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setStudents([]);
                setError("");
              }}
              options={[
                {
                  label: "Choose a class",
                  value: "",
                },
                ...assignedClasses.map((classroom) => {
                  const formMaster = [
                    teacher?.formClassId,
                    teacher?.formMasterClassId,
                    teacher?.formMasterClassName,
                  ].some((value) =>
                    matchesClass(value, classroom)
                  );

                  return {
                    label:
                      classroom.name +
                      (formMaster
                        ? " — Form Master"
                        : ""),
                    value: classroom.id,
                  };
                }),
              ]}
            />
          </div>

          {selectedClass && (
            <div className="rounded-xl border border-brand/10 bg-brand/5 p-4">
              <p className="font-semibold text-gray-800">
                {selectedClass.name}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {isFormMaster
                  ? "You are the Form Master of this class."
                  : "You are assigned to teach this class."}
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Students registered: {students.length}
              </p>
            </div>
          )}

          {classId && loadingStudents && (
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <p className="text-sm text-gray-500">
                Loading student records...
              </p>
            </div>
          )}

          {classId && !loadingStudents && !error && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800">
                  Student List
                </h2>

                <span className="text-sm text-gray-500">
                  {students.length} student(s)
                </span>
              </div>

              <DataTable
                columns={columns}
                data={students}
                emptyMessage="No students have been registered in this class yet."
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
