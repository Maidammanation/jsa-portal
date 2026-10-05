"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/Tables";

import { Button } from "@/components/Buttons";
import { TextInput, SelectInput } from "@/components/Forms";

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

type StatusFilter =
  | "all"
  | "active"
  | "suspended"
  | "disabled";

type FormMasterFilter =
  | "all"
  | "form-master"
  | "not-form-master";

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [formMasterFilter, setFormMasterFilter] =
    useState<FormMasterFilter>("all");

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

      setTeachers(teacherData as Teacher[]);
      setClasses(classData as ClassRoom[]);
      setSubjects(subjectData as Subject[]);
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
    void load();
  }, []);

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

  const filteredTeachers = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return teachers.filter((teacher) => {
      const teacherName =
        `${teacher.firstName} ${teacher.lastName}`
          .toLowerCase();

      const email =
        teacher.email?.toLowerCase() || "";

      const matchesSearch =
        !term ||
        teacherName.includes(term) ||
        email.includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        teacher.status === statusFilter;

      const isFormMaster = Boolean(
        teacher.formClassId ||
          teacher.formMasterClassId ||
          teacher.formMasterClassName
      );

      const matchesFormMaster =
        formMasterFilter === "all" ||
        (formMasterFilter ===
          "form-master" &&
          isFormMaster) ||
        (formMasterFilter ===
          "not-form-master" &&
          !isFormMaster);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFormMaster
      );
    });
  }, [
    teachers,
    search,
    statusFilter,
    formMasterFilter,
  ]);

  const activeTeachers = teachers.filter(
    (teacher) =>
      teacher.status === "active"
  ).length;

  const suspendedTeachers = teachers.filter(
    (teacher) =>
      teacher.status === "suspended"
  ).length;

  const disabledTeachers = teachers.filter(
    (teacher) =>
      teacher.status === "disabled"
  ).length;

  const formMasters = teachers.filter(
    (teacher) =>
      Boolean(
        teacher.formClassId ||
          teacher.formMasterClassId ||
          teacher.formMasterClassName
      )
  ).length;

  const teachersWithLogin =
    teachers.filter(
      (teacher) =>
        Boolean(teacher.authUid)
    ).length;

  const handleDelete = async (
    teacher: Teacher
  ) => {
    if (deletingId) {
      return;
    }

    const teacherName =
      `${teacher.firstName} ${teacher.lastName}`.trim();

    const confirmed = confirm(
      teacher.authUid
        ? `Remove ${teacherName}?\n\nThis will permanently remove the teacher record and their portal login account.\n\nThis action cannot be undone.`
        : `Remove ${teacherName}?\n\nThis teacher does not have a portal login account. Only the teacher record will be removed.\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(teacher.id);

    try {
      if (teacher.authUid) {
        const response = await fetch(
          "/api/admin/delete-account",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              uid: teacher.authUid,
              teacherId: teacher.id,
              email: teacher.email,
            }),
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Could not delete the teacher login account."
          );
        }
      } else {
        await remove(
          "teachers",
          teacher.id
        );
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
      render: (teacher) => (
        <div>
          <p className="font-medium text-gray-800">
            {teacher.firstName}{" "}
            {teacher.lastName}
          </p>

          <p className="text-xs text-gray-400">
            {teacher.email}
          </p>
        </div>
      ),
    },

    {
      header: "Subjects",
      accessor: "subject",
      render: (teacher) => {
        const teacherSubjects =
          getTeacherSubjects(teacher);

        if (
          teacherSubjects.length === 0
        ) {
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

        if (
          teacherClasses.length === 0
        ) {
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
        <StatusBadge
          status={teacher.status}
        />
      ),
    },

    {
      header: "Login",
      accessor: "authUid",
      render: (teacher) =>
        teacher.authUid ? (
          <span className="text-status-active text-sm font-medium">
            Active
          </span>
        ) : (
          <span className="text-gray-400 text-sm">
            Not Created
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
            disabled={
              deletingId === teacher.id
            }
            onClick={() =>
              handleDelete(teacher)
            }
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
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Teachers
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage teachers, subjects, classes,
            Form Masters and portal accounts.
          </p>
        </div>

        <Link href="/admin/teachers/new">
          <Button>
            + Add Teacher
          </Button>
        </Link>
      </div>

      {/* SUMMARY */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Total
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {teachers.length}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Active
            </p>

            <p className="text-2xl font-semibold text-status-active mt-1">
              {activeTeachers}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Suspended
            </p>

            <p className="text-2xl font-semibold text-yellow-600 mt-1">
              {suspendedTeachers}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Disabled
            </p>

            <p className="text-2xl font-semibold text-status-disabled mt-1">
              {disabledTeachers}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Form Masters
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {formMasters}
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">
              Portal Login
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {teachersWithLogin}
            </p>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="rounded-card border border-gray-100 bg-white shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput
            label="Search Teachers"
            placeholder="Search name or email..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <SelectInput
            label="Status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as StatusFilter
              )
            }
            options={[
              {
                label: "All Statuses",
                value: "all",
              },
              {
                label: "Active",
                value: "active",
              },
              {
                label: "Suspended",
                value: "suspended",
              },
              {
                label: "Disabled",
                value: "disabled",
              },
            ]}
          />

          <SelectInput
            label="Form Master"
            value={formMasterFilter}
            onChange={(event) =>
              setFormMasterFilter(
                event.target
                  .value as FormMasterFilter
              )
            }
            options={[
              {
                label: "All Teachers",
                value: "all",
              },
              {
                label: "Form Masters Only",
                value: "form-master",
              },
              {
                label: "Non-Form Masters",
                value: "not-form-master",
              },
            ]}
          />
        </div>

        {(search ||
          statusFilter !== "all" ||
          formMasterFilter !== "all") && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <strong>
                {filteredTeachers.length}
              </strong>{" "}
              of{" "}
              <strong>
                {teachers.length}
              </strong>{" "}
              teachers.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setFormMasterFilter(
                  "all"
                );
              }}
              className="text-sm text-brand hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <p className="text-sm text-gray-400">
          Loading teachers...
        </p>
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredTeachers}
            emptyMessage={
              teachers.length === 0
                ? "No teachers found."
                : "No teachers match your filters."
            }
          />
        </div>
      )}
    </div>
  );
}