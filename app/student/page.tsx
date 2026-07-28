"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoCard, ActionCard } from "@/components/Cards";
import {
  getStudentByAuthUid,
  getResultsForStudent,
  getAttendanceForStudent,
  getFeeStructure,
  getPaymentsForStudent,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ResultEntry } from "@/lib/types";

interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  classId: string;
  className?: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [average, setAverage] = useState<number | null>(null);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
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

      const [results, attendance, feeStructure, payments] = await Promise.all([
        getResultsForStudent(s.id, term, session),
        getAttendanceForStudent(s.classId, s.id),
        getFeeStructure(term, session),
        getPaymentsForStudent(s.id, term, session),
      ]);

      const resultList = results as ResultEntry[];
      if (resultList.length > 0) {
        const total = resultList.reduce((sum, r) => sum + (r.total || 0), 0);
        setAverage(Math.round((total / resultList.length) * 10) / 10);
      }

      if (attendance.length > 0) {
        const presentCount = attendance.filter((a) => a.status === "present" || a.status === "late").length;
        setAttendancePct(Math.round((presentCount / attendance.length) * 100));
      }

      const feeRow = (feeStructure as { classId: string; amount: number }[]).find(
        (f) => f.classId === s.classId);
      const amountDue = feeRow?.amount || 0;
      const totalPaid = (payments as { amount: number }[]).reduce((sum, p) => sum + p.amount, 0);
      setBalance(amountDue - totalPaid);

      setLoading(false);
    });
  }, [profile?.uid, term, session]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  if (!student) {
    return (
      <p className="text-sm text-status-disabled">
        No student record is linked to your account yet. Contact your administrator.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {student.firstName}
        </h1>
        <p className="text-sm text-gray-500">
          {student.className || student.classId} &middot; {session} &middot; {term}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoCard title="Average Score">
          <p className="text-2xl font-semibold text-gray-800">{average ?? "—"}</p>
          <p className="text-xs text-gray-400">This term</p>
        </InfoCard>
        <InfoCard title="Attendance">
          <p className="text-2xl font-semibold text-gray-800">
            {attendancePct !== null ? `${attendancePct}%` : "—"}
          </p>
          <p className="text-xs text-gray-400">This term</p>
        </InfoCard>
        <InfoCard title="Fee Balance">
          <p className="text-2xl font-semibold text-gray-800">
            {balance !== null ? `₦${balance.toLocaleString()}` : "—"}
          </p>
          <p className="text-xs text-gray-400">
            {balance !== null && balance <= 0 ? "Fully paid" : "Outstanding"}
          </p>
        </InfoCard>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ActionCard label="My Results" icon="📊" onClick={() => router.push("/student/results")} />
          <ActionCard label="Attendance" icon="✅" onClick={() => router.push("/student/attendance")} />
          <ActionCard label="Fees" icon="💰" onClick={() => router.push("/student/fees")} />
        </div>
      </section>
    </div>
  );
}