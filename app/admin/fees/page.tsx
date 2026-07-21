"use client";

import { useEffect, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudents,
  getFeeStructure,
  setClassFee,
  getAllPayments,
  recordPayment,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ClassRoom, Student } from "@/lib/types";

interface FeeRow {
  id: string;
  classId: string;
  amount: number;
}

interface PaymentRow {
  id: string;
  studentId: string;
  amount: number;
  datePaid: string;
}

export default function FeesPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Record-payment form
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getClasses(),
      getStudents(),
      getFeeStructure(term, session),
      getAllPayments(term, session),
    ]).then(([classList, studentList, fees, pays]) => {
      setClasses(classList as ClassRoom[]);
      setStudents(studentList as Student[]);
      setFeeStructure(fees as FeeRow[]);
      setPayments(pays as PaymentRow[]);
      const initial: Record<string, string> = {};
      (classList as ClassRoom[]).forEach((c) => {
        const existing = (fees as FeeRow[]).find((f) => f.classId === c.id);
        initial[c.id] = existing ? String(existing.amount) : "";
      });
      setFeeInputs(initial);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadAll();
  }, [term, session]);

  const handleSaveFee = async (classId: string) => {
    const amount = Number(feeInputs[classId]) || 0;
    setSavingClassId(classId);
    try {
      await setClassFee(classId, term, session, amount, profile?.name || "admin");
      loadAll();
    } finally {
      setSavingClassId(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const student = students.find((s) => s.id === payStudentId);
    if (!student || !payAmount) return;
    setSaving(true);
    try {
      await recordPayment(
        payStudentId,
        student.classId,term,
        session,
        Number(payAmount),
        payDate,
        profile?.name || "admin"
      );
      setPayStudentId("");
      setPayAmount("");
      setMessage("Payment recorded.");
      loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setSaving(false);
    }
  };

  // Build the per-student overview: fee due (from their class), total paid, balance.
  const overview = students.map((s) => {
    const fee = feeStructure.find((f) => f.classId === s.classId);
    const amountDue = fee?.amount || 0;
    const totalPaid = payments
      .filter((p) => p.studentId === s.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = amountDue - totalPaid;
    return { student: s, amountDue, totalPaid, balance };
  });

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Fees</h1>
        <p className="text-sm text-gray-500">
          {session} &middot; {term}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Fee structure per class */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Set Fee Amount Per Class
            </h2>
            <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
              {classes.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400">
                  No classes yet — add classes first under Classes & Subjects.
                </p>
              ) : (
                classes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm text-gray-700">{c.name}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={feeInputs[c.id] || ""}
                      onChange={(e) => setFeeInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <Button
                      onClick={() => handleSaveFee(c.id)}
                      disabled={savingClassId === c.id}
                      variant="ghost"
                    >
                      {savingClassId === c.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Record a payment */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Record a Payment
            </h2>
            {message && (
              <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">{message}</p>
            )}
            <form
              onSubmit={handleRecordPayment}
              className="bg-white rounded-card border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end"
            >
              <div className="sm:col-span-2">
                <SelectInput
                  label="Student"
                  value={payStudentId}
                  onChange={(e) => setPayStudentId(e.target.value)}options={[
                    { label: "Select a student", value: "" },
                    ...students.map((s) => ({
                      label: `${s.firstName} ${s.lastName} (${s.className || s.classId})`,
                      value: s.id,
                    })),
                  ]}
                />
              </div>
              <TextInput
                label="Amount"
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <TextInput
                label="Date Paid"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
              <Button type="submit" disabled={saving || !payStudentId || !payAmount} className="sm:col-span-4">
                {saving ? "Recording..." : "Record Payment"}
              </Button>
            </form>
          </section>

          {/* Overview table */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Fee Overview
            </h2>
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Amount Due</th>
                    <th className="px-4 py-3 font-medium">Amount Paid</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overview.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    overview.map(({ student, amountDue, totalPaid, balance }) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-gray-700">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-2">{formatNaira(amountDue)}</td>
                        <td className="px-4 py-2">{formatNaira(totalPaid)}</td>
                        <td className="px-4 py-2 font-medium">{formatNaira(balance)}</td>
                        <td className="px-4 py-2">
                          {amountDue === 0 ? (
                            <span className="text-gray-400">No fee set</span>
                          ) : balance <= 0 ? (
                            <span className="text-status-active font-medium">🟢 Paid</span>
                          ) : totalPaid > 0 ? (
                            <span className="text-status-suspended font-medium">🟡 Partial</span>
                          ) : (
                            <span className="text-status-disabled font-medium">🔴 Unpaid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}