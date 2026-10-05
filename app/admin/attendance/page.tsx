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

type MarkStatus =
  | AttendanceStatus
  | "unmarked";

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
  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [classId, setClassId] =
    useState("");

  const [date, setDate] =
    useState(() =>
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [students, setStudents] =
    useState<Student[]>([]);

  const [marks, setMarks] =
    useState<
      Record<string, MarkStatus>
    >({});

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * Load classes
   */
  useEffect(() => {
    let mounted = true;

    setLoadingClasses(true);
    setError("");

    getClasses()
      .then((data) => {
        if (!mounted) return;

        setClasses(
          data as ClassRoom[]
        );
      })
      .catch(() => {
        if (!mounted) return;

        setClasses([]);
        setError(
          "Could not load classes."
        );
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingClasses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load students and existing
   * attendance whenever class/date changes.
   */
  useEffect(() => {
    let mounted = true;

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
      getAttendanceSession(
        classId,
        date
      ),
    ])
      .then(
        ([
          studentData,
          attendanceData,
        ]) => {
          if (!mounted) return;

          const studentList =
            studentData as Student[];

          setStudents(studentList);

          const nextMarks: Record<
            string,
            MarkStatus
          > = {};

          const existingSession =
            attendanceData as {
              records?: {
                studentId: string;
                status: AttendanceStatus;
              }[];
            } | null;

          /*
           * Existing attendance is loaded.
           *
           * For a new attendance session,
           * students remain UNMARKED.
           */
          studentList.forEach(
            (student) => {
              const existingRecord =
                existingSession?.records?.find(
                  (record) =>
                    record.studentId ===
                    student.id
                );

              nextMarks[student.id] =
                existingRecord?.status ||
                "unmarked";
            }
          );

          setMarks(nextMarks);

          if (existingSession) {
            setMessage(
              "Attendance already exists for this date. You can edit it and submit again."
            );
          }
        }
      )
      .catch(() => {
        if (!mounted) return;

        setStudents([]);
        setMarks({});

        setError(
          "Could not load attendance data."
        );
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingStudents(false);
      });

    return () => {
      mounted = false;
    };
  }, [classId, date]);

  /*
   * Attendance counts
   */
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    students.forEach((student) => {
      const status =
        marks[student.id] ||
        "unmarked";

      if (status === "present") {
        present += 1;
      } else if (
        status === "absent"
      ) {
        absent += 1;
      } else if (status === "late") {
        late += 1;
      } else {
        unmarked += 1;
      }
    });

    return {
      total: students.length,
      present,
      absent,
      late,
      unmarked,
    };
  }, [students, marks]);

  /*
   * Mark one student
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
   * Mark everyone
   */
  const markAll = (
    status: AttendanceStatus
  ) => {
    const nextMarks: Record<
      string,
      MarkStatus
    > = {};

    students.forEach((student) => {
      nextMarks[student.id] = status;
    });

    setMarks(nextMarks);
    setMessage("");
    setError("");
  };

  /*
   * Clear all marks
   */
  const clearAll = () => {
    const nextMarks: Record<
      string,
      MarkStatus
    > = {};

    students.forEach((student) => {
      nextMarks[student.id] =
        "unmarked";
    });

    setMarks(nextMarks);
    setMessage("");
    setError("");
  };

  /*
   * Submit attendance
   */
  const handleSubmit = async () => {
    if (!classId) {
      setError(
        "Please select a class."
      );
      return;
    }

    if (!date) {
      setError(
        "Please select a date."
      );
      return;
    }

    if (students.length === 0) {
      setError(
        "There are no students in this class."
      );
      return;
    }

    /*
     * Never submit partially completed
     * attendance.
     */
    if (counts.unmarked > 0) {
      setError(
        `${counts.unmarked} student${
          counts.unmarked === 1
            ? ""
            : "s"
        } still ${
          counts.unmarked === 1
            ? "needs"
            : "need"
        } an attendance status. Please mark everyone before submitting.`
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
            marks[student.id] as AttendanceStatus,
        })
      );

      const response = await fetch(
        "/api/admin/submit-attendance",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            classId,
            date,
            records,
          }),
        }
      );

      let data: {
        message?: string;
        error?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

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

  const selectedClass =
    classes.find(
      (item) =>
        item.id === classId
    );

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Attendance
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Record and manage daily
          student attendance.
        </p>
      </div>

      {/* Selection */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput
            label="Class"
            value={classId}
            onChange={(event) => {
              setClassId(
                event.target.value
              );
              setMessage("");
              setError("");
            }}
            options={[
              {
                label: loadingClasses
                  ? "Loading classes..."
                  : "Select a class",
                value: "",
              },
              ...classes.map(
                (classRoom) => ({
                  label:
                    classRoom.name,
                  value:
                    classRoom.id,
                })
              ),
            ]}
          />

          <TextInput
            label="Date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(
                event.target.value
              );
              setMessage("");
              setError("");
            }}
          />
        </div>

        {selectedClass && (
          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400">
              Selected class
            </p>

            <p className="text-sm font-medium text-gray-700 mt-1">
              {selectedClass.name}
            </p>
          </div>
        )}
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

      {/* Loading */}
      {loadingStudents && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading students and
            attendance...
          </p>
        </div>
      )}

      {/* No class */}
      {!loadingStudents &&
        !classId && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center text-lg">
              ✓
            </div>

            <p className="text-sm font-medium text-gray-700 mt-4">
              Select a class to begin
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Choose a class and date
              above to record
              attendance.
            </p>
          </div>
        )}

      {/* Students */}
      {!loadingStudents &&
        classId &&
        students.length > 0 && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

              <div
                className={`bg-white rounded-card shadow-sm p-4 ${
                  counts.unmarked > 0
                    ? "border border-brand/30"
                    : "border border-gray-100"
                }`}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Unmarked
                </p>

                <p
                  className={`text-2xl font-semibold mt-1 ${
                    counts.unmarked >
                    0
                      ? "text-brand-dark"
                      : "text-gray-700"
                  }`}
                >
                  {counts.unmarked}
                </p>
              </div>
            </div>

            {/* Attendance list */}
            <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="px-4 py-4 border-b border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {students.length}{" "}
                      student
                      {students.length ===
                      1
                        ? ""
                        : "s"}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Attendance for{" "}
                      {date}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        markAll(
                          "present"
                        )
                      }
                      className="text-xs font-medium text-status-active hover:underline"
                    >
                      Mark all present
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        markAll(
                          "absent"
                        )
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

                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs font-medium text-gray-500 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning */}
              {counts.unmarked >
                0 && (
                <div className="mx-4 mt-4 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3">
                  <p className="text-sm font-medium text-brand-dark">
                    Attendance
                    incomplete
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Please mark all{" "}
                    {
                      counts.unmarked
                    }{" "}
                    unmarked student
                    {counts.unmarked ===
                    1
                      ? ""
                      : "s"}{" "}
                    before submitting.
                  </p>
                </div>
              )}

              {/* Students */}
              <div className="divide-y divide-gray-100">
                {students.map(
                  (
                    student,
                    index
                  ) => {
                    const currentStatus =
                      marks[
                        student.id
                      ] ||
                      "unmarked";

                    return (
                      <div
                        key={
                          student.id
                        }
                        className="px-4 py-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Student */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center text-xs font-semibold shrink-0">
                              {index +
                                1}
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

                          {/* Status */}
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(
                              (
                                option
                              ) => {
                                const selected =
                                  currentStatus ===
                                  option.value;

                                return (
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
                                    className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                                      selected
                                        ? statusStyle[
                                            option.value
                                          ]
                                        : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                    }`}
                                  >
                                    {
                                      option.label
                                    }
                                  </button>
                                );
                              }
                            )}

                            {/* Unmarked indicator */}
                            {currentStatus ===
                              "unmarked" && (
                              <span className="inline-flex items-center text-xs px-3 py-2 rounded-full border border-brand/20 bg-brand/5 text-brand-dark">
                                Not marked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Submit */}
              <div className="px-4 py-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    {counts.unmarked >
                    0 ? (
                      <p className="text-xs text-gray-400">
                        {
                          counts.unmarked
                        }{" "}
                        student
                        {counts.unmarked ===
                        1
                          ? ""
                          : "s"}{" "}
                        still unmarked.
                      </p>
                    ) : (
                      <p className="text-xs text-status-active">
                        All students have
                        been marked.
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={
                      handleSubmit
                    }
                    disabled={
                      saving ||
                      counts.unmarked >
                        0
                    }
                  >
                    {saving
                      ? "Submitting..."
                      : "Submit Attendance"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

      {/* Empty class */}
      {!loadingStudents &&
        classId &&
        students.length ===
          0 &&
        !error && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              No students found
            </p>

            <p className="text-xs text-gray-400 mt-1">
              There are currently no
              students assigned to this
              class.
            </p>
          </div>
        )}
    </div>
  );
}