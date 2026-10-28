
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";

interface StudentRecord {
  id: string;
  classId: string;
  className?: string;
}

interface AttendanceRow {
  date: string;
  status: "present" | "absent" | "late";
}

const statusLabel: Record<AttendanceRow["status"], string> = {
  present: "🟢 Present",
  absent: "🔴 Absent",
  late: "🟡 Late",
};

export default function StudentAttendancePage() {
  const { profile } = useAuth();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      if (!profile?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/student/attendance", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Unable to load attendance."
          );
        }

        if (cancelled) return;

        setStudent(data.student ?? null);
        setRecords(
          Array.isArray(data.records) ? data.records : []
        );
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load attendance."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading attendance...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-800">
          My Attendance
        </h1>
        <p className="text-sm text-status-disabled">{error}</p>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <p className="text-sm text-status-disabled">
        No student record is linked to your account. Contact your administrator.
      </p>
    );
  }

  const presentCount = records.filter(
    (record) =>
      record.status === "present" || record.status === "late"
  ).length;

  const percentage = records.length
    ? Math.round((presentCount / records.length) * 100)
    : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Attendance
        </h1>
        <p className="text-sm text-gray-500">
          {student.className || student.classId}
        </p>
      </div>

      {records.length > 0 && (
        <div className="rounded-card border border-gray-100 bg-white p-4 text-sm shadow-sm">
          <span className="text-gray-500">Overall attendance: </span>
          <span className="font-semibold text-gray-800">
            {percentage}%
          </span>
          <span className="text-gray-400">
            {" "}({presentCount} of {records.length} days)
          </span>
        </div>
      )}

      <div className="divide-y divide-gray-100 rounded-card border border-gray-100 bg-white shadow-sm">
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No attendance recorded yet.
          </p>
        ) : (
          records.map((record) => (
            <div
              key={record.date}
              className="flex justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="text-gray-700">{record.date}</span>
              <span>{statusLabel[record.status]}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
