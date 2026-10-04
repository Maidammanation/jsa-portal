"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getAdminStats, getRecentActivity } from "@/services/database";
import { SCHOOL } from "@/settings/config";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

type Stats = {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
};

type Activity = {
  id: string;
  action?: string;
  actor?: string;
  details?: string;
  createdAt?: {
    seconds?: number;
  } | string;
};

const emptyStats: Stats = {
  totalStudents: 0,
  totalTeachers: 0,
  totalParents: 0,
  totalClasses: 0,
  totalSubjects: 0,
};

function formatActivityDate(value: Activity["createdAt"]) {
  if (!value) return "Recent";

  try {
    const date =
      typeof value === "string"
        ? new Date(value)
        : new Date((value.seconds || 0) * 1000);

    if (Number.isNaN(date.getTime())) {
      return "Recent";
    }

    return date.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Recent";
  }
}

const overviewCards = [
  {
    key: "totalStudents",
    label: "Students",
    icon: "👨‍🎓",
    href: "/admin/students",
  },
  {
    key: "totalTeachers",
    label: "Teachers",
    icon: "👩‍🏫",
    href: "/admin/teachers",
  },
  {
    key: "totalParents",
    label: "Parents",
    icon: "👨‍👩‍👧",
    href: "/admin/parents",
  },
  {
    key: "totalClasses",
    label: "Classes",
    icon: "🏫",
    href: "/admin/classes",
  },
  {
    key: "totalSubjects",
    label: "Subjects",
    icon: "📚",
    href: "/admin/classes",
  },
] as const;

