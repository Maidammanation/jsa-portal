"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/Tables";
import { Button } from "@/components/Buttons";
import {
  getAll,
  remove,
} from "@/services/database";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  // New assignment structure
  subjectIds?: string[];
  subjects?: string[];
  subject?: string;

  classIds?: string[];

  formClassId?: string | null;

  // Compatibility fields
  formMasterClassId?: string | null;
  formMasterClassName?: string;

  status:
    | "active"
    | "suspended"
    | "disabled";

  authUid?: string;
}

interface ClassRoom {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function TeachersListPage() {
  const [teachers, setTeachers] =
    useState<Teacher[]>([]);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const [
        teacherData,
        classData,
        subjectData,
      ] = await Promise.all([
        getAll("teachers"),
        getAll("classes"),
        getAll("subjects"),
      ]);

      setTeachers(
        teacherData as Teacher[]
      );

      setClasses(
        classData as ClassRoom[]
      );

      setSubjects(
        subjectData as Subject[]
      );
    } catch (error) {
      console.error(
        "Could not load teachers:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * Convert subject IDs into subject names.
   *
   * The page also supports the older `subject`
   * field so existing teachers do not appear blank.
   */
  const getTeacherSubjects = (
    teacher: Teacher
  ) => {
    if (
      teacher.subjectIds &&
      teacher.subjectIds.length > 0
    ) {
      const names = teacher.subjectIds
        .map(
          (subjectId) =>
            subjects.find(
              (subject) =>
                subject.id === subjectId
            )?.name
        )
        .filter(Boolean) as string[];

      if (names.length > 0) {
        return names;
      }
    }

    if (
      teacher.subjects &&
      teacher.subjects.length > 0
    ) {
      return teacher.subjects;
    }

    if (teacher.subject) {
      return teacher.subject
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  /*
   * Convert class IDs into class names.
   */
  const getTeacherClasses = (
    teacher: Teacher
  ) => {
    if (
      !teacher.classIds ||
      teacher.classIds.length === 0
    ) {
      return [];
    }

    return teacher.classIds
      .map(
        (classId) =>
          classes.find(
            (classRoom) =>
              classRoom.id === classId
          )?.name
      )
      .filter(Boolean) as string[];
  };

  /*
   * Resolve Form Master class.
   */
  const getFormMasterClass = (
    teacher: Teacher
  ) => {
    const formClassId =
      teacher.formClassId ||
      teacher.formMasterClassId ||
      "";

    if (formClassId) {
      const classRoom = classes.find(
        (item) =>
          item.id === formClassId
      );

      if (classRoom) {
        return classRoom.name;
      }
    }

    if (teacher.formMasterClassName) {
      return teacher.formMasterClassName;
    }

    return "";
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        "Remove this teacher record? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await remove("teachers", id);
      await load();
    } catch (error) {
      console.error(
        "Could not remove teacher:",
        error
      );

      alert(
        "Could not remove this teacher. Please try again."
      );
    }
  };

  const columns: Column<Teacher>[] = [
    {
      header: "Name",
      accessor: "firstName",
      render: (teacher) =>
        `${teacher.firstName} ${teacher.lastName}`,
    },

    {
      header: "Email",
      accessor: "email",
    },

    {
      header: "Subjects",
      accessor: "subject",
      render: (teacher) => {
        const teacherSubjects =
          getTeacherSubjects(teacher);

        if (teacherSubjects.length === 0) {
          return (
            <span className="text-gray-400">
              —
            </span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {teacherSubjects.map(
              (subject, index) => (
                <span
                  key={`${subject}-${index}`}
                  className="inline-flex items-center rounded-full bg-brand/5 border border-brand/10 px-2.5 py-1 text-xs text-gray-700"
                >
                  {subject}
                </span>
              )
            )}
          </div>
        );
      },
    },

    {
      header: "Classes",
      accessor: "classIds",
      render: (teacher) => {
        const teacherClasses =
          getTeacherClasses(teacher);

        if (teacherClasses.length === 0) {
          return (
            <span className="text-gray-400">
              —
            </span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {teacherClasses.map(
              (className, index) => (
                <span
                  key={`${className}-${index}`}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {className}
                </span>
              )
            )}
          </div>
        );
      },
    },

    {
      header: "Form Master",
      accessor: "formClassId",
      render: (teacher) => {
        const formClass =
          getFormMasterClass(teacher);

        return formClass ? (
          <span className="inline-flex items-center rounded-full bg-brand/5 border border-brand/10 px-2.5 py-1 text-xs font-medium text-gray-700">
            {formClass}
          </span>
        ) : (
          <span className="text-gray-400">
            —
          </span>
        );
      },
    },

    {
      header: "Status",
      accessor: "status",
      render: (teacher) => (
        <StatusBadge status={teacher.status} />
      ),
    },

    {
      header: "Login",
      accessor: "authUid",
      render: (teacher) =>
        teacher.authUid ? (
          <span className="text-status-active text-sm">
            Active
          </span>
        ) : (
          <span className="text-gray-400 text-sm">
            —
          </span>
        ),
    },

    {
      header: "Actions",
      accessor: "id",
      render: (teacher) => (
        <div className="flex flex-wrap gap-3">
          {!teacher.authUid && (
            <Link
              href={`/admin/teachers/${teacher.id}/create-login`}
              className="text-brand hover:underline text-sm"
            >
              Create Login
            </Link>
          )}

          <Link
            href={`/admin/teachers/${teacher.id}/edit`}
            className="text-gray-600 hover:underline text-sm"
          >
            Edit
          </Link>

          <button
            type="button"
            onClick={() =>
              handleDelete(teacher.id)
            }
            className="text-status-disabled hover:underline text-sm"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Teachers
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage teachers, subjects, classes and Form Master assignments.
          </p>
        </div>

        <Link href="/admin/teachers/new">
          <Button>
            + Add Teacher
          </Button>
        </Link>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Total Teachers
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {teachers.length}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Active Teachers
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {
                teachers.filter(
                  (teacher) =>
                    teacher.status ===
                    "active"
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Form Masters
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {
                teachers.filter(
                  (teacher) =>
                    Boolean(
                      teacher.formClassId ||
                        teacher.formMasterClassId
                    )
                ).length
              }
            </p>
          </div>
        </div>
      )}

      {/* Teacher table */}
      {loading ? (
        <p className="text-sm text-gray-400">
          Loading teachers...
        </p>
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={teachers}
            emptyMessage="No teachers found."
          />
        </div>
      )}
    </div>
  );
}