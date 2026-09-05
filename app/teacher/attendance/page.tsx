"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getTeacherByAuthUid,
  getClasses,
  getStudentsByClass,
  getAttendanceSession,
  submitAttendance,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type {
  AttendanceStatus,
  ClassRoom,
  Student,
} from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  // Primary Form Master field.
  formClassId?: string | null;

  // Compatibility with the admin teacher assignment.
  formMasterClassId?: string | null;
}

interface ExistingAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

interface ExistingAttendanceSession {
  records?: ExistingAttendanceRecord[];
}

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

function getTodayLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function TeacherAttendancePage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [formClass, setFormClass] =
    useState<ClassRoom | null>(null);

  const [date, setDate] = useState(
    getTodayLocalDate()
  );

  const [students, setStudents] = useState<
    Student[]
  >([]);

  const [marks, setMarks] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [loading, setLoading] =
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
   * Load teacher record and classes.
   */
  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    setLoading(true);
    setError("");

    Promise.all([
      getTeacherByAuthUid(profile.uid),
      getClasses(),
    ])
      .then(([teacherRecord, classList]) => {
        if (!mounted) return;

        const t =
          teacherRecord as TeacherRecord | null;

        const allClasses =
          classList as ClassRoom[];

        setTeacher(t);

        /*
         * formClassId is the primary field.
         * formMasterClassId is supported as a fallback.
         */
        const assignedFormClassId =
          t?.formClassId ||
          t?.formMasterClassId ||
          "";

        if (assignedFormClassId) {
          const cls = allClasses.find(
            (c) =>
              c.id === assignedFormClassId
          );

          setFormClass(cls || null);
        } else {
          setFormClass(null);
        }
      })
      .catch((err) => {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load teacher information."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  /*
   * Resolve the Form Master class ID.
   */
  const formClassId =
    teacher?.formClassId ||
    teacher?.formMasterClassId ||
    "";

  /*
   * Load students and existing attendance
   * whenever the Form Master class or date changes.
   */
  useEffect(() => {
    if (!formClassId || !date) {
      setStudents([]);
      setMarks({});
      return;
    }

    let cancelled = false;

    setLoadingStudents(true);
    setMessage("");
    setError("");

    Promise.all([
      getStudentsByClass(formClassId),
      getAttendanceSession(
        formClassId,
        date
      ),
    ])
      .then(
        ([
          studentList,
          existingSession,
        ]) => {
          if (cancelled) return;

          const list =
            studentList as Student[];

          const existing =
            existingSession as ExistingAttendanceSession | null;

          setStudents(list);

          const initialMarks: Record<
            string,
            AttendanceStatus
          > = {};

          list.forEach((student) => {
            const prior =
              existing?.records?.find(
                (record) =>
                  record.studentId ===
                  student.id
              );

            /*
             * Default new attendance to Present.
             */
            initialMarks[student.id] =
              prior?.status || "present";
          });

          setMarks(initialMarks);

          if (existing) {
            setMessage(
              "Attendance has already been recorded for this date. Saving again will update it."
            );
          }
        }
      )
      .catch((err) => {
        if (cancelled) return;

        setStudents([]);
        setMarks({});

        setError(
          err instanceof Error
            ? err.message
            : "Could not load attendance."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [formClassId, date]);

  /*
   * Change one student's attendance status.
   */
  const setMark = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    setMessage("");
    setError("");
  };

  /*
   * Mark every student with the same status.
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
   * Submit attendance.
   */
  const handleSubmit = async () => {
    if (!formClassId) {
      setError(
        "You are not assigned as a Form Master."
      );
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

      await submitAttendance(
        formClassId,
        date,
        records,
        profile?.name ||
          profile?.email ||
          "teacher"
      );

      setMessage(
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

  /*
   * Loading teacher information.
   */
  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-800">
          Take Attendance
        </h1>

        <p className="text-sm text-gray-400">
          Loading teacher information...
        </p>
      </div>
    );
  }

  /*
   * No Form Master assignment.
   */
  if (!teacher || !formClassId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Take Attendance
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Attendance
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-status-disabled">
            You are not assigned as a Form Master.
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Contact your administrator if you believe
            this is incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Take Attendance
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Form Master:{" "}
          <span className="font-medium text-gray-700">
            {formClass?.name || "Assigned Class"}
          </span>
        </p>
      </div>

      {/* Form Master notice */}
      <div className="bg-brand/5 border border-brand/10 rounded-card px-4 py-3">
        <p className="text-sm text-brand-dark">
          You are taking attendance as the Form Master
          of{" "}
          <span className="font-semibold">
            {formClass?.name || "this class"}
          </span>
          .
        </p>
      </div>

      {/* Date */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 max-w-sm">
        <TextInput
          label="Attendance Date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage("");
            setError("");
          }}
        />
      </div>

      {/* Messages */}
      {message && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Loading students */}
      {loadingStudents && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading students and attendance...
          </p>
        </div>
      )}

      {/* Student attendance */}
      {!loadingStudents &&
        students.length > 0 && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">
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
                  disabled={saving}
                  className="text-xs text-status-active hover:underline disabled:opacity-50"
                >
                  Mark all present
                </button>

                <button
                  type="button"
                  onClick={() =>
                    markAll("absent")
                  }
                  disabled={saving}
                  className="text-xs text-status-disabled hover:underline disabled:opacity-50"
                >
                  Mark all absent
                </button>

                <button
                  type="button"
                  onClick={() =>
                    markAll("late")
                  }
                  disabled={saving}
                  className="text-xs text-status-suspended hover:underline disabled:opacity-50"
                >
                  Mark all late
                </button>
              </div>
            </div>

            {/* Students */}
            <ul className="divide-y divide-gray-100">
              {students.map(
                (student, index) => (
                  <li
                    key={student.id}
                    className="px-4 py-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* Student */}
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-400 w-5 pt-1">
                          {index + 1}.
                        </span>

                        <div>
                          <p className="text-sm text-gray-700 font-medium">
                            {student.firstName}{" "}
                            {student.lastName}
                          </p>

                          {student.admissionNo && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Admission No:{" "}
                              {
                                student.admissionNo
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex gap-2 sm:justify-end">
                        {STATUS_OPTIONS.map(
                          (option) => {
                            const selected =
                              marks[
                                student.id
                              ] ===
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
                                disabled={saving}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  selected
                                    ? statusStyle[
                                        option
                                          .value
                                      ]
                                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                                } disabled:opacity-50`}
                              >
                                {
                                  option.label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">
                  Check each student's status before
                  submitting.
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Existing attendance for this date
                  will be updated.
                </p>
              </div>

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
        )}

      {/* No students */}
      {!loadingStudents &&
        students.length === 0 && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-400">
              No students found in{" "}
              <span className="font-medium text-gray-600">
                {formClass?.name ||
                  "this class"}
              </span>
              .
            </p>
          </div>
        )}
    </div>
  );
}