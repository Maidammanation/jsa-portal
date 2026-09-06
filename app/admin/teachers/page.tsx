"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/Tables";
import { Button } from "@/components/Buttons";
import { getAll, remove } from "@/services/database";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  subjectIds?: string[];
  subjects?: string[];
  subject?: string;

  classIds?: string[];

  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string;

  status: "active" | "suspended" | "disabled";

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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const [teacherData, classData, subjectData] =
        await Promise.all([
          getAll("teachers"),
          getAll("classes"),
          getAll("subjects"),
        ]);

      setTeachers(teacherData as Teacher[]);
      setClasses(classData as ClassRoom[]);
      setSubjects(subjectData as Subject[]);
    } catch (error) {
      console.error("Could not load teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getTeacherSubjects = (teacher: Teacher) => {
    if (
      teacher.subjectIds &&
      teacher.subjectIds.length > 0
    ) {
      const names = teacher.subjectIds
        .map(
          (subjectId) =>
            subjects.find(
              (subject) => subject.id === subjectId
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

  const getTeacherClasses = (teacher: Teacher) => {
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

  const getFormMasterClass = (teacher: Teacher) => {
    const formClassId =
      teacher.formClassId ||
      teacher.formMasterClassId ||
      "";

    if (formClassId) {
      const classRoom = classes.find(
        (item) => item.id === formClassId
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

  const handleDelete = async (teacher: Teacher) => {
    if (deletingId) {
      return;
    }

    const teacherName =
      `${teacher.firstName} ${teacher.lastName}`.trim();

    const confirmed = confirm(
      teacher.authUid
        ? `Remove ${teacherName}?\n\nThis will permanently remove the teacher record and their portal login account. Their email can then be used again.\n\nThis action cannot be undone.`
        : `Remove ${teacherName}?\n\nThis teacher does not have a portal login account. Only the teacher record will be removed.\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(teacher.id);

    try {
      /*
       * If the teacher has a portal login, remove the
       * Firebase Authentication account first.
       *
       * The API also removes the linked users/{uid}
       * profile and teacher record.
       */
      if (teacher.authUid) {
        const response = await fetch(
          "/api/admin/delete-account",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uid: teacher.authUid,
              teacherId: teacher.id,
              email: teacher.email,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Could not delete the teacher login account."
          );
        }
      } else {
        /*
         * No login account exists, so just remove
         * the teacher Firestore record.
         */
        await remove("teachers", teacher.id);
      }

      await load();

      alert(
        teacher.authUid
          ? "Teacher and login account removed successfully."
          : "Teacher removed successfully."
      );
    } catch (error) {
      console.error(
        "Could not remove teacher:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Could not remove this teacher. Please try again."
      );
    } finally {
      setDeletingId(null);
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
            disabled={deletingId === teacher.id}
            onClick={() => handleDelete(teacher)}
            className="text-status-disabled hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingId === teacher.id
              ? "Removing..."
              : "Remove"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
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
                    teacher.status === "active"
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