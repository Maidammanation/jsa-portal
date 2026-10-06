"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getRecentActivity } from "@/services/database";
import { Button } from "@/components/Buttons";

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  details?: string;
  createdAt?: {
    seconds?: number;
    nanoseconds?: number;
  } | null;
}

type FilterType = "all" | "results" | "students" | "fees" | "attendance" | "other";

function formatDate(value: ActivityEntry["createdAt"]) {
  if (!value) return "Date unavailable";

  try {
    let date: Date;

    if (
      typeof value === "object" &&
      value !== null &&
      typeof value.seconds === "number"
    ) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value as unknown as string);
    }

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Date unavailable";
  }
}

function getActivityCategory(action: string): FilterType {
  const value = action.toLowerCase();

  if (value.includes("result")) {
    return "results";
  }

  if (
    value.includes("student") ||
    value.includes("admission") ||
    value.includes("promot")
  ) {
    return "students";
  }

  if (
    value.includes("fee") ||
    value.includes("payment")
  ) {
    return "fees";
  }

  if (value.includes("attendance")) {
    return "attendance";
  }

  return "other";
}

function getCategoryStyle(action: string) {
  const category = getActivityCategory(action);

  switch (category) {
    case "results":
      return "bg-purple-50 text-purple-700 border-purple-100";

    case "students":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "fees":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "attendance":
      return "bg-green-50 text-green-700 border-green-100";

    default:
      return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

function getCategoryLabel(action: string) {
  const category = getActivityCategory(action);

  switch (category) {
    case "results":
      return "Results";

    case "students":
      return "Students";

    case "fees":
      return "Fees";

    case "attendance":
      return "Attendance";

    default:
      return "System";
  }
}

export default function ActivityLogPage() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("all");

  const [error, setError] = useState("");

  const loadActivity = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const items = await getRecentActivity(100);

        setActivity(
          items as ActivityEntry[]
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load activity log."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activity.filter((item) => {
      const categoryMatches =
        filter === "all" ||
        getActivityCategory(item.action) === filter;

      if (!categoryMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        item.action,
        item.actor,
        item.details || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activity, search, filter]);

  const counts = useMemo(() => {
    return {
      total: activity.length,

      results: activity.filter(
        (item) =>
          getActivityCategory(item.action) ===
          "results"
      ).length,

      students: activity.filter(
        (item) =>
          getActivityCategory(item.action) ===
          "students"
      ).length,

      fees: activity.filter(
        (item) =>
          getActivityCategory(item.action) ===
          "fees"
      ).length,

      attendance: activity.filter(
        (item) =>
          getActivityCategory(item.action) ===
          "attendance"
      ).length,
    };
  }, [activity]);

  return (
    <div className="max-w-6xl space-y-6 pb-10">

      {/* HEADER */}

      <div className="rounded-2xl bg-brand text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              JSA ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Activity Log
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Monitor important actions taken across
              the JSA Portal.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              loadActivity(true)
            }
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </Button>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Loaded
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-800">
            {counts.total}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
            Results
          </p>

          <p className="mt-2 text-2xl font-bold text-purple-700">
            {counts.results}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
            Students
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-700">
            {counts.students}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Fees
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {counts.fees}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-500">
            Attendance
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {counts.attendance}
          </p>
        </div>

      </div>

      {/* SEARCH + FILTER */}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

          <div className="flex-1">
            <label
              htmlFor="activity-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search Activity
            </label>

            <input
              id="activity-search"
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search action, staff name or details..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="w-full lg:w-56">
            <label
              htmlFor="activity-filter"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Category
            </label>

            <select
              id="activity-filter"
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as FilterType
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="all">
                All Activity
              </option>

              <option value="results">
                Results
              </option>

              <option value="students">
                Students
              </option>

              <option value="fees">
                Fees
              </option>

              <option value="attendance">
                Attendance
              </option>

              <option value="other">
                System / Other
              </option>
            </select>
          </div>

        </div>

        {(search || filter !== "all") && (
          <div className="mt-3 flex items-center justify-between gap-3">

            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {filteredActivity.length}
              </span>{" "}
              matching entr              {filteredActivity.length === 1
                ? "y"
                : "ies"}
              .
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              Clear filters
            </button>

          </div>
        )}

      </section>

      {/* ACTIVITY LIST */}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The latest 100 recorded portal activities.
            </p>
          </div>

          {!loading && activity.length > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {filteredActivity.length} shown
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />

            <p className="mt-3 text-sm text-gray-400">
              Loading activity...
            </p>
          </div>
        ) : filteredActivity.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
              📋
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-700">
              {activity.length === 0
                ? "No activity recorded yet"
                : "No matching activity"}
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">
              {activity.length === 0
                ? "Administrative actions will appear here as they are performed across the portal."
                : "Try a different search term or clear the current filters."}
            </p>

            {activity.length > 0 &&
              (search || filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-4 text-sm font-medium text-brand hover:underline"
                >
                  Clear filters
                </button>
              )}

          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

            <div className="divide-y divide-gray-100">

              {filteredActivity.map((item) => {
                const category =
                  getActivityCategory(
                    item.action
                  );

                return (
                  <div
                    key={item.id}
                    className="p-4 transition-colors hover:bg-gray-50 sm:p-5"
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getCategoryStyle(
                              item.action
                            )}`}
                          >
                            {getCategoryLabel(
                              item.action
                            )}
                          </span>

                          <span className="text-xs text-gray-400">
                            {formatDate(
                              item.createdAt
                            )}
                          </span>

                        </div>

                        <h3 className="mt-2 text-sm font-semibold text-gray-800">
                          {item.action}
                        </h3>

                        {item.details && (
                          <p className="mt-1 break-words text-sm leading-5 text-gray-500">
                            {item.details}
                          </p>
                        )}

                      </div>

                      <div className="shrink-0 sm:text-right">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Performed By
                        </p>

                        <p className="mt-1 max-w-[220px] break-words text-sm font-medium text-gray-700 sm:max-w-[180px]">
                          {item.actor || "System"}
                        </p>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          </div>
        )}

      </section>

      {/* INFORMATION */}

      <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4 sm:p-5">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            i
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-dark">
              About the Activity Log
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-600">
              This audit trail records important actions
              performed through the school portal. It helps
              administrators monitor changes and identify who
              performed an action.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}