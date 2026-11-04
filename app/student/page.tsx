"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoCard, ActionCard } from "@/components/Cards";
import {
  getStudentByAuthUid,
  getResultsForStudent,
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

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late";
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
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!profile?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setDashboardError("");
      setAverage(null);
      setAttendancePct(null);
      setBalance(null);

      try {
        const data = await getStudentByAuthUid(profile.uid);
        if (cancelled) return;

        const currentStudent = data as StudentRecord | null;
        setStudent(currentStudent);

        if (!currentStudent) {
          setLoading(false);
          return;
        }

        // Load each dashboard section independently. A failure in one
        // section must not prevent the rest of the dashboard from showing.
        const [resultsResult, attendanceResult, feesResult, paymentsResult] =
          await Promise.allSettled([
            getResultsForStudent(currentStudent.id, term, session),
            fetch("/api/student/attendance", {
              method: "GET",
              cache: "no-store",
            }),
            getFeeStructure(term, session),
            getPaymentsForStudent(currentStudent.id, term, session),
          ]);

        if (cancelled) return;

        let sectionFailed = false;

        if (resultsResult.status === "fulfilled") {
          const resultList = resultsResult.value as ResultEntry[];
          if (resultList.length > 0) {
            const total = resultList.reduce(
              (sum, result) => sum + (Number(result.total) || 0),
              0
            );
            setAverage(Math.round((total / resultList.length) * 10) / 10);
          }
        } else {
          sectionFailed = true;
          console.error("Student dashboard results error:", resultsResult.reason);
        }

        if (attendanceResult.status === "fulfilled") {
          try {
            const response = attendanceResult.value;
            const attendanceData = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(attendanceData.error || "Could not load attendance.");
            }

            const attendance = Array.isArray(attendanceData.records)
              ? (attendanceData.records as AttendanceRecord[])
              : [];

            if (attendance.length > 0) {
              const presentCount = attendance.filter(
                (record) =>
                  record.status === "present" || record.status === "late"
              ).length;
              setAttendancePct(
                Math.round((presentCount / attendance.length) * 100)
              );
            }
          } catch (error) {
            sectionFailed = true;
            console.error("Student dashboard attendance error:", error);
          }
        } else {
          sectionFailed = true;
          console.error("Student dashboard attendance request error:", attendanceResult.reason);
        }

        if (feesResult.status === "fulfilled" && paymentsResult.status === "fulfilled") {
          const feeRows = feesResult.value as { classId: string; amount: number }[];
          const paymentRows = paymentsResult.value as { amount: number }[];
          const feeRow = feeRows.find(
            (fee) => fee.classId === currentStudent.classId
          );
          const amountDue = Number(feeRow?.amount) || 0;
          const totalPaid = paymentRows.reduce(
            (sum, payment) => sum + (Number(payment.amount) || 0),
            0
          );
          setBalance(amountDue - totalPaid);
        } else {
          sectionFailed = true;
          if (feesResult.status === "rejected") {
            console.error("Student dashboard fee structure error:", feesResult.reason);
          }
          if (paymentsResult.status === "rejected") {
            console.error("Student dashboard payments error:", paymentsResult.reason);
          }
        }

        if (sectionFailed) {
          setDashboardError(
            "Some dashboard figures could not be loaded. You can still use the links below."
          );
        }
      } catch (error) {
        console.error("Student dashboard loading error:", error);
        if (!cancelled) {
          setDashboardError(
            "We could not load your student information. Please refresh or contact the school administrator."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid, term, session]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading student dashboard...</p>;
  }

  if (!student) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-status-disabled">
          {dashboardError ||
            "No student record is linked to your account yet. Contact your administrator."}
        </p>
      </div>
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

      {dashboardError ? (
        <p className="text-sm text-amber-700" role="status">
          {dashboardError}
        </p>
      ) : null}

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
