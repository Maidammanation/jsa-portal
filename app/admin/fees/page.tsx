"use client";

import { useEffect, useMemo, useState } from "react";
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

import type {
  ClassRoom,
  Student,
} from "@/lib/types";

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

type FeeStatus =
  | "paid"
  | "partial"
  | "unpaid"
  | "no-fee";

interface OverviewRow {
  student: Student;
  amountDue: number;
  totalPaid: number;
  balance: number;
  status: FeeStatus;
}

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

export default function FeesPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [feeStructure, setFeeStructure] =
    useState<FeeRow[]>([]);

  const [payments, setPayments] =
    useState<PaymentRow[]>([]);

  const [feeInputs, setFeeInputs] =
    useState<Record<string, string>>({});

  const [savingClassId, setSavingClassId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingError, setLoadingError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // Payment form
  const [payStudentId, setPayStudentId] =
    useState("");

  const [payAmount, setPayAmount] =
    useState("");

  const [payDate, setPayDate] =
    useState(() =>
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [savingPayment, setSavingPayment] =
    useState(false);

  // Overview filters
  const [search, setSearch] =
    useState("");

  const [classFilter, setClassFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | FeeStatus>("all");

  const loadAll = async () => {
    setLoading(true);
    setLoadingError("");

    try {
      const [
        classList,
        studentList,
        fees,
        pays,
      ] = await Promise.all([
        getClasses(),
        getStudents(),
        getFeeStructure(term, session),
        getAllPayments(term, session),
      ]);

      const typedClasses =
        classList as ClassRoom[];

      const typedStudents =
        studentList as Student[];

      const typedFees =
        fees as FeeRow[];

      const typedPayments =
        pays as PaymentRow[];

      setClasses(typedClasses);
      setStudents(typedStudents);
      setFeeStructure(typedFees);
      setPayments(typedPayments);

      const initial: Record<
        string,
        string
      > = {};

      typedClasses.forEach(
        (classRoom) => {
          const existing =
            typedFees.find(
              (fee) =>
                fee.classId ===
                classRoom.id
            );

          initial[classRoom.id] =
            existing
              ? String(
                  existing.amount
                )
              : "";
        }
      );

      setFeeInputs(initial);
    } catch (err) {
      setLoadingError(
        err instanceof Error
          ? err.message
          : "Could not load fee information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [term, session]);

  const getStudentFee = (
    student: Student
  ) => {
    return (
      feeStructure.find(
        (fee) =>
          fee.classId ===
          student.classId
      )?.amount || 0
    );
  };

  const getStudentPaid = (
    studentId: string
  ) => {
    return payments
      .filter(
        (payment) =>
          payment.studentId ===
          studentId
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );
  };

  const getStatus = (
    amountDue: number,
    totalPaid: number
  ): FeeStatus => {
    if (amountDue <= 0) {
      return "no-fee";
    }

    if (totalPaid >= amountDue) {
      return "paid";
    }

    if (totalPaid > 0) {
      return "partial";
    }

    return "unpaid";
  };

  const overview =
    useMemo<OverviewRow[]>(() => {
      return students.map(
        (student) => {
          const amountDue =
            getStudentFee(student);

          const totalPaid =
            getStudentPaid(
              student.id
            );

          const balance =
            Math.max(
              0,
              amountDue -
                totalPaid
            );

          return {
            student,
            amountDue,
            totalPaid,
            balance,
            status: getStatus(
              amountDue,
              totalPaid
            ),
          };
        }
      );
    }, [
      students,
      feeStructure,
      payments,
    ]);

  const filteredOverview =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return overview.filter(
        (row) => {
          const fullName =
            `${row.student.firstName} ${row.student.lastName}`
              .toLowerCase();

          const admissionNo =
            row.student.admissionNo.toLowerCase();

          const matchesSearch =
            !query ||
            fullName.includes(
              query
            ) ||
            admissionNo.includes(
              query
            );

          const matchesClass =
            !classFilter ||
            row.student.classId ===
              classFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            row.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesClass &&
            matchesStatus
          );
        }
      );
    }, [
      overview,
      search,
      classFilter,
      statusFilter,
    ]);

  const statistics =
    useMemo(() => {
      const totalDue =
        overview.reduce(
          (sum, row) =>
            sum + row.amountDue,
          0
        );

      const totalPaid =
        overview.reduce(
          (sum, row) =>
            sum + row.totalPaid,
          0
        );

      const totalBalance =
        overview.reduce(
          (sum, row) =>
            sum + row.balance,
          0
        );

      return {
        students:
          overview.length,
        totalDue,
        totalPaid,
        totalBalance,

        paid: overview.filter(
          (row) =>
            row.status === "paid"
        ).length,

        partial:
          overview.filter(
            (row) =>
              row.status ===
              "partial"
          ).length,

        unpaid:
          overview.filter(
            (row) =>
              row.status ===
              "unpaid"
          ).length,

        noFee:
          overview.filter(
            (row) =>
              row.status ===
              "no-fee"
          ).length,
      };
    }, [overview]);

  const paymentStudent =
    students.find(
      (student) =>
        student.id ===
        payStudentId
    );

  const paymentOutstanding =
    paymentStudent
      ? overview.find(
          (row) =>
            row.student.id ===
            paymentStudent.id
        )?.balance || 0
      : 0;

  const handleSaveFee =
    async (classId: string) => {
      setMessage("");
      setError("");

      const rawAmount =
        feeInputs[classId] || "";

      const amount =
        Number(rawAmount);

      if (
        !Number.isFinite(
          amount
        ) ||
        amount < 0
      ) {
        setError(
          "Fee amount must be zero or a positive number."
        );
        return;
      }

      setSavingClassId(classId);

      try {
        await setClassFee(
          classId,
          term,
          session,
          amount,
          profile?.name ||
            "admin"
        );

        setMessage(
          "Class fee saved successfully."
        );

        await loadAll();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not save class fee."
        );
      } finally {
        setSavingClassId(null);
      }
    };

  const handleRecordPayment =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setMessage("");
      setError("");

      const student =
        students.find(
          (item) =>
            item.id ===
            payStudentId
        );

      const amount =
        Number(payAmount);

      if (!student) {
        setError(
          "Please select a student."
        );
        return;
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          "Payment amount must be greater than ₦0."
        );
        return;
      }

      if (!payDate) {
        setError(
          "Please select the payment date."
        );
        return;
      }

      if (
        paymentOutstanding <= 0
      ) {
        setError(
          "This student has no outstanding balance for the selected term."
        );
        return;
      }

      if (
        amount >
        paymentOutstanding
      ) {
        setError(
          `Payment cannot be greater than the outstanding balance of ${formatNaira(
            paymentOutstanding
          )}.`
        );
        return;
      }

      setSavingPayment(true);

      try {
        await recordPayment(
          student.id,
          student.classId,
          term,
          session,
          amount,
          payDate,
          profile?.name ||
            "admin"
        );

        setPayStudentId("");
        setPayAmount("");

        setPayDate(
          new Date()
            .toISOString()
            .slice(0, 10)
        );

        setMessage(
          "Payment recorded successfully."
        );

        await loadAll();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not record payment."
        );
      } finally {
        setSavingPayment(false);
      }
    };

  const statusLabel = (
    status: FeeStatus
  ) => {
    if (status === "paid") {
      return "Paid";
    }

    if (status === "partial") {
      return "Partial";
    }

    if (status === "unpaid") {
      return "Unpaid";
    }

    return "No fee";
  };

  const statusClass = (
    status: FeeStatus
  ) => {
    if (status === "paid") {
      return "bg-status-active/10 text-status-active border-status-active/20";
    }

    if (status === "partial") {
      return "bg-status-suspended/10 text-status-suspended border-status-suspended/20";
    }

    if (status === "unpaid") {
      return "bg-status-disabled/10 text-status-disabled border-status-disabled/20";
    }

    return "bg-gray-100 text-gray-500 border-gray-200";
  };

  const paymentHistory =
    useMemo(() => {
      return [...payments]
        .sort((a, b) =>
          String(
            b.datePaid || ""
          ).localeCompare(
            String(
              a.datePaid || ""
            )
          )
        )
        .slice(0, 10)
        .map((payment) => {
          const student =
            students.find(
              (item) =>
                item.id ===
                payment.studentId
            );

          return {
            ...payment,
            student,
          };
        });
    }, [
      payments,
      students,
    ]);

  return (
    <div className="max-w-6xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Fees Management
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {session} &middot; {term}
        </p>
      </div>

      {/* Global messages */}
      {message && (
        <div className="rounded-lg border border-status-active/20 bg-status-active/5 px-4 py-3 text-sm text-status-active">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-status-disabled/20 bg-status-disabled/5 px-4 py-3 text-sm text-status-disabled">
          {error}
        </div>
      )}

      {loadingError && (
        <div className="rounded-lg border border-status-disabled/20 bg-status-disabled/5 px-4 py-3 text-sm text-status-disabled">
          {loadingError}

          <button
            type="button"
            onClick={loadAll}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading fees...
          </p>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Students
              </p>

              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {statistics.students}
              </p>
            </div>

            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Total Due
              </p>

              <p className="text-lg font-semibold text-gray-800 mt-2">
                {formatNaira(
                  statistics.totalDue
                )}
              </p>
            </div>

            <div className="bg-white rounded-card border border-status-active/20 shadow-sm p-4">
              <p className="text-xs text-status-active uppercase tracking-wide">
                Total Paid
              </p>

              <p className="text-lg font-semibold text-status-active mt-2">
                {formatNaira(
                  statistics.totalPaid
                )}
              </p>
            </div>

            <div className="bg-white rounded-card border border-status-disabled/20 shadow-sm p-4">
              <p className="text-xs text-status-disabled uppercase tracking-wide">
                Outstanding
              </p>

              <p className="text-lg font-semibold text-status-disabled mt-2">
                {formatNaira(
                  statistics.totalBalance
                )}
              </p>
            </div>
          </section>

          {/* Status summary */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-card border border-status-active/20 bg-status-active/5 p-4">
              <p className="text-xs text-status-active">
                Paid
              </p>

              <p className="text-xl font-semibold text-status-active mt-1">
                {statistics.paid}
              </p>
            </div>

            <div className="rounded-card border border-status-suspended/20 bg-status-suspended/5 p-4">
              <p className="text-xs text-status-suspended">
                Partial
              </p>

              <p className="text-xl font-semibold text-status-suspended mt-1">
                {statistics.partial}
              </p>
            </div>

            <div className="rounded-card border border-status-disabled/20 bg-status-disabled/5 p-4">
              <p className="text-xs text-status-disabled">
                Unpaid
              </p>

              <p className="text-xl font-semibold text-status-disabled mt-1">
                {statistics.unpaid}
              </p>
            </div>

            <div className="rounded-card border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                No Fee Set
              </p>

              <p className="text-xl font-semibold text-gray-600 mt-1">
                {statistics.noFee}
              </p>
            </div>
          </section>

          {/* Fee structure */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Fee Structure
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Set the fee payable by
                each class for the
                current term.
              </p>
            </div>

            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              {classes.length ===
              0 ? (
                <p className="px-4 py-5 text-sm text-gray-400">
                  No classes yet —
                  add classes first
                  under Classes &
                  Subjects.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {classes.map(
                    (classRoom) => {
                      const existing =
                        feeStructure.find(
                          (fee) =>
                            fee.classId ===
                            classRoom.id
                        );

                      return (
                        <div
                          key={
                            classRoom.id
                          }
                          className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {
                                classRoom.name
                              }
                            </p>

                            <p className="text-xs text-gray-400 mt-1">
                              Current
                              fee:{" "}
                              {existing
                                ? formatNaira(
                                    existing.amount
                                  )
                                : "Not set"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                ₦
                              </span>

                              <input
                                type="number"
                                min={0}
                                step="1"
                                placeholder="Amount"
                                value={
                                  feeInputs[
                                    classRoom
                                      .id
                                  ] ||
                                  ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  setFeeInputs(
                                    (
                                      previous
                                    ) => ({
                                      ...previous,
                                      [classRoom.id]:
                                        e
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className="w-36 rounded border border-gray-300 pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                              />
                            </div>

                            <Button
                              onClick={() =>
                                handleSaveFee(
                                  classRoom.id
                                )
                              }
                              disabled={
                                savingClassId ===
                                classRoom.id
                              }
                              variant="ghost"
                            >
                              {savingClassId ===
                              classRoom.id
                                ? "Saving..."
                                : "Save"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Record payment */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Record Payment
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Record a student's fee
                payment for the current
                term.
              </p>
            </div>

            <form
              onSubmit={
                handleRecordPayment
              }
              className="bg-white rounded-card border border-gray-100 shadow-sm p-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <SelectInput
                    label="Student"
                    value={
                      payStudentId
                    }
                    onChange={(e) => {
                      setPayStudentId(
                        e.target
                          .value
                      );

                      setError("");
                    }}
                    options={[
                      {
                        label:
                          "Select a student",
                        value:
                          "",
                      },

                      ...students.map(
                        (
                          student
                        ) => ({
                          label: `${student.firstName} ${student.lastName} (${student.admissionNo})`,
                          value:
                            student.id,
                        })
                      ),
                    ]}
                  />

                  {paymentStudent && (
                    <p className="text-xs text-gray-400 mt-1">
                      Outstanding:{" "}
                      <span className="font-medium text-gray-600">
                        {formatNaira(
                          paymentOutstanding
                        )}
                      </span>
                    </p>
                  )}
                </div>

                <TextInput
                  label="Amount"
                  type="number"
                  min={1}
                  step="1"
                  value={
                    payAmount
                  }
                  onChange={(e) =>
                    setPayAmount(
                      e.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Date Paid"
                  type="date"
                  value={
                    payDate
                  }
                  onChange={(e) =>
                    setPayDate(
                      e.target
                        .value
                    )
                  }
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    savingPayment ||
                    !payStudentId ||
                    !payAmount
                  }
                >
                  {savingPayment
                    ? "Recording..."
                    : "Record Payment"}
                </Button>
              </div>
            </form>
          </section>

          {/* Fee overview */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Fee Overview
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Track each student's
                payment status and
                outstanding balance.
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput
                  label="Search"
                  placeholder="Name or admission number"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target
                        .value
                    )
                  }
                />

                <SelectInput
                  label="Class"
                  value={
                    classFilter
                  }
                  onChange={(e) =>
                    setClassFilter(
                      e.target
                        .value
                    )
                  }
                  options={[
                    {
                      label:
                        "All classes",
                      value:
                        "",
                    },

                    ...classes.map(
                      (
                        classRoom
                      ) => ({
                        label:
                          classRoom.name,
                        value:
                          classRoom.id,
                      })
                    ),
                  ]}
                />

                <SelectInput
                  label="Payment Status"
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target
                        .value as
                        | "all"
                        | FeeStatus
                    )
                  }
                  options={[
                    {
                      label:
                        "All statuses",
                      value:
                        "all",
                    },
                    {
                      label:
                        "Paid",
                      value:
                        "paid",
                    },
                    {
                      label:
                        "Partial",
                      value:
                        "partial",
                    },
                    {
                      label:
                        "Unpaid",
                      value:
                        "unpaid",
                    },
                    {
                      label:
                        "No fee",
                      value:
                        "no-fee",
                    },
                  ]}
                />
              </div>

              {(search ||
                classFilter ||
                statusFilter !==
                  "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setClassFilter(
                      ""
                    );
                    setStatusFilter(
                      "all"
                    );
                  }}
                  className="mt-3 text-xs text-brand-dark hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Desktop/table */}
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                    <th className="px-4 py-3 font-medium">
                      Student
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Class
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Due
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Paid
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Balance
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredOverview.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        No students
                        match the
                        selected
                        filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOverview.map(
                      ({
                        student,
                        amountDue,
                        totalPaid,
                        balance,
                        status,
                      }) => (
                        <tr
                          key={
                            student.id
                          }
                          className="hover:bg-gray-50/60"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-700">
                              {
                                student.firstName
                              }{" "}
                              {
                                student.lastName
                              }
                            </p>

                            <p className="text-xs text-gray-400 mt-1">
                              {
                                student.admissionNo
                              }
                            </p>
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {student.className ||
                              classes.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  student.classId
                              )
                                ?.name ||
                              "—"}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {formatNaira(
                              amountDue
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {formatNaira(
                              totalPaid
                            )}
                          </td>

                          <td className="px-4 py-3 font-medium text-gray-700">
                            {formatNaira(
                              balance
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                                status
                              )}`}
                            >
                              {statusLabel(
                                status
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400">
              Showing{" "}
              {
                filteredOverview.length
              }{" "}
              of{" "}
              {overview.length}{" "}
              student
              {overview.length ===
              1
                ? ""
                : "s"}
              .
            </p>
          </section>

          {/* Recent payments */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Recent Payments
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Latest recorded payments
                for {term}.
              </p>
            </div>

            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              {paymentHistory.length ===
              0 ? (
                <p className="px-4 py-6 text-sm text-gray-400">
                  No payments recorded
                  yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {paymentHistory.map(
                    (payment) => (
                      <div
                        key={
                          payment.id
                        }
                        className="px-4 py-4 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {payment.student
                              ? `${payment.student.firstName} ${payment.student.lastName}`
                              : "Unknown student"}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {payment.student
                              ?.admissionNo ||
                              "—"}{" "}
                            &middot;{" "}
                            {payment.datePaid ||
                              "No date"}
                          </p>
                        </div>

                        <p className="text-sm font-semibold text-status-active whitespace-nowrap">
                          +
                          {formatNaira(
                            Number(
                              payment.amount ||
                                0
                            )
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}