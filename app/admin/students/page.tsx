"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/Tables";

import { Button } from "@/components/Buttons";

import {
  getAll,
  getStudents,
  deleteStudent,
} from "@/services/database";

import type { Student } from "@/lib/types";

type StudentWithAuth = Student & {
  authUid?: string;
};

type StudentRecord = {
  id: string;
  firstName?: string;
  lastName?: string;
  admissionNo?: string;
  classId?: string;
  className?: string;
  status?: string;
  authUid?: string;
  parentUid?: string;
  parentName?: string;
  attendsArabic?: boolean;
};

type ClassRecord = {
  id: string;
  name?: string;
};

type StatusFilter =
  | "all"
  | "active"
  | "suspended"
  | "disabled";

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentWithAuth[]>(
    []
  );

  const [classes, setClasses] = useState<ClassRecord[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");

  const [classFilter, setClassFilter] =
    useState<string>("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [error, setError] = useState("");

  async function loadStudents() {
    setLoading(true);
    setError("");

    try {
      const [studentData, classData] =
        await Promise.all([
          getStudents(),
          getAll("classes"),
        ]);

      setStudents(
        studentData as StudentWithAuth[]
      );

      setClasses(
        classData as ClassRecord[]
      );
    } catch (loadError) {
      console.error(
        "LOAD STUDENTS ERROR:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load students."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  const classOptions = useMemo(() => {
    const names = classes
      .map((item) => item.name || "")
      .filter(Boolean);

    const studentClassNames = students
      .map(
        (student) =>
          student.className || student.classId || ""
      )
      .filter(Boolean);

    return Array.from(
      new Set([
        ...names,
        ...studentClassNames,
      ])
    ).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      })
    );
  }, [classes, students]);

  const statistics = useMemo(() => {
    const active = students.filter(
      (student) =>
        student.status === "active"
    ).length;

    const suspended = students.filter(
      (student) =>
        student.status === "suspended"
    ).length;

    const disabled = students.filter(
      (student) =>
        student.status === "disabled"
    ).length;

    const withLogin = students.filter(
      (student) =>
        Boolean(student.authUid)
    ).length;

    const withParent = students.filter(
      (student) =>
        Boolean(
          student.parentUid ||
            student.parentName
        )
    ).length;

    const arabic = students.filter(
      (student) =>
        student.attendsArabic === true
    ).length;

    return {
      total: students.length,
      active,
      suspended,
      disabled,
      withLogin,
      withParent,
      arabic,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return students.filter(
      (student) => {
        if (
          statusFilter !== "all" &&
          student.status !== statusFilter
        ) {
          return false;
        }

        if (classFilter !== "all") {
          const studentClass =
            student.className ||
            student.classId ||
            "";

          if (
            studentClass !== classFilter
          ) {
            return false;
          }
        }

        if (!query) {
          return true;
        }

        const fullName =
          `${student.firstName || ""} ${
            student.lastName || ""
          }`
            .trim()
            .toLowerCase();

        const admissionNo =
          (
            student.admissionNo || ""
          ).toLowerCase();

        const className =
          (
            student.className ||
            ""
          ).toLowerCase();

        const parentName =
          (
            student.parentName ||
            ""
          ).toLowerCase();

        return (
          fullName.includes(query) ||
          admissionNo.includes(query) ||
          className.includes(query) ||
          parentName.includes(query)
        );
      }
    );
  }, [
    students,
    search,
    classFilter,
    statusFilter,
  ]);

  async function handleDelete(
    student: StudentWithAuth
  ) {
    const studentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim();

    /*
     * A student with a portal account should not be
     * silently deleted from the student collection.
     *
     * The existing login account can remain linked to
     * the student record, so deleting the record would
     * leave an orphaned authentication account.
     */
    if (student.authUid) {
      window.alert(
        `Cannot remove ${studentName}.\n\n` +
          `This student has an active portal login account.\n\n` +
          `Disable or resolve the student's portal account first before removing the student record.`
      );

      return;
    }

    /*
     * Check related collections before deleting.
     *
     * We intentionally check these records here rather
     * than deleting blindly because results, fees and
     * attendance belong to the student's academic history.
     */
    setDeletingId(student.id);

    try {
      const [
        results,
        payments,
        attendance,
      ] = await Promise.all([
        getAll("results"),
        getAll("feePayments"),
        getAll("attendance"),
      ]);

      const studentResults = (
        results as Array<{
          studentId?: string;
        }>
      ).filter(
        (result) =>
          result.studentId ===
          student.id
      );

      const studentPayments = (
        payments as Array<{
          studentId?: string;
        }>
      ).filter(
        (payment) =>
          payment.studentId ===
          student.id
      );

      const studentAttendance = (
        attendance as Array<{
          records?: Array<{
            studentId?: string;
          }>;
        }>
      ).filter(
        (session) =>
          Array.isArray(
            session.records
          ) &&
          session.records.some(
            (record) =>
              record.studentId ===
              student.id
          )
      );

      if (
        studentResults.length > 0 ||
        studentPayments.length > 0 ||
        studentAttendance.length > 0
      ) {
        const reasons: string[] =
          [];

        if (
          studentResults.length > 0
        ) {
          reasons.push(
            `• ${studentResults.length} result record(s)`
          );
        }

        if (
          studentPayments.length > 0
        ) {
          reasons.push(
            `• ${studentPayments.length} fee payment record(s)`
          );
        }

        if (
          studentAttendance.length > 0
        ) {
          reasons.push(
            `• ${studentAttendance.length} attendance session(s)`
          );
        }

        window.alert(
          `Cannot remove ${studentName}.\n\n` +
            `This student has existing school records:\n\n` +
            reasons.join("\n") +
            `\n\n` +
            `Keep the student record so the academic history remains intact.`
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Remove "${studentName}"?\n\n` +
            `Admission No.: ${
              student.admissionNo ||
              "—"
            }\n` +
            `Class: ${
              student.className ||
              student.classId ||
              "—"
            }\n\n` +
            `No results, fee payments or attendance records were found for this student.\n\n` +
            `This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      await deleteStudent(
        student.id
      );

      setStudents(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              student.id
          )
      );

      window.alert(
        `"${studentName}" was removed successfully.`
      );
    } catch (deleteError) {
      console.error(
        "DELETE STUDENT ERROR:",
        deleteError
      );

      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to remove student.";

      window.alert(
        `Unable to remove this student.\n\n${message}`
      );
    } finally {
      setDeletingId(null);
    }
  }

  const columns: Column<StudentWithAuth>[] =
    [
      {
        header: "Admission No.",
        accessor: "admissionNo",
        render: (student) => (
          <span className="font-mono text-xs font-medium text-gray-700">
            {student.admissionNo ||
              "—"}
          </span>
        ),
      },

      {
        header: "Name",
        accessor: "firstName",
        render: (student) => (
          <div>
            <p className="font-medium text-gray-800">
              {student.firstName}{" "}
              {student.lastName}
            </p>

            <div className="mt-1 flex flex-wrap gap-1">
              {student.attendsArabic && (
                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Arabic
                </span>
              )}

              {student.parentUid ||
              student.parentName ? (
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Parent Linked
                </span>
              ) : null}
            </div>
          </div>
        ),
      },

      {
        header: "Class",
        accessor: "className",
        render: (student) => (
          <span className="text-sm text-gray-700">
            {student.className ||
              student.classId ||
              "—"}
          </span>
        ),
      },

      {
        header: "Gender",
        accessor: "gender",
        render: (student) =>
          student.gender
            ? student.gender
                .charAt(0)
                .toUpperCase() +
              student.gender.slice(
                1
              )
            : "—",
      },

      {
        header: "Status",
        accessor: "status",
        render: (student) => (
          <StatusBadge
            status={
              student.status ||
              "active"
            }
          />
        ),
      },

      {
        header: "Login",
        accessor: "authUid",
        render: (student) =>
          student.authUid ? (
            <span className="text-sm font-medium text-green-600">
              ✓ Active
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              No login
            </span>
          ),
      },

      {
        header: "Actions",
        accessor: "id",
        render: (student) => (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/students/${student.id}/edit`}
              className="text-brand hover:underline"
            >
              Edit
            </Link>

            {!student.authUid && (
              <Link
                href={`/admin/students/${student.id}/create-login`}
                className="text-brand hover:underline"
              >
                Create Login
              </Link>
            )}

            <button
              type="button"
              disabled={
                deletingId ===
                student.id
              }
              onClick={() =>
                void handleDelete(
                  student
                )
              }
              className="text-status-disabled hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingId ===
              student.id
                ? "Checking..."
                : "Remove"}
            </button>
          </div>
        ),
      },
    ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Students
          </h1>

          <p className="text-sm text-gray-500">
            Manage student records, classes,
            academic status and portal access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/students/new">
            <Button>
              + Add Student
            </Button>
          </Link>

          <Link href="/admin/students/bulk-add">
            <Button variant="secondary">
              + Bulk Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setClassFilter("all");
            setSearch("");
          }}
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter === "all" &&
            classFilter === "all" &&
            !search
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Total
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.total}
          </p>

          <p className="text-xs text-gray-500">
            students
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter("active")
          }
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter === "active"
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Active
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.active}
          </p>

          <p className="text-xs text-gray-500">
            active
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              "suspended"
            )
          }
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter ===
            "suspended"
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Suspended
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.suspended}
          </p>

          <p className="text-xs text-gray-500">
            suspended
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              "disabled"
            )
          }
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter ===
            "disabled"
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Disabled
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.disabled}
          </p>

          <p className="text-xs text-gray-500">
            disabled
          </p>
        </button>

        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Portal Login
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.withLogin}
          </p>

          <p className="text-xs text-gray-500">
            accounts
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Parent Linked
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.withParent}
          </p>

          <p className="text-xs text-gray-500">
            students
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Arabic
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {statistics.arabic}
          </p>

          <p className="text-xs text-gray-500">
            section
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-card border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="student-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search Students
            </label>

            <input
              id="student-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Name, admission no. or parent..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="student-class"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Class
            </label>

            <select
              id="student-class"
              value={classFilter}
              onChange={(event) =>
                setClassFilter(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="all">
                All Classes
              </option>

              {classOptions.map(
                (className) => (
                  <option
                    key={className}
                    value={className}
                  >
                    {className}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="student-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Status
            </label>

            <select
              id="student-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="all">
                All Students
              </option>

              <option value="active">
                Active
              </option>

              <option value="suspended">
                Suspended
              </option>

              <option value="disabled">
                Disabled
              </option>
            </select>
          </div>
        </div>

        {(search ||
          classFilter !== "all" ||
          statusFilter !== "all") && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              Filters are active.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setClassFilter("all");
                setStatusFilter(
                  "all"
                );
              }}
              className="text-sm font-medium text-brand hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Result count */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {filteredStudents.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">
              {students.length}
            </span>{" "}
            students
          </p>

          {filteredStudents.length ===
            0 &&
            students.length > 0 && (
              <p className="text-xs text-gray-400">
                No students match the current
                filters.
              </p>
            )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">
            Unable to load students.
          </p>

          <p className="mt-1">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadStudents()
            }
            className="mt-3 font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-card border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">
            Loading students...
          </p>
        </div>
      ) : !error ? (
        <DataTable
          columns={columns}
          data={filteredStudents}
          emptyMessage={
            search ||
            classFilter !== "all" ||
            statusFilter !== "all"
              ? "No students match the current search or filters."
              : "No students found."
          }
        />
      ) : null}

      {/* Footer */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400">
          Designed & Developed by Maidammanation
          Tech Company
        </p>

        <p className="mt-1 text-xs text-gray-400">
          08032191668 / 08117106867
        </p>
      </div>
    </div>
  );
}