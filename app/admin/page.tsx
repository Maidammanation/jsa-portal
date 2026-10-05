"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  StatCard,
  ActionCard,
  InfoCard,
} from "@/components/Cards";

import {
  getAdminStats,
  getRecentActivity,
  getAnnouncements,
  getStudents,
  getClasses,
  getAttendanceSession,
  getFeeStructure,
  getAllPayments,
} from "@/services/database";

import { useSchoolSettings } from "@/lib/useSchoolSettings";

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  details?: string;
}

interface StudentRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  classId?: string;
  createdAt?: unknown;
}

interface ClassRecord {
  id: string;
  name?: string;
}

interface FeeRecord {
  id: string;
  classId: string;
  amount: number;
}

interface PaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  datePaid?: string;
}

interface AttendanceRecord {
  studentId: string;
  status: "present" | "absent" | "late";
}

interface AttendanceSession {
  id: string;
  classId: string;
  date: string;
  records?: AttendanceRecord[];
}

interface DashboardLiveStats {
  attendanceMarked: number;
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceLate: number;
  feesCollected: number;
  outstandingFees: number;
  newAdmissions: number;
}

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate();
    } catch {
      return null;
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = Number(
      (value as { seconds?: unknown }).seconds
    );

    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function isToday(value: unknown) {
  const date = timestampToDate(value);

  if (!date) return false;

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const {
    session,
    term,
  } = useSchoolSettings();

  const [stats, setStats] =
    useState<AdminStats | null>(null);

  const [liveStats, setLiveStats] =
    useState<DashboardLiveStats>({
      attendanceMarked: 0,
      attendancePresent: 0,
      attendanceAbsent: 0,
      attendanceLate: 0,
      feesCollected: 0,
      outstandingFees: 0,
      newAdmissions: 0,
    });

  const [activity, setActivity] =
    useState<ActivityEntry[]>([]);

  const [
    latestAnnouncement,
    setLatestAnnouncement,
  ] = useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const today = useMemo(
    () => getTodayString(),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [
          adminStats,
          recentActivity,
          announcements,
          studentsResult,
          classesResult,
          feeStructureResult,
          paymentsResult,
        ] = await Promise.all([
          getAdminStats(),
          getRecentActivity(8),
          getAnnouncements(1),
          getStudents(),
          getClasses(),
          getFeeStructure(term, session),
          getAllPayments(term, session),
        ]);

        if (cancelled) return;

        const students =
          studentsResult as StudentRecord[];

        const classes =
          classesResult as ClassRecord[];

        const feeStructure =
          feeStructureResult as FeeRecord[];

        const payments =
          paymentsResult as PaymentRecord[];

        /*
         * ---------------------------------------------------------
         * ATTENDANCE TODAY
         * ---------------------------------------------------------
         */

        const attendanceSessions =
          await Promise.all(
            classes.map(async (schoolClass) => {
              try {
                return (await getAttendanceSession(
                  schoolClass.id,
                  today
                )) as AttendanceSession | null;
              } catch {
                return null;
              }
            })
          );

        if (cancelled) return;

        let attendanceMarked = 0;
        let attendancePresent = 0;
        let attendanceAbsent = 0;
        let attendanceLate = 0;

        attendanceSessions.forEach((attendance) => {
          if (!attendance?.records) return;

          attendance.records.forEach((record) => {
            attendanceMarked += 1;

            if (record.status === "present") {
              attendancePresent += 1;
            }

            if (record.status === "absent") {
              attendanceAbsent += 1;
            }

            if (record.status === "late") {
              attendanceLate += 1;
            }
          });
        });

        /*
         * ---------------------------------------------------------
         * FEES
         * ---------------------------------------------------------
         */

        const feesCollected =
          payments.reduce(
            (sum, payment) =>
              sum + Number(payment.amount || 0),
            0
          );

        const outstandingFees =
          students.reduce((total, student) => {
            const fee =
              feeStructure.find(
                (item) =>
                  item.classId ===
                  student.classId
              );

            const amountDue =
              Number(fee?.amount || 0);

            const amountPaid =
              payments
                .filter(
                  (payment) =>
                    payment.studentId ===
                    student.id
                )
                .reduce(
                  (sum, payment) =>
                    sum +
                    Number(
                      payment.amount || 0
                    ),
                  0
                );

            const balance =
              amountDue - amountPaid;

            return (
              total +
              Math.max(balance, 0)
            );
          }, 0);

        /*
         * ---------------------------------------------------------
         * NEW ADMISSIONS TODAY
         * ---------------------------------------------------------
         */

        const newAdmissions =
          students.filter((student) =>
            isToday(student.createdAt)
          ).length;

        setStats(
          adminStats as AdminStats
        );

        setActivity(
          recentActivity as ActivityEntry[]
        );

        setLatestAnnouncement(
          (
            announcements[0] as
              | {
                  title?: string;
                }
              | undefined
          )?.title || null
        );

        setLiveStats({
          attendanceMarked,
          attendancePresent,
          attendanceAbsent,
          attendanceLate,
          feesCollected,
          outstandingFees,
          newAdmissions,
        });
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Admin dashboard loading error:",
          err
        );

        setError(
          "Some dashboard information could not be loaded."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [session, term, today]);

  const quickActions = [
    {
      label: "Add Student",
      icon: "🧑‍🎓",
      href: "/admin/students/new",
    },
    {
      label: "Add Teacher",
      icon: "🧑‍🏫",
      href: "/admin/teachers/new",
    },
    {
      label: "Upload Results",
      icon: "📄",
      href: "/admin/results",
    },
    {
      label: "Results Management",
      icon: "🛠️",
      href: "/admin/results/manage",
    },
    {
      label: "Take Attendance",
      icon: "📝",
      href: "/admin/attendance",
    },
    {
      label: "Generate Report Cards",
      icon: "📊",
      href: "/admin/results/report-cards",
    },
    {
      label: "Promote Students",
      icon: "⬆️",
      href: "/admin/students/promote",
    },
    {
      label: "Promotion History",
      icon: "📜",
      href: "/admin/students/promotion-history",
    },
    {
      label: "Manage Fees",
      icon: "💰",
      href: "/admin/fees",
    },
    {
      label: "Manage Students",
      icon: "👨‍🎓",
      href: "/admin/students",
    },
    {
      label: "Manage Teachers",
      icon: "👩‍🏫",
      href: "/admin/teachers",
    },
    {
      label: "Classes & Subjects",
      icon: "🏫",
      href: "/admin/classes",
    },
  ];

  const attendanceDisplay =
    loading
      ? "..."
      : `${liveStats.attendancePresent}/${liveStats.attendanceMarked}`;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Admin Dashboard
            </h1>

            <p className="text-sm text-gray-500">
              {session} &middot; {term}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-status-active" />
            <span className="text-xs font-medium text-brand">
              Live
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-status-suspended/10 border border-status-suspended/20 px-3 py-2 text-sm text-status-suspended">
            {error}
          </div>
        )}
      </div>

      {/* STATISTICS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          📊 School Statistics
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <StatCard
            label="Total Students"
            value={
              loading
                ? "..."
                : stats?.totalStudents ?? 0
            }
            icon="🧑‍🎓"
            accent="brand"
          />

          <StatCard
            label="Total Teachers"
            value={
              loading
                ? "..."
                : stats?.totalTeachers ?? 0
            }
            icon="🧑‍🏫"
            accent="accent"
          />

          <StatCard
            label="Total Parents"
            value={
              loading
                ? "..."
                : stats?.totalParents ?? 0
            }
            icon="👪"
            accent="brand"
          />

          <StatCard
            label="Total Classes"
            value={
              loading
                ? "..."
                : stats?.totalClasses ?? 0
            }
            icon="🏫"
            accent="accent"
          />

          <StatCard
            label="Total Subjects"
            value={
              loading
                ? "..."
                : stats?.totalSubjects ?? 0
            }
            icon="📚"
            accent="brand"
          />

          <StatCard
            label="Attendance Today"
            value={attendanceDisplay}
            icon="✅"
            accent="active"
          />

          <StatCard
            label="Fees Collected"
            value={
              loading
                ? "..."
                : formatNaira(
                    liveStats.feesCollected
                  )
            }
            icon="💰"
            accent="active"
          />

          <StatCard
            label="Outstanding Fees"
            value={
              loading
                ? "..."
                : formatNaira(
                    liveStats.outstandingFees
                  )
            }
            icon="⚠️"
            accent="suspended"
          />
        </div>
      </section>

      {/* ATTENDANCE SUMMARY */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          ✅ Today's Attendance
        </h2>

        <div className="grid grid-cols-3 gap-4">

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-semibold text-status-active">
              {loading
                ? "..."
                : liveStats.attendancePresent}
            </p>

            <p className="text-sm text-gray-500">
              Present
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-semibold text-status-disabled">
              {loading
                ? "..."
                : liveStats.attendanceAbsent}
            </p>

            <p className="text-sm text-gray-500">
              Absent
            </p>
          </div>

          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-semibold text-status-suspended">
              {loading
                ? "..."
                : liveStats.attendanceLate}
            </p>

            <p className="text-sm text-gray-500">
              Late
            </p>
          </div>

        </div>
      </section>

      {/* INFORMATION + ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* QUICK INFORMATION */}
        <section className="lg:col-span-1">

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            📅 Quick Information
          </h2>

          <InfoCard title="Session Overview">

            <p>
              Current Session:{" "}
              <strong className="text-gray-700">
                {session}
              </strong>
            </p>

            <p>
              Current Term:{" "}
              <strong className="text-gray-700">
                {term}
              </strong>
            </p>

            <p>
              New Admissions Today:{" "}
              <strong className="text-gray-700">
                {loading
                  ? "..."
                  : liveStats.newAdmissions}
              </strong>
            </p>

            <p>
              Latest Announcement:{" "}
              <strong className="text-gray-700">
                {latestAnnouncement ||
                  "No announcement"}
              </strong>
            </p>

          </InfoCard>

        </section>

        {/* QUICK ACTIONS */}
        <section className="lg:col-span-2">

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            ⚡ Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

            {quickActions.map(
              (action) => (
                <ActionCard
                  key={
                    action.label
                  }
                  label={
                    action.label
                  }
                  icon={
                    action.icon
                  }
                  onClick={() =>
                    router.push(
                      action.href
                    )
                  }
                />
              )
            )}

          </div>

        </section>

      </div>

      {/* RECENT ACTIVITY */}
      <section>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            🕒 Recent Activity
          </h2>

          <span className="text-xs text-gray-400">
            Latest {activity.length}
          </span>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">

          {activity.length === 0 ? (
            <p className="px-4 py-5 text-sm text-gray-400">
              No recent activity yet.
            </p>
          ) : (
            activity.map(
              (item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >

                  <div>
                    <p className="text-sm text-gray-700">
                      {item.action}
                    </p>

                    {item.details && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-gray-400">
                    {item.actor}
                  </span>

                </div>
              )
            )
          )}

        </div>

      </section>

    </div>
  );
}