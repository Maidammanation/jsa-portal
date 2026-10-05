"use client";

import { useEffect, useMemo, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudentsByClass,
  getAttendanceSession,
} from "@/services/database";
import type {
  AttendanceStatus,
  ClassRoom,
  Student,
} from "@/lib/types";

const STATUS_OPTIONS: {
  label: string;
  value: AttendanceStatus;
}[] = [
  {
    label: "Present",
    value: "present",
  },
  {
    label: "Absent",
    value: "absent",
  },
  {
    label: "Late",
    value: "late",
  },
];

const statusStyle: Record<
  AttendanceStatus,
  string
> = {
  present:
    "bg-status-active/10 text-status-active border-status-active/30",
  absent:
    "bg-status-disabled/10 text-status-disabled border-status-disabled/30",
  late:
    "bg-status-suspended/10 text-status-suspended border-status-suspended/30",
};

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRoom[]>(
    []
  );

  const [classId, setClassId] = useState("");

  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [students, setStudents] = useState<Student[]>(
    []
  );

  const [marks, setMarks] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * Load classes
   */
  useEffect(() => {
    setLoadingClasses(true);

    getClasses()
      .then((data) => {
        setClasses(data as ClassRoom[]);
      })
      .catch(() => {
        setClasses([]);
        setError("Could not load classes.");
      })
      .finally(() => {
        setLoadingClasses(false);
      });
  }, []);

  /*
   * Load students and existing attendance
   */
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setMarks({});
      setMessage("");
      setError("");
      return;
    }

    setLoadingStudents(true);
    setMessage("");
    setError("");

    Promise.all([
      getStudentsByClass(classId),
      getAttendanceSession(classId, date),
    ])
      .then(([studentList, existingSession]) => {
        const list = studentList as Student[];

        setStudents(list);

        const initialMarks: Record<
          string,
          AttendanceStatus
        > = {};

        const existing = existingSession as {
          records?: {
            studentId: string;
            status: AttendanceStatus;
          }[];
        } | null;

        list.forEach((student) => {
          const previous =
            existing?.records?.find(
              (record) =>
                record.studentId === student.id
            );

          initialMarks[student.id] =
            previous?.status || "present";
        });

        setMarks(initialMarks);

        if (existing) {
          setMessage(
            "Attendance already exists for this date. You can edit it and submit again."
          );
        }
      })
      .catch(() => {
        setStudents([]);
        setMarks({});
        setError(
          "Could not load attendance data."
        );
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [classId, date]);

  /*
   * Attendance statistics
   */
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;

    students.forEach((student) => {
      const status =
        marks[student.id] || "present";

      if (status === "present") {
        present += 1;
      }

      if (status === "absent") {
        absent += 1;
      }

      if (status === "late") {
        late += 1;
      }
    });

    return {
      total: students.length,
      present,
      absent,
      late,
    };
  }, [students, marks]);

  /*
   * Change individual student's attendance
   */
  const setMark = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setMarks((previous) => ({
      ...previous,
      [studentId]: status,
    }));

    setMessage("");
    setError("");
  };

  /*
   * Mark everyone with one status
   */
  const markAll = (
    status: AttendanceStatus
  ) => {
    const next: Record<
      string,
      AttendanceStatus
    > = {};

    students.forEach((student) => {
      next[student.id] = status;
    });

    setMarks(next);
    setMessage("");
    setError("");
  };

  /*
   * Submit attendance
   */
  const handleSubmit = async () => {
    if (!classId) {
      setError("Please select a class.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    if (students.length === 0) {
      setError(
        "There are no students in this class."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const records = students.map(
        (student) => ({
          studentId: student.id,
          status:
            marks[student.id] || "present",
        })
      );

      const response = await fetch(
        "/api/admin/submit-attendance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            date,
            records,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not submit attendance."
        );
      }

      setMessage(
        data.message ||
          "Attendance submitted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Attendance
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Record daily student attendance.
        </p>
      </div>

      {/* Class and date */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput
            label="Class"
            value={classId}
            onChange={(e) =>
              setClassId(e.target.value)
            }
            options={[
              {
                label: loadingClasses
                  ? "Loading classes..."
                  : "Select a class",
                value: "",
              },
              ...classes.map((classRoom) => ({
                label: classRoom.name,
                value: classRoom.id,
              })),
            ]}
          />

          <TextInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
          />
        </div>
      </div>

      {/* Success message */}
      {message && (
        <div className="rounded-lg border border-status-active/20 bg-status-active/5 px-4 py-3 text-sm text-status-active">
          {message}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-status-disabled/20 bg-status-disabled/5 px-4 py-3 text-sm text-status-disabled">
          {error}
        </div>
      )}

      {/* Loading */}
      {loadingStudents && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading students...
          </p>
        </div>
      )}

      {/* Attendance content */}
      {!loadingStudents &&
        students.length > 0 && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Total
                </p>

                <p className="text-2xl font-semibold text-gray-800 mt-1">
                  {counts.total}
                </p>
              </div>

              <div className="bg-white rounded-card border border-status-active/20 shadow-sm p-4">
                <p className="text-xs text-status-active uppercase tracking-wide">
                  Present
                </p>

                <p className="text-2xl font-semibold text-status-active mt-1">
                  {counts.present}
                </p>
              </div>

              <div className="bg-white rounded-card border border-status-disabled/20 shadow-sm p-4">
                <p className="text-xs text-status-disabled uppercase tracking-wide">
                  Absent
                </p>

                <p className="text-2xl font-semibold text-status-disabled mt-1">
                  {counts.absent}
                </p>
              </div>

              <div className="bg-white rounded-card border border-status-suspended/20 shadow-sm p-4">
                <p className="text-xs text-status-suspended uppercase tracking-wide">
                  Late
                </p>

                <p className="text-2xl font-semibold text-status-suspended mt-1">
                  {counts.late}
                </p>
              </div>
            </div>

            {/* Students */}
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              {/* Top bar */}
              <div className="px-4 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {students.length} student
                    {students.length === 1
                      ? ""
                      : "s"}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {date}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      markAll("present")
                    }
                    className="text-xs font-medium text-status-active hover:underline"
                  >
                    Mark all present
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      markAll("absent")
                    }
                    className="text-xs font-medium text-status-disabled hover:underline"
                  >
                    Mark all absent
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      markAll("late")
                    }
                    className="text-xs font-medium text-status-suspended hover:underline"
                  >
                    Mark all late
                  </button>
                </div>
              </div>

              {/* Student rows */}
              <div className="divide-y divide-gray-100">
                {students.map(
                  (student, index) => {
                    const current =
                      marks[student.id] ||
                      "present";

                    return (
                      <div
                        key={student.id}
                        className="px-4 py-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          {/* Student information */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center text-xs font-semibold shrink-0">
                              {index + 1}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">
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
                            </div>
                          </div>

                          {/* Status buttons */}
                          <div className="flex gap-2">
                            {STATUS_OPTIONS.map(
                              (option) => (
                                <button
                                  key={
                                    option.value
                                  }
                                  type="button"
                                  onClick={() =>
                                    setMark(
                                      student.id,
                                      option.value
                                    )
                                  }
                                  className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                                    current ===
                                    option.value
                                      ? statusStyle[
                                          option
                                            .value
                                        ]
                                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                                  }`}
                                >
                                  {
                                    option.label
                                  }
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Submit */}
              <div className="px-4 py-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? "Submitting..."
                    : "Submit Attendance"}
                </Button>
              </div>
            </div>
          </>
        )}

      {/* Empty class */}
      {!loadingStudents &&
        classId &&
        students.length === 0 &&
        !error && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-400">
              No students found in this class.
            </p>
          </div>
        )}
    </div>
  );
}