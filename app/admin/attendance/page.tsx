"use client";

import { useEffect, useMemo, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { useAuth } from "@/context/AuthContext";
import {
  getClasses,
  getStudents,
  getFeeStructure,
  setClassFee,
  getAllPayments,
  recordPayment,
} from "@/services/database";
import type {
  ClassRoom,
  Student,
} from "@/lib/types";

type PaymentRecord = {
  id: string;
  studentId: string;
  amount: number;
  date?: string;
  reference?: string;
  recordedBy?: string;
  term?: string;
  session?: string;
};

type FeeStructure = {
  id?: string;
  classId: string;
  amount: number;
  term: string;
  session: string;
};

type StudentFeeRow = {
  student: Student;
  fee: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid" | "no-fee";
};

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

const CURRENT_TERM = "First Term";
const CURRENT_SESSION = "2025/2026";

export default function FeesPage() {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>(
    []
  );

  const [students, setStudents] = useState<Student[]>(
    []
  );

  const [payments, setPayments] = useState<
    PaymentRecord[]
  >([]);

  const [feeStructures, setFeeStructures] = useState<
    FeeStructure[]
  >([]);

  const [selectedClass, setSelectedClass] =
    useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);

  const [savingClassId, setSavingClassId] =
    useState<string | null>(null);

  const [feeInputs, setFeeInputs] = useState<
    Record<string, string>
  >({});

  const [paymentStudentId, setPaymentStudentId] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentReference, setPaymentReference] =
    useState("");

  const [savingPayment, setSavingPayment] =
    useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  /*
   * Load classes, students, fees and payments
   */
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        classData,
        studentData,
        paymentData,
      ] = await Promise.all([
        getClasses(),
        getStudents(),
        getAllPayments(),
      ]);

      const loadedClasses =
        classData as ClassRoom[];

      const loadedStudents =
        studentData as Student[];

      setClasses(loadedClasses);
      setStudents(loadedStudents);

      setPayments(paymentData as PaymentRecord[]);

      const structures: FeeStructure[] = [];

      for (const classRoom of loadedClasses) {
        try {
          const fee = await getFeeStructure(
            CURRENT_TERM,
            CURRENT_SESSION,
            classRoom.id
          );

          if (fee) {
            structures.push(
              fee as FeeStructure
            );
          }
        } catch {
          // Ignore classes without fee structures.
        }
      }

      setFeeStructures(structures);

      const initialInputs: Record<
        string,
        string
      > = {};

      structures.forEach((fee) => {
        initialInputs[fee.classId] =
          String(fee.amount);
      });

      setFeeInputs(initialInputs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load fees."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*
   * Find fee for class
   */
  const getClassFee = (classId: string) => {
    const structure = feeStructures.find(
      (fee) => fee.classId === classId
    );

    return structure?.amount || 0;
  };

  /*
   * Calculate total paid for student
   */
  const getStudentPaid = (
    studentId: string
  ) => {
    return payments
      .filter(
        (payment) =>
          payment.studentId === studentId
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );
  };

  /*
   * Student fee rows
   */
  const studentRows = useMemo(() => {
    const rows: StudentFeeRow[] =
      students.map((student) => {
        const fee = getClassFee(
          student.classId
        );

        const paid = getStudentPaid(
          student.id
        );

        const balance = Math.max(
          fee - paid,
          0
        );

        let status:
          | "paid"
          | "partial"
          | "unpaid"
          | "no-fee" = "no-fee";

        if (fee > 0 && paid >= fee) {
          status = "paid";
        } else if (fee > 0 && paid > 0) {
          status = "partial";
        } else if (fee > 0) {
          status = "unpaid";
        }

        return {
          student,
          fee,
          paid,
          balance,
          status,
        };
      });

    return rows;
  }, [
    students,
    payments,
    feeStructures,
  ]);

  /*
   * Filter students
   */
  const filteredRows = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return studentRows.filter((row) => {
      const matchesClass =
        !selectedClass ||
        row.student.classId === selectedClass;

      const matchesSearch =
        !query ||
        `${row.student.firstName} ${row.student.lastName}`
          .toLowerCase()
          .includes(query) ||
        row.student.admissionNo
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        row.status === statusFilter;

      return (
        matchesClass &&
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    studentRows,
    selectedClass,
    search,
    statusFilter,
  ]);

  /*
   * Overall statistics
   */
  const stats = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let noFeeCount = 0;

    studentRows.forEach((row) => {
      totalDue += row.fee;
      totalPaid += row.paid;

      if (row.status === "paid") {
        paidCount += 1;
      }

      if (row.status === "partial") {
        partialCount += 1;
      }

      if (row.status === "unpaid") {
        unpaidCount += 1;
      }

      if (row.status === "no-fee") {
        noFeeCount += 1;
      }
    });

    return {
      students: students.length,
      totalDue,
      totalPaid,
      outstanding: Math.max(
        totalDue - totalPaid,
        0
      ),
      paidCount,
      partialCount,
      unpaidCount,
      noFeeCount,
    };
  }, [studentRows, students.length]);

  /*
   * Save class fee
   */
  const handleSaveClassFee = async (
    classId: string
  ) => {
    const rawValue = feeInputs[classId];

    const amount = Number(rawValue);

    if (!Number.isFinite(amount) || amount < 0) {
      setError(
        "Please enter a valid fee amount."
      );
      return;
    }

    setSavingClassId(classId);
    setMessage("");
    setError("");

    try {
      await setClassFee(
        classId,
        CURRENT_TERM,
        CURRENT_SESSION,
        amount
      );

      setMessage(
        "Class fee saved successfully."
      );

      await loadData();
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

  /*
   * Record payment
   */
  const handleRecordPayment = async () => {
    if (!paymentStudentId) {
      setError(
        "Please select a student."
      );
      return;
    }

    const amount = Number(paymentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid payment amount."
      );
      return;
    }

    const selectedStudent = students.find(
      (student) =>
        student.id === paymentStudentId
    );

    if (!selectedStudent) {
      setError(
        "Selected student was not found."
      );
      return;
    }

    const fee = getClassFee(
      selectedStudent.classId
    );

    const alreadyPaid = getStudentPaid(
      selectedStudent.id
    );

    const balance = Math.max(
      fee - alreadyPaid,
      0
    );

    if (fee > 0 && amount > balance) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatNaira(
          balance
        )}.`
      );
      return;
    }

    setSavingPayment(true);
    setMessage("");
    setError("");

    try {
      await recordPayment({
        studentId: paymentStudentId,
        amount,
        reference:
          paymentReference.trim() ||
          undefined,
        term: CURRENT_TERM,
        session: CURRENT_SESSION,
        recordedBy:
          profile?.uid || "",
      });

      setPaymentAmount("");
      setPaymentReference("");

      setMessage(
        "Payment recorded successfully."
      );

      await loadData();
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

  /*
   * Recent payments
   */
  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => {
        const dateA = a.date
          ? new Date(a.date).getTime()
          : 0;

        const dateB = b.date
          ? new Date(b.date).getTime()
          : 0;

        return dateB - dateA;
      })
      .slice(0, 10);
  }, [payments]);

  const getStudentName = (
    studentId: string
  ) => {
    const student = students.find(
      (item) => item.id === studentId
    );

    if (!student) {
      return "Unknown student";
    }

    return `${student.firstName} ${student.lastName}`;
  };

  const getClassName = (
    classId: string
  ) => {
    const classRoom = classes.find(
      (item) => item.id === classId
    );

    return classRoom?.name || "Unknown class";
  };

  const getStatusLabel = (
    status: StudentFeeRow["status"]
  ) => {
    switch (status) {
      case "paid":
        return "Paid";

      case "partial":
        return "Partial";

      case "unpaid":
        return "Unpaid";

      default:
        return "No Fee";
    }
  };

  const getStatusClass = (
    status: StudentFeeRow["status"]
  ) => {
    switch (status) {
      case "paid":
        return "bg-status-active/10 text-status-active border-status-active/20";

      case "partial":
        return "bg-status-suspended/10 text-status-suspended border-status-suspended/20";

      case "unpaid":
        return "bg-status-disabled/10 text-status-disabled border-status-disabled/20";

      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Fees Management
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Manage school fees, student payments
          and outstanding balances.
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {CURRENT_TERM} •{" "}
          {CURRENT_SESSION}
        </p>
      </div>

      {/* Messages */}
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

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Students
          </p>

          <p className="text-2xl font-semibold text-gray-800 mt-1">
            {stats.students}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Total Due
          </p>

          <p className="text-xl font-semibold text-gray-800 mt-1">
            {formatNaira(stats.totalDue)}
          </p>
        </div>

        <div className="bg-white rounded-card border border-status-active/20 shadow-sm p-4">
          <p className="text-xs text-status-active uppercase tracking-wide">
            Total Paid
          </p>

          <p className="text-xl font-semibold text-status-active mt-1">
            {formatNaira(stats.totalPaid)}
          </p>
        </div>

        <div className="bg-white rounded-card border border-status-disabled/20 shadow-sm p-4">
          <p className="text-xs text-status-disabled uppercase tracking-wide">
            Outstanding
          </p>

          <p className="text-xl font-semibold text-status-disabled mt-1">
            {formatNaira(
              stats.outstanding
            )}
          </p>
        </div>
      </div>

      {/* Fee status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">
            Fully Paid
          </p>

          <p className="text-lg font-semibold text-status-active mt-1">
            {stats.paidCount}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">
            Partial
          </p>

          <p className="text-lg font-semibold text-status-suspended mt-1">
            {stats.partialCount}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">
            Unpaid
          </p>

          <p className="text-lg font-semibold text-status-disabled mt-1">
            {stats.unpaidCount}
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">
            No Fee Set
          </p>

          <p className="text-lg font-semibold text-gray-500 mt-1">
            {stats.noFeeCount}
          </p>
        </div>
      </div>

      {/* Class fee structure */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Class Fee Structure
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Set the fee amount for each class.
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">
              Loading fee structures...
            </p>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">
              No classes found.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {classes.map((classRoom) => (
              <div
                key={classRoom.id}
                className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {classRoom.name}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Current fee:{" "}
                    {formatNaira(
                      getClassFee(
                        classRoom.id
                      )
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <TextInput
                      label=""
                      type="number"
                      min="0"
                      value={
                        feeInputs[
                          classRoom.id
                        ] || ""
                      }
                      onChange={(e) =>
                        setFeeInputs(
                          (previous) => ({
                            ...previous,
                            [classRoom.id]:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Fee amount"
                    />
                  </div>

                  <Button
                    onClick={() =>
                      handleSaveClassFee(
                        classRoom.id
                      )
                    }
                    disabled={
                      savingClassId ===
                      classRoom.id
                    }
                  >
                    {savingClassId ===
                    classRoom.id
                      ? "Saving..."
                      : "Save"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record payment */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Record Student Payment
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Record a payment made by a student.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SelectInput
            label="Student"
            value={paymentStudentId}
            onChange={(e) =>
              setPaymentStudentId(
                e.target.value
              )
            }
            options={[
              {
                label: "Select student",
                value: "",
              },
              ...students.map((student) => ({
                label: `${student.firstName} ${student.lastName} — ${student.admissionNo}`,
                value: student.id,
              })),
            ]}
          />

          <TextInput
            label="Amount"
            type="number"
            min="0"
            value={paymentAmount}
            onChange={(e) =>
              setPaymentAmount(
                e.target.value
              )
            }
            placeholder="Enter amount"
          />

          <TextInput
            label="Reference"
            value={paymentReference}
            onChange={(e) =>
              setPaymentReference(
                e.target.value
              )
            }
            placeholder="Optional reference"
          />

          <div className="flex items-end">
            <Button
              onClick={handleRecordPayment}
              disabled={savingPayment}
            >
              {savingPayment
                ? "Recording..."
                : "Record Payment"}
            </Button>
          </div>
        </div>
      </div>

      {/* Student fee overview */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Student Fee Overview
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                View each student's fee status
                and balance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Search
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Name or admission no."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Class
                </label>

                <select
                  value={selectedClass}
                  onChange={(e) =>
                    setSelectedClass(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand bg-white"
                >
                  <option value="">
                    All classes
                  </option>

                  {classes.map((classRoom) => (
                    <option
                      key={classRoom.id}
                      value={classRoom.id}
                    >
                      {classRoom.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand bg-white"
                >
                  <option value="all">
                    All statuses
                  </option>

                  <option value="paid">
                    Paid
                  </option>

                  <option value="partial">
                    Partial
                  </option>

                  <option value="unpaid">
                    Unpaid
                  </option>

                  <option value="no-fee">
                    No Fee
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">
              Loading students...
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">
              No students match the selected
              filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Student
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Class
                  </th>

                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                    Fee
                  </th>

                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                    Paid
                  </th>

                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                    Balance
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.student.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-700">
                        {row.student.firstName}{" "}
                        {row.student.lastName}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {
                          row.student
                            .admissionNo
                        }
                      </p>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getClassName(
                        row.student.classId
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatNaira(row.fee)}
                    </td>

                    <td className="px-4 py-3 text-sm text-status-active text-right">
                      {formatNaira(row.paid)}
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-gray-700 text-right">
                      {formatNaira(
                        row.balance
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(
                          row.status
                        )}`}
                      >
                        {getStatusLabel(
                          row.status
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Recent Payments
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Latest recorded student payments.
          </p>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">
              No payments recorded yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {getStudentName(
                      payment.studentId
                    )}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {payment.date
                      ? new Date(
                          payment.date
                        ).toLocaleDateString(
                          "en-NG"
                        )
                      : "Date not available"}

                    {payment.reference
                      ? ` • Ref: ${payment.reference}`
                      : ""}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm font-semibold text-status-active">
                    {formatNaira(
                      Number(
                        payment.amount || 0
                      )
                    )}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {payment.term ||
                      CURRENT_TERM}{" "}
                    •{" "}
                    {payment.session ||
                      CURRENT_SESSION}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}