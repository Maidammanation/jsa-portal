"use client";

import { useEffect, useMemo, useState } from "react";

import { SelectInput } from "@/components/Forms";
import {
  getAll,
  getClasses,
} from "@/services/database";

import { useSchoolSettings } from "@/lib/useSchoolSettings";

import type { ClassRoom } from "@/lib/types";

interface PromotionHistoryEntry {
  id: string;

  studentId: string;
  studentName: string;
  admissionNo: string;

  fromClassId: string;
  fromClassName: string;

  toClassId: string;
  toClassName: string;

  fromSession: string;
  toSession: string;

  promotedBy: string;
  action: string;

  createdAt: string;
}

export default function PromotionHistoryPage() {
  const { session } =
    useSchoolSettings();

  const [history, setHistory] =
    useState<PromotionHistoryEntry[]>(
      []
    );

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [fromClass, setFromClass] =
    useState("");

  const [toClass, setToClass] =
    useState("");

  const [fromSession, setFromSession] =
    useState("");

  const [toSession, setToSession] =
    useState("");

  /*
   * ----------------------------------------------------------
   * LOAD DATA
   * ----------------------------------------------------------
   */

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        historyData,
        classData,
      ] = await Promise.all([
        getAll("promotionHistory"),
        getClasses(),
      ]);

      const normalizedHistory =
        (historyData as PromotionHistoryEntry[])
          .map((item) => ({
            ...item,
            id: String(
              item.id || ""
            ),
            studentName:
              String(
                item.studentName || ""
              ),
            admissionNo:
              String(
                item.admissionNo || ""
              ),
            fromClassName:
              String(
                item.fromClassName ||
                  ""
              ),
            toClassName:
              String(
                item.toClassName ||
                  ""
              ),
            fromSession:
              String(
                item.fromSession ||
                  ""
              ),
            toSession:
              String(
                item.toSession ||
                  ""
              ),
            promotedBy:
              String(
                item.promotedBy ||
                  ""
              ),
            action:
              String(
                item.action ||
                  "promoted"
              ),
            createdAt:
              String(
                item.createdAt ||
                  ""
              ),
          }))
          .sort((a, b) => {
            const dateA =
              new Date(
                a.createdAt
              ).getTime();

            const dateB =
              new Date(
                b.createdAt
              ).getTime();

            return dateB - dateA;
          });

      setHistory(
        normalizedHistory
      );

      setClasses(
        classData as ClassRoom[]
      );
    } catch (err) {
      console.error(
        "Promotion history error:",
        err
      );

      setHistory([]);
      setClasses([]);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load promotion history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  /*
   * ----------------------------------------------------------
   * FILTER OPTIONS
   * ----------------------------------------------------------
   */

  const fromClassOptions = useMemo(
    () => {
      const names =
        new Set<string>();

      history.forEach((item) => {
        if (
          item.fromClassName.trim()
        ) {
          names.add(
            item.fromClassName.trim()
          );
        }
      });

      classes.forEach((item) => {
        if (item.name?.trim()) {
          names.add(
            item.name.trim()
          );
        }
      });

      return [
        {
          label:
            "All From Classes",
          value: "",
        },
        ...Array.from(names)
          .sort()
          .map((name) => ({
            label: name,
            value: name,
          })),
      ];
    },
    [history, classes]
  );

  const toClassOptions = useMemo(
    () => {
      const names =
        new Set<string>();

      history.forEach((item) => {
        if (
          item.toClassName.trim()
        ) {
          names.add(
            item.toClassName.trim()
          );
        }
      });

      classes.forEach((item) => {
        if (item.name?.trim()) {
          names.add(
            item.name.trim()
          );
        }
      });

      return [
        {
          label:
            "All To Classes",
          value: "",
        },
        ...Array.from(names)
          .sort()
          .map((name) => ({
            label: name,
            value: name,
          })),
      ];
    },
    [history, classes]
  );

  /*
   * ----------------------------------------------------------
   * SESSION OPTIONS
   * ----------------------------------------------------------
   */

  const sessionOptions =
    useMemo(() => {
      const sessions =
        new Set<string>();

      history.forEach((item) => {
        if (
          item.fromSession.trim()
        ) {
          sessions.add(
            item.fromSession.trim()
          );
        }

        if (
          item.toSession.trim()
        ) {
          sessions.add(
            item.toSession.trim()
          );
        }
      });

      if (session) {
        sessions.add(session);
      }

      return [
        {
          label:
            "All Sessions",
          value: "",
        },
        ...Array.from(sessions)
          .sort()
          .reverse()
          .map(
            (value) => ({
              label: value,
              value,
            })
          ),
      ];
    }, [history, session]);

  /*
   * ----------------------------------------------------------
   * FILTER HISTORY
   * ----------------------------------------------------------
   */

  const filteredHistory =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return history.filter(
        (item) => {
          /*
           * Search.
           */
          if (searchValue) {
            const searchable =
              [
                item.studentName,
                item.admissionNo,
                item.fromClassName,
                item.toClassName,
                item.fromSession,
                item.toSession,
                item.promotedBy,
              ]
                .join(" ")
                .toLowerCase();

            if (
              !searchable.includes(
                searchValue
              )
            ) {
              return false;
            }
          }

          /*
           * From class.
           */
          if (
            fromClass &&
            item.fromClassName
              .trim()
              .toLowerCase() !==
              fromClass
                .trim()
                .toLowerCase()
          ) {
            return false;
          }

          /*
           * To class.
           */
          if (
            toClass &&
            item.toClassName
              .trim()
              .toLowerCase() !==
              toClass
                .trim()
                .toLowerCase()
          ) {
            return false;
          }

          /*
           * From session.
           */
          if (
            fromSession &&
            item.fromSession !==
              fromSession
          ) {
            return false;
          }

          /*
           * To session.
           */
          if (
            toSession &&
            item.toSession !==
              toSession
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      history,
      search,
      fromClass,
      toClass,
      fromSession,
      toSession,
    ]);

  /*
   * ----------------------------------------------------------
   * RESET FILTERS
   * ----------------------------------------------------------
   */

  const clearFilters = () => {
    setSearch("");
    setFromClass("");
    setToClass("");
    setFromSession("");
    setToSession("");
  };

  /*
   * ----------------------------------------------------------
   * FORMAT DATE
   * ----------------------------------------------------------
   */

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-NG",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Promotion History
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Loading promotion records...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          🎓 Promotion History
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View and track all student
          promotions recorded by the
          school.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Total Records
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-800">
            {history.length}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Showing
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-800">
            {filteredHistory.length}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Current Session
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-800">
            {session || "—"}
          </p>
        </div>

      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              🔎 Search & Filters
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Find a student's promotion
              record quickly.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-xs rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label
            htmlFor="promotion-search"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Search Student
          </label>

          <input
            id="promotion-search"
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Student name, admission number, class, session or promoter..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {/* Select filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <SelectInput
            label="From Class"
            value={fromClass}
            onChange={(e) =>
              setFromClass(
                e.target.value
              )
            }
            options={
              fromClassOptions
            }
          />

          <SelectInput
            label="To Class"
            value={toClass}
            onChange={(e) =>
              setToClass(
                e.target.value
              )
            }
            options={
              toClassOptions
            }
          />

          <SelectInput
            label="From Session"
            value={fromSession}
            onChange={(e) =>
              setFromSession(
                e.target.value
              )
            }
            options={
              sessionOptions
            }
          />

          <SelectInput
            label="To Session"
            value={toSession}
            onChange={(e) =>
              setToSession(
                e.target.value
              )
            }
            options={
              sessionOptions
            }
          />

        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">

          <div>
            <h2 className="font-semibold text-gray-800">
              Promotion Records
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              {filteredHistory.length} record
              {filteredHistory.length ===
              1
                ? ""
                : "s"} found
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            className="text-xs rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
          >
            🔄 Refresh
          </button>

        </div>

        {filteredHistory.length ===
        0 ? (
          <div className="px-5 py-12 text-center">

            <p className="text-sm text-gray-500">
              No promotion records
              found.
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Try clearing your filters
              or promote students from
              the Promotion Centre.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">

                  <th className="px-4 py-3">
                    Student
                  </th>

                  <th className="px-4 py-3">
                    Admission No.
                  </th>

                  <th className="px-4 py-3">
                    From Class
                  </th>

                  <th className="px-4 py-3">
                    To Class
                  </th>

                  <th className="px-4 py-3">
                    From Session
                  </th>

                  <th className="px-4 py-3">
                    To Session
                  </th>

                  <th className="px-4 py-3">
                    Promoted By
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredHistory.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      className="hover:bg-gray-50"
                    >

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-800">
                          {
                            item.studentName
                          }
                        </p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {
                          item.admissionNo ||
                          "—"
                        }
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {
                            item.fromClassName ||
                            "—"
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                          {
                            item.toClassName ||
                            "—"
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {
                          item.fromSession ||
                          "—"
                        }
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {
                          item.toSession ||
                          "—"
                        }
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {
                          item.promotedBy ||
                          "—"
                        }
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(
                          item.createdAt
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}