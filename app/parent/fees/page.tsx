"use client";

import { useEffect, useState } from "react";
import { SelectInput } from "@/components/Forms";
import {
  getParentByAuthUid,
  getChildrenForParent,
  getFeeStructure,
  getPaymentsForStudent,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
  className?: string;
  classId: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  datePaid: string;
}

interface FeeRow {
  classId: string;
  amount: number;
}

export default function ParentFeesPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [childId, setChildId] = useState("");

  const [amountDue, setAmountDue] = useState(0);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.uid) return;

    const loadChildren = async () => {
      try {
        setLoading(true);
        setError("");

        const parent = await getParentByAuthUid(profile.uid);

        if (!parent) {
          setChildren([]);
          return;
        }

        // IMPORTANT:
        // students.parentUid stores the authenticated parent's UID.
        const kids = await getChildrenForParent(profile.uid);

        const childList = kids as ChildRecord[];

        setChildren(childList);

        if (childList.length === 1) {
          setChildId(childList[0].id);
        } else if (childList.length === 0) {
          setChildId("");
        }
      } catch (err) {
        console.error("Failed to load parent fees:", err);
        setError("Unable to load your children and fees.");
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [profile?.uid]);

  useEffect(() => {
    if (!childId) {
      setAmountDue(0);
      setPayments([]);
      return;
    }

    const child = children.find(
      (item) => item.id === childId
    );

    if (!child) return;

    const loadFees = async () => {
      try {
        setFeesLoading(true);
        setError("");

        const [feeStructure, paymentList] =
          await Promise.all([
            getFeeStructure(term, session),
            getPaymentsForStudent(
              childId,
              term,
              session
            ),
          ]);

        const feeRows =
          feeStructure as FeeRow[];

        const feeRow = feeRows.find(
          (fee) => fee.classId === child.classId
        );

        setAmountDue(
          Number(feeRow?.amount || 0)
        );

        setPayments(
          paymentList as PaymentRow[]
        );
      } catch (err) {
        console.error(
          "Failed to load student fees:",
          err
        );

        setAmountDue(0);
        setPayments([]);
        setError(
          "Unable to load the fee information for this student."
        );
      } finally {
        setFeesLoading(false);
      }
    };

    loadFees();
  }, [
    childId,
    children,
    term,
    session,
  ]);

  const formatNaira = (amount: number) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  const totalPaid = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  const balance = Math.max(
    amountDue - totalPaid,
    0
  );

  const overpaid = Math.max(
    totalPaid - amountDue,
    0
  );

  if (loading) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-gray-400">
          Loading fees...
        </p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Fees
          </h1>

          <p className="text-sm text-gray-500">
            {session} &middot; {term}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-status-disabled">
            No children linked to your account yet.
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Contact your school administrator if your
            child should be linked to this account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          School Fees
        </h1>

        <p className="text-sm text-gray-500">
          {session} &middot; {term}
        </p>
      </div>

      {children.length > 1 && (
        <div className="max-w-sm">
          <SelectInput
            label="Child"
            value={childId}
            onChange={(event) =>
              setChildId(event.target.value)
            }
            options={[
              {
                label: "Select a child",
                value: "",
              },
              ...children.map((child) => ({
                label: `${child.firstName} ${child.lastName}`,
                value: child.id,
              })),
            ]}
          />
        </div>
      )}

      {children.length === 1 && childId && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400">
            Student
          </p>

          <p className="font-semibold text-gray-800">
            {children[0].firstName}{" "}
            {children[0].lastName}
          </p>

          <p className="text-sm text-gray-500">
            {children[0].className ||
              children[0].classId}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-card border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {childId && (
        <>
          {feesLoading ? (
            <p className="text-sm text-gray-400">
              Loading fee details...
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Amount Due
                  </p>

                  <p className="text-xl font-semibold text-gray-800 mt-1">
                    {formatNaira(amountDue)}
                  </p>
                </div>

                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Amount Paid
                  </p>

                  <p className="text-xl font-semibold text-gray-800 mt-1">
                    {formatNaira(totalPaid)}
                  </p>
                </div>

                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Balance
                  </p>

                  <p
                    className={`text-xl font-semibold mt-1 ${
                      balance <= 0
                        ? "text-status-active"
                        : "text-status-disabled"
                    }`}
                  >
                    {formatNaira(balance)}
                  </p>
                </div>
              </div>

              {amountDue === 0 && (
                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
                  <p className="text-sm text-gray-500">
                    No fee structure has been set for this
                    student's class for the current
                    session and term.
                  </p>
                </div>
              )}

              {balance <= 0 && amountDue > 0 && (
                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-medium text-status-active">
                    Fees fully paid.
                  </p>

                  {overpaid > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Overpayment:{" "}
                      {formatNaira(overpaid)}
                    </p>
                  )}
                </div>
              )}

              {balance > 0 && (
                <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-medium text-status-disabled">
                    Outstanding balance:{" "}
                    {formatNaira(balance)}
                  </p>
                </div>
              )}

              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Payment History
                  </h2>

                  <p className="text-xs text-gray-400">
                    Payments recorded for {term},{" "}
                    {session}.
                  </p>
                </div>

                <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
                  {payments.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-gray-400 text-center">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between gap-4 px-4 py-4"
                        >
                          <div>
                            <p className="text-sm text-gray-700">
                              {payment.datePaid}
                            </p>

                            <p className="text-xs text-gray-400">
                              Payment recorded
                            </p>
                          </div>

                          <p className="font-semibold text-gray-800">
                            {formatNaira(
                              payment.amount
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}