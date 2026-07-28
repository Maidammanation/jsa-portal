"use client";

import { useEffect, useState } from "react";
import { getStudentByAuthUid, getFeeStructure, getPaymentsForStudent } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

interface StudentRecord {
  id: string;
  classId: string;
  className?: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  datePaid: string;
}

export default function StudentFeesPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [amountDue, setAmountDue] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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
      const [feeStructure, paymentList] = await Promise.all([
        getFeeStructure(term, session),
        getPaymentsForStudent(s.id, term, session),
      ]);
      const feeRow = (feeStructure as { classId: string; amount: number }[]).find(
        (f) => f.classId === s.classId
      );
      setAmountDue(feeRow?.amount || 0);
      setPayments(paymentList as PaymentRow[]);
      setLoading(false);
    });
  }, [profile?.uid, term, session]);

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = amountDue - totalPaid;

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!student) return <p className="text-sm text-status-disabled">No student record linked to your account.</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">My Fees</h1>
        <p className="text-sm text-gray-500">
          {session} &middot; {term}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-lg font-semibold text-gray-800">{formatNaira(amountDue)}</p>
          <p className="text-xs text-gray-400">Amount Due</p>
        </div>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-lg font-semibold text-gray-800">{formatNaira(totalPaid)}</p>
          <p className="text-xs text-gray-400">Amount Paid</p>
        </div>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-center">
          <p className={`text-lg font-semibold ${balance <= 0 ? "text-status-active" : "text-status-disabled"}`}>
            {formatNaira(balance)}
          </p>
          <p className="text-xs text-gray-400">Balance</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment History</h2>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
          {payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No payments recorded yet.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-700">{p.datePaid}</span>
                <span className="font-medium">{formatNaira(p.amount)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}