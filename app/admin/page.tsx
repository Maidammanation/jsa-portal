"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard, ActionCard, InfoCard } from "@/components/Cards";
import { getAdminStats, getRecentActivity } from "@/services/database";
import { SCHOOL } from "@/settings/config";

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => setStats(null));
    getRecentActivity(8)
      .then((items) => setActivity(items as ActivityEntry[]))
      .catch(() => setActivity([]));
  }, []);

  const quickActions = [
    { label: "Add Student", icon: "🧑‍🎓", href: "/admin/students/new" },
    { label: "Add Teacher", icon: "🧑‍🏫", href: "/admin/teachers/new" },
    { label: "Upload Results", icon: "📄", href: "/admin/results" },
    { label: "Take Attendance", icon: "📝", href: "/admin/attendance" },
    { label: "Generate Report Cards", icon: "📊", href: "/admin/results/report-cards" },
    { label: "Promote Students", icon: "⬆️", href: "/admin/students/promote" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          {SCHOOL.session} &middot; {SCHOOL.term}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          📊 Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={stats?.totalStudents ?? "—"} icon="🧑‍🎓" accent="brand" />
          <StatCard label="Total Teachers" value={stats?.totalTeachers ?? "—"} icon="🧑‍🏫" accent="accent" />
          <StatCard label="Total Parents" value={stats?.totalParents ?? "—"} icon="👪" accent="brand" />
          <StatCard label="Total Classes" value={stats?.totalClasses ?? "—"} icon="🏫" accent="accent" />
          <StatCard label="Total Subjects" value={stats?.totalSubjects ?? "—"} icon="📚" accent="brand" />
          <StatCard label="Attendance Today" value="—" icon="✅" accent="active" />
          <StatCard label="Fees Collected" value="—" icon="💰" accent="active" />
          <StatCard label="Outstanding Fees" value="—" icon="⚠️" accent="suspended" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            📅 Quick Information
          </h2>
          <InfoCard title="Session Overview">
            <p>Current Session: {SCHOOL.session}</p>
            <p>Current Term: {SCHOOL.term}</p>
            <p>New Admissions: —</p>
            <p>Latest Announcement: —</p>
          </InfoCard>
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {quickActions.map((a) => (
              <ActionCard key={a.label} label={a.label} icon={a.icon} onClick={() => router.push(a.href)} />
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          🕒 Recent Activity
        </h2>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
          {activity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No recent activity yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="px-4 py-3 text-sm flex justify-between">
                <span className="text-gray-700">{item.action}</span>
                <span className="text-gray-400">{item.actor}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
} 
