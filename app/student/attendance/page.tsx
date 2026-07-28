"use client";

import { useEffect, useState } from "react";
import { getStudentByAuthUid, getAttendanceForStudent } from "@/services/database";
import { useAuth } from "@/lib/useAuth";

interface StudentRecord {
  id: string;
  classId: string;
  className?: string;
}

interface AttendanceRow {
  date: string;
  status: string;
}

const statusLabel: Record<string, string> = {
  present: "🟢 Present",
  absent: "🔴 Absent",
  late: "🟡 Late",
};

export default function StudentAttendancePage() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    getStudentByAuthUid(profile.uid).then(async (data) => {
      const s = data as StudentRecord | null;
      setStudent(s);
      if (!s) {
        setLoading(false);
        return;
      }
      const attendance = await getAttendanceForStudent(s.classId, s.id);
      setRecords(attendance as AttendanceRow[]);
      setLoading(false);
    });
  }, [profile?.uid]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!student) return <p className="text-sm text-status-disabled">No student record linked to your account.</p>;

  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
  const pct = records.length ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">My Attendance</h1>
        <p className="text-sm text-gray-500">{student.className || student.classId}</p>
      </div>

      {records.length > 0 && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-sm">
          <span className="text-gray-500">Overall attendance:</span>{" "}
          <span className="font-semibold text-gray-800">{pct}%</span>{" "}
          <span className="text-gray-400">({presentCount} of {records.length} days)</span>
        </div>
      )}

      <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
        {records.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No attendance recorded yet.</p>
        ) : (
          records.map((r) => (
            <div key={r.date} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-700">{r.date}</span>
              <span>{statusLabel[r.status] || r.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}