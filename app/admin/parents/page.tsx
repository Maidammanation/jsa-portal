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
  remove,
} from "@/services/database";

/* =========================================================
   TYPES
========================================================= */

type ParentStatus =
  | "active"
  | "suspended"
  | "disabled";

interface Parent {
  id: string;

  firstName: string;
  lastName: string;

  email: string;

  phone?: string;

  status: ParentStatus;

  /*
   * Firebase Authentication UID.
   * Students may reference this UID through parentUid.
   */
  authUid?: string;
}

interface StudentRecord {
  id: string;

  firstName?: string;
  lastName?: string;

  admissionNo?: string;

  parentUid?: string;
  parentName?: string;

  status?: string;
}

/* =========================================================
   PAGE
========================================================= */

export default function ParentsListPage() {
  /* =======================================================
     DATA
  ======================================================= */

  const [parents, setParents] =
    useState<Parent[]>([]);

  const [students, setStudents] =
    useState<StudentRecord[]>([]);

  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /* =======================================================
     SEARCH / FILTER
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "all" | ParentStatus
    >("all");

  /* =======================================================
     ERROR
  ======================================================= */

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadParents() {
    setLoading(true);
    setError("");

    try {
      const [
        parentData,
        studentData,
      ] = await Promise.all([
        getAll("parents"),
        getAll("students"),
      ]);

      setParents(
        parentData as Parent[]
      );

      setStudents(
        studentData as StudentRecord[]
      );
    } catch (loadError) {
      console.error(
        "LOAD PARENTS ERROR:",
        loadError
      );

      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load parents.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParents();
  }, []);

  /* =======================================================
     CHILDREN FOR PARENT
  ======================================================= */

  function getChildrenForParent(
    parent: Parent
  ) {
    return students.filter(
      (student) => {
        /*
         * Most current records should use
         * the parent's Firebase Auth UID.
         */
        if (
          parent.authUid &&
          student.parentUid ===
            parent.authUid
        ) {
          return true;
        }

        /*
         * Some records may use the parent
         * document ID instead.
         */
        if (
          student.parentUid ===
          parent.id
        ) {
          return true;
        }

        return false;
      }
    );
  }

  /* =======================================================
     FILTERED PARENTS
  ======================================================= */

  const filteredParents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return parents.filter(
        (parent) => {
          /*
           * Status filter
           */
          if (
            statusFilter !==
              "all" &&
            parent.status !==
              statusFilter
          ) {
            return false;
          }

          /*
           * Search filter
           */
          if (!query) {
            return true;
          }

          const fullName =
            `${parent.firstName || ""} ${
              parent.lastName || ""
            }`
              .trim()
              .toLowerCase();

          const email =
            (
              parent.email ||
              ""
            ).toLowerCase();

          const phone =
            (
              parent.phone ||
              ""
            ).toLowerCase();

          return (
            fullName.includes(
              query
            ) ||
            email.includes(
              query
            ) ||
            phone.includes(
              query
            )
          );
        }
      );
    }, [
      parents,
      search,
      statusFilter,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const active =
        parents.filter(
          (parent) =>
            parent.status ===
            "active"
        ).length;

      const suspended =
        parents.filter(
          (parent) =>
            parent.status ===
            "suspended"
        ).length;

      const disabled =
        parents.filter(
          (parent) =>
            parent.status ===
            "disabled"
        ).length;

      const withLogin =
        parents.filter(
          (parent) =>
            Boolean(
              parent.authUid
            )
        ).length;

      const linkedParents =
        parents.filter(
          (parent) =>
            getChildrenForParent(
              parent
            ).length > 0
        ).length;

      return {
        total: parents.length,
        active,
        suspended,
        disabled,
        withLogin,
        linkedParents,
      };
    }, [parents, students]);

  /* =======================================================
     DELETE PARENT
  ======================================================= */

  async function handleDelete(
    parent: Parent
  ) {
    /*
     * Always check linked students first.
     */
    const children =
      getChildrenForParent(
        parent
      );

    if (children.length > 0) {
      const childNames =
        children
          .slice(0, 5)
          .map(
            (student) =>
              `${student.firstName || ""} ${
                student.lastName || ""
              }`
                .trim()
          )
          .filter(Boolean);

      const extra =
        children.length > 5
          ? `\n…and ${
              children.length - 5
            } more.`
          : "";

      window.alert(
        `Cannot remove this parent.\n\n` +
          `${children.length} student(s) are currently linked to ${
            parent.firstName
          } ${parent.lastName}.\n\n` +
          `Linked student(s):\n` +
          childNames.join(
            "\n"
          ) +
          extra +
          `\n\n` +
          `Reassign the student(s) to another parent first.`
      );

      return;
    }

    const parentName =
      `${parent.firstName || ""} ${
        parent.lastName || ""
      }`.trim();

    const confirmed =
      window.confirm(
        `Remove "${parentName}"?\n\n` +
          `This parent has no linked students.\n\n` +
          `This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      parent.id
    );

    try {
      await remove(
        "parents",
        parent.id
      );

      /*
       * Remove locally immediately.
       */
      setParents(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              parent.id
          )
      );

      window.alert(
        `"${parentName}" removed successfully.`
      );
    } catch (deleteError) {
      console.error(
        "DELETE PARENT ERROR:",
        deleteError
      );

      const message =
        deleteError instanceof
        Error
          ? deleteError.message
          : "Unable to remove parent.";

      window.alert(
        `Unable to remove this parent.\n\n${message}`
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns:
    Column<Parent>[] = [
    {
      header: "Name",

      accessor:
        "firstName",

      render: (parent) => (
        <div>
          <p className="font-medium text-gray-800">
            {parent.firstName}{" "}
            {parent.lastName}
          </p>

          {parent.authUid && (
            <p className="text-xs text-gray-400">
              Portal account active
            </p>
          )}
        </div>
      ),
    },

    {
      header: "Email",

      accessor:
        "email",

      render: (parent) =>
        parent.email || "—",
    },

    {
      header: "Phone",

      accessor:
        "phone",

      render: (parent) =>
        parent.phone || "—",
    },

    {
      header: "Children",

      accessor:
        "id",

      render: (parent) => {
        const children =
          getChildrenForParent(
            parent
          );

        if (
          children.length === 0
        ) {
          return (
            <span className="text-gray-400">
              None
            </span>
          );
        }

        return (
          <div className="max-w-[220px]">
            <span className="font-medium text-gray-700">
              {children.length}{" "}
              {children.length ===
              1
                ? "child"
                : "children"}
            </span>

            <div className="mt-1 space-y-0.5">
              {children
                .slice(0, 2)
                .map(
                  (student) => (
                    <p
                      key={
                        student.id
                      }
                      className="truncate text-xs text-gray-500"
                    >
                      {student.firstName}{" "}
                      {student.lastName}
                    </p>
                  )
                )}

              {children.length >
                2 && (
                <p className="text-xs text-gray-400">
                  +
                  {children.length -
                    2}{" "}
                  more
                </p>
              )}
            </div>
          </div>
        );
      },
    },

    {
      header: "Status",

      accessor:
        "status",

      render: (parent) => (
        <StatusBadge
          status={
            parent.status
          }
        />
      ),
    },

    {
      header: "Login",

      accessor:
        "authUid",

      render: (parent) =>
        parent.authUid ? (
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

      accessor:
        "id",

      render: (parent) => (
        <div className="flex flex-wrap gap-3">
          {!parent.authUid && (
            <Link
              href={`/admin/parents/${parent.id}/create-login`}
              className="text-brand hover:underline"
            >
              Create Login
            </Link>
          )}

          <button
            type="button"
            disabled={
              deletingId ===
              parent.id
            }
            onClick={() =>
              void handleDelete(
                parent
              )
            }
            className="text-status-disabled hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingId ===
            parent.id
              ? "Removing..."
              : "Remove"}
          </button>
        </div>
      ),
    },
  ];

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <div className="max-w-7xl space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Parents
          </h1>

          <p className="text-sm text-gray-500">
            Manage parent records,
            linked students and
            portal access.
          </p>
        </div>

        <Link href="/admin/parents/new">
          <Button>
            + Add Parent
          </Button>
        </Link>

      </div>

      {/* ===================================================
          STATISTICS
      =================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

        <button
          type="button"
          onClick={() => {
            setStatusFilter(
              "all"
            );
            setSearch("");
          }}
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter ===
              "all" &&
            !search
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Total
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {
              statistics.total
            }
          </p>

          <p className="text-xs text-gray-500">
            parents
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              "active"
            )
          }
          className={`rounded-card border bg-white p-4 text-left shadow-sm transition hover:shadow ${
            statusFilter ===
            "active"
              ? "border-brand"
              : "border-gray-100"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Active
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {
              statistics.active
            }
          </p>

          <p className="text-xs text-gray-500">
            active parents
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
            {
              statistics.suspended
            }
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
            {
              statistics.disabled
            }
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
            {
              statistics.withLogin
            }
          </p>

          <p className="text-xs text-gray-500">
            accounts
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Linked
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-800">
            {
              statistics.linkedParents
            }
          </p>

          <p className="text-xs text-gray-500">
            with children
          </p>
        </div>

      </div>

      {/* ===================================================
          SEARCH / FILTER
      =================================================== */}

      <div className="flex flex-col gap-3 rounded-card border border-gray-100 bg-white p-4 shadow-sm md:flex-row">

        <div className="flex-1">
          <label
            htmlFor="parent-search"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Search Parents
          </label>

          <input
            id="parent-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search by name, email or phone..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
          />
        </div>

        <div className="md:w-56">
          <label
            htmlFor="parent-status"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Status
          </label>

          <select
            id="parent-status"
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | "all"
                  | ParentStatus
              )
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">
              All Parents
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

        {(search ||
          statusFilter !==
            "all") && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "all"
                );
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        )}

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">
            Unable to load parents.
          </p>

          <p className="mt-1">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadParents()
            }
            className="mt-3 font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ===================================================
          RESULT SUMMARY
      =================================================== */}

      {!loading &&
        !error && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {
                  filteredParents.length
                }
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">
                {
                  parents.length
                }
              </span>{" "}
              parents
            </p>

            {(search ||
              statusFilter !==
                "all") && (
              <p className="text-xs text-gray-400">
                Filters are active
              </p>
            )}
          </div>
        )}

      {/* ===================================================
          TABLE
      =================================================== */}

      {loading ? (
        <div className="rounded-card border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">
            Loading parents...
          </p>
        </div>
      ) : !error ? (
        <DataTable
          columns={
            columns
          }
          data={
            filteredParents
          }
          emptyMessage={
            search ||
            statusFilter !==
              "all"
              ? "No parents match the current search or filter."
              : "No parents found."
          }
        />
      ) : null}

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="border-t border-gray-100 pt-4">

        <p className="text-xs text-gray-400">
          Designed & Developed by
          Maidammanation Tech
          Company
        </p>

        <p className="mt-1 text-xs text-gray-400">
          08032191668 /
          08117106867
        </p>

      </div>

    </div>
  );
}