const quickManagement = [
  {
    label: "Students",
    description: "Admissions, profiles and student records",
    href: "/admin/students",
    icon: "👨‍🎓",
  },
  {
    label: "Teachers",
    description: "Teachers, accounts and assignments",
    href: "/admin/teachers",
    icon: "👩‍🏫",
  },
  {
    label: "Parents",
    description: "Parent accounts and children",
    href: "/admin/parents",
    icon: "👨‍👩‍👧",
  },
  {
    label: "Classes & Subjects",
    description: "Manage classes, levels and subjects",
    href: "/admin/classes",
    icon: "🏫",
  },
  {
    label: "Results & Report Cards",
    description: "Upload, edit, delete and manage results",
    href: "/admin/results",
    icon: "📊",
  },
  {
    label: "Results Control Centre",
    description: "Master result list and bulk result management",
    href: "/admin/results/manage",
    icon: "🛠️",
  },
  {
    label: "Attendance",
    description: "Monitor student attendance",
    href: "/admin/attendance",
    icon: "📅",
  },
  {
    label: "Fees",
    description: "Manage school fees and payments",
    href: "/admin/fees",
    icon: "💰",
  },
  {
    label: "Announcements",
    description: "School-wide announcements",
    href: "/admin/announcements",
    icon: "📢",
  },
  {
    label: "Team",
    description: "Administrators and staff access",
    href: "/admin/team",
    icon: "👥",
  },
  {
    label: "Activity Log",
    description: "Review recent portal activity",
    href: "/admin/activity",
    icon: "📝",
  },
  {
    label: "School Settings",
    description: "School information and configuration",
    href: "/admin/settings",
    icon: "⚙️",
  },
];

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LIVE SCHOOL SESSION / TERM
  // ============================================================
  //
  // This now comes from Firestore through useSchoolSettings()
  // instead of using the static SCHOOL.session / SCHOOL.term.
  //
  // Therefore when Admin changes the academic period in:
  //
  // /admin/settings
  //
  // this Super Admin dashboard updates automatically.
  // ============================================================

  const {
    session,
    term,
    loading: settingsLoading,
  } = useSchoolSettings();

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [statsData, activityData] = await Promise.all([
          getAdminStats(),
          getRecentActivity(8),
        ]);

        if (!mounted) return;

        setStats({
          ...emptyStats,
          ...(statsData as Partial<Stats>),
        });

        setActivity((activityData || []) as Activity[]);
      } catch (err) {
        console.error("Super Admin dashboard error:", err);

        if (mounted) {
          setError(
            "Some dashboard information could not be loaded. Please refresh the page."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* =========================================================
          DIRECTOR HEADER
      ========================================================= */}
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-lg">
        <div className="relative p-6 sm:p-8">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />

          <div className="pointer-events-none absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
                  Super Admin Control Centre
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {SCHOOL.name}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                  Central management dashboard for school administration,
                  academic records, staff, students, parents and portal
                  operations.
                </p>
              </div>

              {/* =====================================================
                  LIVE ACADEMIC PERIOD
              ===================================================== */}
              <div className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Current Academic Period
                </p>

                {settingsLoading ? (
                  <div className="mt-2 space-y-2">
                    <div className="h-5 w-28 animate-pulse rounded bg-white/10" />

                    <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-bold">
                      {session}
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {term}
                    </p>
                  </>
                )}

                <Link
                  href="/admin/settings"
                  className="mt-3 inline-block text-[11px] font-semibold text-gray-400 transition hover:text-white hover:underline"
                >
                  Change academic period →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ERROR MESSAGE
      ========================================================= */}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>

            <div>
              <p className="font-semibold">Dashboard notice</p>

              <p className="mt-0.5">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SCHOOL OVERVIEW
      ========================================================= */}
      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Overview
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-gray-900">
              School Statistics
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current records available across the portal.
            </p>
          </div>

          <Link
            href="/admin/settings"
            className="text-sm font-bold text-gray-700 hover:text-gray-950 hover:underline"
          >
            School Settings →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                  {card.icon}
                </div>

                <span className="text-xs font-bold text-gray-400 transition group-hover:text-gray-700">
                  →
                </span>
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                {card.label}
              </p>

              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                {loading ? (
                  <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  stats[card.key]
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* =======================================================
            RECENT ACTIVITY
        ======================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Monitoring
              </p>

              <h2 className="mt-1 text-lg font-extrabold text-gray-900">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Latest actions recorded in the portal.
              </p>
            </div>

            <Link
              href="/admin/activity"
              className="rounded-lg px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              View all →
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-start gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-gray-200" />

                    <div className="flex-1">
                      <div className="h-3 w-40 rounded bg-gray-200" />

                      <div className="mt-2 h-2.5 w-64 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                  📝
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-700">
                  No activity recorded yet
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  New administrative actions will appear here.
                </p>
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-4 transition hover:bg-gray-50 sm:px-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                      📝
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {item.action || "Portal activity"}
                          </p>

                          {item.details && (
                            <p className="mt-0.5 text-xs leading-5 text-gray-500">
                              {item.details}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-[10px] font-medium text-gray-400">
                          {formatActivityDate(item.createdAt)}
                        </span>
                      </div>

                      {item.actor && (
                        <p className="mt-1.5 text-[10px] font-semibold text-gray-400">
                          By {item.actor}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =======================================================
            QUICK MANAGEMENT
        ======================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Administration
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-gray-900">
              Quick Management
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Access the main areas of the school portal.
            </p>
          </div>

          <div className="grid gap-2 p-4 sm:p-5">
            {quickManagement.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 transition hover:border-gray-200 hover:bg-gray-100"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800">
                    {item.label}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] text-gray-400">
                    {item.description}
                  </p>
                </div>

                <span className="text-sm font-bold text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SYSTEM STATUS
      ========================================================= */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              System Architecture
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-gray-900">
              JSA Portal Core
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              The portal is structured around students, teachers, parents,
              classes, subjects, attendance, fees and academic results.
              The system is also prepared for future multi-campus and
              annex management.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-lg">🏫</p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Campus
              </p>

              <p className="text-xs font-bold text-gray-700">
                Ready to build
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-lg">🔐</p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Control
              </p>

              <p className="text-xs font-bold text-gray-700">
                Super Admin
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER NOTE
      ========================================================= */}
      <div className="pb-2 text-center">
        <p className="text-[11px] text-gray-400">
          {SCHOOL.name} • Super Admin Control Centre
        </p>
      </div>
    </div>
  );
}